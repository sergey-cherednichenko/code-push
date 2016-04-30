/// <reference path="../typings/codePush.d.ts" />
/// <reference path="../typings/q.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/replace.d.ts" />
/// <reference path="../typings/mkdirp.d.ts" />

"use strict";

import child_process = require("child_process");
import replace = require("replace");
import path = require("path");
import Q = require("q");
import fs = require("fs");
import mkdirp = require("mkdirp");

import platform = require("./platform");

var del = require("del");
var archiver = require("archiver");

/**
 * In charge of project related operations.
 */
export abstract class ProjectManager {
    public static ANDROID_KEY_PLACEHOLDER: string = "CODE_PUSH_ANDROID_DEPLOYMENT_KEY";
    public static IOS_KEY_PLACEHOLDER: string = "CODE_PUSH_IOS_DEPLOYMENT_KEY";
    public static SERVER_URL_PLACEHOLDER: string = "CODE_PUSH_SERVER_URL";
    public static INDEX_JS_PLACEHOLDER: string = "CODE_PUSH_INDEX_JS_PATH";
    public static CODE_PUSH_APP_VERSION_PLACEHOLDER: string = "CODE_PUSH_APP_VERSION";
    public static CODE_PUSH_APP_ID_PLACEHOLDER: string = "CODE_PUSH_TEST_APPLICATION_ID";

    public static DEFAULT_APP_VERSION: string = "Store version";
    
    // ABSTRACT
    
    /**
     * Returns the name of the plugin being tested, ie Cordova or React-Native
     */
    public abstract getPluginName(): string;

	/**
	 * Creates a new test application at the specified path, and configures it
	 * with the given server URL, android and ios deployment keys.
	 */
    public abstract setupProject(projectDirectory: string, templatePath: string, appName: string, appNamespace: string, version?: string): Q.Promise<string>;
    
    /**
     * Sets up the scenario for a test in an already existing project.
     */
    public abstract setupScenario(projectDirectory: string, appId: string, templatePath: string, jsPath: string, targetPlatform: platform.IPlatform, version?: string): Q.Promise<string>;

    /**
     * Creates a CodePush update package zip for a project.
     */
    public abstract createUpdateArchive(projectDirectory: string, targetPlatform: platform.IPlatform, isDiff?: boolean): Q.Promise<string>;
    
    /**
     * Prepares a specific platform for tests.
     */
    public abstract preparePlatform(projectFolder: string, targetPlatform: platform.IPlatform): Q.Promise<string>;
    
    /**
     * Cleans up a specific platform after tests.
     */
    public abstract cleanupAfterPlatform(projectFolder: string, targetPlatform: platform.IPlatform): Q.Promise<string>;

    /**
     * Runs the test app on the given target / platform.
     */
    public abstract runPlatform(projectFolder: string, targetPlatform: platform.IPlatform, skipBuild?: boolean, target?: string): Q.Promise<string>;
    
    // EMULATOR MANAGER FUNCTIONS

    /**
     * Launch the test app on the given target / platform.
     */
    public launchApplication(appNamespace: string, targetPlatform: platform.IPlatform): Q.Promise<string> {
        console.log("Launching " + appNamespace + " on " + targetPlatform.getName());
        return targetPlatform.getEmulatorManager().launchInstalledApplication(appNamespace);
    }

    /**
     * Kill the test app on the given target / platform.
     */
    public endRunningApplication(appNamespace: string, targetPlatform: platform.IPlatform): Q.Promise<string> {
        console.log("Ending " + appNamespace + " on " + targetPlatform.getName());
        return targetPlatform.getEmulatorManager().endRunningApplication(appNamespace);
    }

    /**
     * Prepares the emulator for a test.
     */
    public prepareEmulatorForTest(appNamespace: string, targetPlatform: platform.IPlatform): Q.Promise<string> {
        console.log("Preparing " + targetPlatform.getName() + " emulator for " + appNamespace + " tests");
        return targetPlatform.getEmulatorManager().prepareEmulatorForTest(appNamespace);
    }
    
    /**
     * Uninstalls the app from the emulator.
     */
    public uninstallApplication(appNamespace: string, targetPlatform: platform.IPlatform): Q.Promise<string> {
        console.log("Uninstalling " + appNamespace + " on " + targetPlatform.getName());
        return targetPlatform.getEmulatorManager().uninstallApplication(appNamespace);
    }

    /**
     * Stops and restarts an application specified by its namespace identifier.
     */
    public restartApplication(appNamespace: string, targetPlatform: platform.IPlatform): Q.Promise<string> {
        console.log("Restarting " + appNamespace + " on " + targetPlatform.getName());
        return targetPlatform.getEmulatorManager().restartApplication(appNamespace);
    }
    
    /**
     * Navigates away from the application and then navigates back to it.
     */
    public resumeApplication(appNamespace: string, targetPlatform: platform.IPlatform, delayBeforeResumingMs: number = 1000): Q.Promise<string> {
        console.log("Resuming " + appNamespace + " on " + targetPlatform.getName());
        return targetPlatform.getEmulatorManager().resumeApplication(appNamespace, delayBeforeResumingMs);
    }
    
    // UTILITY FUNCTIONS

    /**
     * Executes a child process and logs its output to the console and returns its output in the promise as a string
     */
    public static execChildProcess(command: string, options?: child_process.IExecOptions, logOutput: boolean = true): Q.Promise<string> {
        var deferred = Q.defer<string>();

        options = options || {};
        options.maxBuffer = 1024 * 500;
        // abort processes that run longer than five minutes
        options.timeout = 5 * 60 * 1000;

        console.log("Running command: " + command);
        child_process.exec(command, options, (error: Error, stdout: Buffer, stderr: Buffer) => {

            if (logOutput) stdout && console.log(stdout);
            stderr && console.error(stderr);

            if (error) {
                console.error(error);
                deferred.reject(error);
            } else {
                deferred.resolve(stdout.toString());
            }
        });

        return deferred.promise;
    }

	/**
	 * Replaces a regex in a file with a given string.
	 */
    public static replaceString(filePath: string, regex: string, replacement: string): void {
        console.log("replacing \"" + regex + "\" with \"" + replacement + "\" in " + filePath);
        replace({ regex: regex, replacement: replacement, recursive: false, silent: true, paths: [filePath] });
    }

    /**
     * Copies a file from a given location to another.
     */
    public static copyFile(source: string, destination: string, overwrite: boolean): Q.Promise<void> {
        var deferred = Q.defer<void>();

        try {
            var errorHandler = (error: any) => {
                deferred.reject(error);
            };

            if (overwrite && fs.existsSync(destination)) {
                fs.unlinkSync(destination);
            }

            var readStream: fs.ReadStream = fs.createReadStream(source);
            readStream.on("error", errorHandler);

            var writeStream: fs.WriteStream = fs.createWriteStream(destination);
            writeStream.on("error", errorHandler);
            writeStream.on("close", deferred.resolve.bind(undefined, undefined));
            readStream.pipe(writeStream);
        } catch (e) {
            deferred.reject(e);
        }

        return deferred.promise;
    }
}