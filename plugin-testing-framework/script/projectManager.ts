"use strict";

import child_process = require("child_process");
import path = require("path");
import Q = require("q");
import fs = require("fs");

import platform = require("./platform");

var del = require("del");
var archiver = require("archiver");
var replace = require("replace");

/**
 * In charge of project related operations.
 */
export class ProjectManager {
    public static ANDROID_KEY_PLACEHOLDER: string = "CODE_PUSH_ANDROID_DEPLOYMENT_KEY";
    public static IOS_KEY_PLACEHOLDER: string = "CODE_PUSH_IOS_DEPLOYMENT_KEY";
    public static SERVER_URL_PLACEHOLDER: string = "CODE_PUSH_SERVER_URL";
    public static INDEX_JS_PLACEHOLDER: string = "CODE_PUSH_INDEX_JS_PATH";
    public static CODE_PUSH_APP_VERSION_PLACEHOLDER: string = "CODE_PUSH_APP_VERSION";
    public static CODE_PUSH_APP_ID_PLACEHOLDER: string = "CODE_PUSH_TEST_APPLICATION_ID";
    public static PLUGIN_VERSION_PLACEHOLDER: string = "CODE_PUSH_PLUGIN_VERSION";

    public static DEFAULT_APP_VERSION: string = "Store version";
    
    private static NOT_IMPLEMENTED_ERROR_MSG: string = "This method is unimplemented! Please extend ProjectManager and overwrite it!";
    
    // ABSTRACT
    // (not actually abstract because there are some issues with our dts generator that incorrectly generates abstract classes)
    
    /**
     * Returns the name of the plugin being tested, ie Cordova or React-Native.
     * 
     * Overwrite this in your implementation!
     */
    public getPluginName(): string { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }

	/**
	 * Creates a new test application at the specified path, and configures it
	 * with the given server URL, android and ios deployment keys.
     * 
     * Overwrite this in your implementation!
	 */
    public setupProject(projectDirectory: string, templatePath: string, appName: string, appNamespace: string, version?: string): Q.Promise<string> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }
    
    /**
     * Sets up the scenario for a test in an already existing project.
     * 
     * Overwrite this in your implementation!
     */
    public setupScenario(projectDirectory: string, appId: string, templatePath: string, jsPath: string, targetPlatform: platform.IPlatform, version?: string): Q.Promise<string> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }

    /**
     * Creates a CodePush update package zip for a project.
     * 
     * Overwrite this in your implementation!
     */
    public createUpdateArchive(projectDirectory: string, targetPlatform: platform.IPlatform, isDiff?: boolean): Q.Promise<string> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }
    
    /**
     * Prepares a specific platform for tests.
     * 
     * Overwrite this in your implementation!
     */
    public preparePlatform(projectFolder: string, targetPlatform: platform.IPlatform): Q.Promise<string> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }
    
    /**
     * Cleans up a specific platform after tests.
     * 
     * Overwrite this in your implementation!
     */
    public cleanupAfterPlatform(projectFolder: string, targetPlatform: platform.IPlatform): Q.Promise<string> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }

    /**
     * Runs the test app on the given target / platform.
     * 
     * Overwrite this in your implementation!
     */
    public runPlatform(projectFolder: string, targetPlatform: platform.IPlatform): Q.Promise<string> { throw ProjectManager.NOT_IMPLEMENTED_ERROR_MSG; }
    
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
    public static execChildProcess(command: string, options?: {
            cwd?: string;
            stdio?: any;
            customFds?: any;
            env?: any;
            encoding?: string;
            timeout?: number;
            maxBuffer?: number;
            killSignal?: string;
        }, logOutput: boolean = true): Q.Promise<string> {
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