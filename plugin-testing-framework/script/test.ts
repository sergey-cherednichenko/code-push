"use strict";

// IMPORTS //

import assert = require("assert");
var bodyparser = require("body-parser");
var express = require("express");
import fs = require("fs");
import os = require("os");
import path = require("path");
import platform = require("./platform");
import Q = require("q");
import tm = require("./projectManager");
import tu = require("./testUtil");
import su = require("./serverUtil");

//////////////////////////////////////////////////////////////////////////////////////////
// Use these variables in tests

//// COMMAND LINE OPTION NAMES, FLAGS, AND DEFAULTS
var testUtil = tu.TestUtil;

const TEST_RUN_DIRECTORY_OPTION_NAME: string = "--test-directory";
const DEFAULT_TEST_RUN_DIRECTORY = path.join(os.tmpdir(), testUtil.getPluginName(), "test-run");

const TEST_UPDATES_DIRECTORY_OPTION_NAME: string = "--updates-directory";
const DEFAULT_UPDATES_DIRECTORY = path.join(os.tmpdir(), testUtil.getPluginName(), "updates");

const CORE_TESTS_ONLY_FLAG_NAME: string = "--core";

const PULL_FROM_NPM_FLAG_NAME: string = "--npm";

const DEFAULT_PLUGIN_PATH: string = path.join(__dirname, "../../..");
const NPM_PLUGIN_PATH: string = testUtil.getPluginName();

const SETUP_FLAG_NAME: string = "--setup";
const RESTART_EMULATORS_FLAG_NAME: string = "--clean";

//// CONST VARIABLES
// Used to configure the tests.

export const TestAppName = "TestCodePush";
export const TestNamespace = "com.microsoft.codepush.test";
export const AcquisitionSDKPluginName = "code-push";

export const templatePath = path.join(__dirname, "../../../test/template");
export const thisPluginPath = testUtil.readMochaCommandLineFlag(PULL_FROM_NPM_FLAG_NAME) ? NPM_PLUGIN_PATH : DEFAULT_PLUGIN_PATH;

export const testRunDirectory = testUtil.readMochaCommandLineOption(TEST_RUN_DIRECTORY_OPTION_NAME, DEFAULT_TEST_RUN_DIRECTORY);
export const updatesDirectory = testUtil.readMochaCommandLineOption(TEST_UPDATES_DIRECTORY_OPTION_NAME, DEFAULT_UPDATES_DIRECTORY);

export const onlyRunCoreTests = testUtil.readMochaCommandLineFlag(CORE_TESTS_ONLY_FLAG_NAME);
export const shouldSetup: boolean = testUtil.readMochaCommandLineFlag(SETUP_FLAG_NAME);
export const restartEmulators: boolean = testUtil.readMochaCommandLineFlag(RESTART_EMULATORS_FLAG_NAME);

//// SERVER VARIABLES
// Control how the server responds to update checks, test messages, and downloads.

/** Response the server gives the next update check request */
export var updateResponse: any;

/** Response the server gives the next test message request */
export var testMessageResponse: any;

/** Called after the next test message request */
export var testMessageCallback: (requestBody: any) => void;

/** Called after the next update check request */
export var updateCheckCallback: (requestBody: any) => void;

/** Location of the update package given in the update check response */
export var updatePackagePath: string;

//////////////////////////////////////////////////////////////////////////////////////////
// Use these classes to create and structure the tests

export class TestBuilder {
    public only: boolean;
    public skip: boolean;
    
    constructor(options?: { only?: boolean, skip?: boolean }) {
        if (!options) return;
        
        if (!!options.only) this.only = options.only;
        if (!!options.skip) this.skip = options.skip;
    }
    
    /**
     * Called to create the test suite by the initializeTests function
     * 
     * coreTestsOnly - Whether or not only core tests are to be run
     * projectManager - The projectManager instance that these tests are being run with
     * targetPlatform - The platform that these tests are going to be run on
     */
    public create(coreTestsOnly: boolean, projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform): void {};
}

/** Use this class to create a mocha.describe that contains additional tests */
export class TestBuilderDescribe extends TestBuilder {
    /** The name passed to the describe */
    private describeName: string;
    /** The path to the scenario that will be loaded by the test app for the nested TestBuilder objects */
    private scenarioPath: string;
    /** An array of nested TestBuilder objects that this describe contains */
    private testBuilders: TestBuilder[];
    /** Whether or not this.testBuilders directly contains any TestBuilderIt objects */
    private hasIts: boolean;
    /** Whether or not this.testBuilders directly contains any TestBuilder objects with an only flag */
    private hasOnly: boolean;
    
    /**
     * describeName - used as the description in the call to describe
     * scenarioPath - if specified, will be set up before the tests run
     * testBuilders - the testBuilders to create within this describe call
     * only - if true, use describe.only
     */
    constructor(describeName: string, testBuilders: TestBuilder[], scenarioPath?: string, options?: { only?: boolean, skip?: boolean }) {
        super(options);
        
        this.describeName = describeName;
        this.scenarioPath = scenarioPath;
        this.testBuilders = testBuilders;
        
        this.hasIts = false;
        for (var i = 0; i < this.testBuilders.length; i++) {
            if (this.testBuilders[i] instanceof TestBuilderIt) {
                this.hasIts = true;
                if (this.hasIts && this.hasOnly) break;
            }
            if (this.testBuilders[i].only) {
                this.only = true;
                this.hasOnly = true;
                if (this.hasIts && this.hasOnly) break;
            }
        }
    }
    
    /**
     * Called to create the test suite by the initializeTests function
     * 
     * coreTestsOnly - Whether or not only core tests are to be run
     * projectManager - The projectManager instance that these tests are being run with
     * targetPlatform - The platform that these tests are going to be run on
     */
    public create(coreTestsOnly: boolean, projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform): void {
        if (this.skip) return;
        
        describe(this.describeName, () => {
            if (this.hasIts) {
                afterEach(() => {
                    console.log("Cleaning up!");
                    updateResponse = undefined;
                    testMessageCallback = undefined;
                    updateCheckCallback = undefined;
                    testMessageResponse = undefined;
                });
            
                beforeEach(() => {
                    return targetPlatform.getEmulatorManager().prepareEmulatorForTest(TestNamespace);
                });
            }

            if (this.scenarioPath) {
                before(() => {
                    return projectManager.setupScenario(testRunDirectory, TestNamespace, templatePath, this.scenarioPath, targetPlatform);
                });
            }
            
            this.testBuilders.forEach(testBuilder => {
                if (!(this.hasOnly && !testBuilder.only)) testBuilder.create(coreTestsOnly, projectManager, targetPlatform);
            });
        });
    }
}

/** Use this class to create a test through mocha.it */
export class TestBuilderIt extends TestBuilder {
    /** The name of the test */
    private testName: string;
    /** The test to be run */
    private test: (projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform, done: MochaDone) => void;
    /** Whether or not the test should be run when "--core" is supplied */
    private isCoreTest: boolean;
    
    /**
     * testName - used as the expectation in the call to it
     * test - the test to provide to it
     * isCoreTest - whether or not the test should run when "--core" is supplied
     * only - if true, use it.only
     */
    constructor(testName: string, test: (projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform, done: MochaDone) => void, isCoreTest: boolean, options?: { only?: boolean, skip?: boolean }) {
        super(options);
        
        this.testName = testName;
        this.test = test;
        this.isCoreTest = isCoreTest;
    }
    
    /**
     * Called to create the test suite by the initializeTests function
     * 
     * coreTestsOnly - Whether or not only core tests are to be run
     * projectManager - The projectManager instance that these tests are being run with
     * targetPlatform - The platform that these tests are going to be run on
     */
    public create(coreTestsOnly: boolean, projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform): void {
        if (!this.skip && (!coreTestsOnly || this.isCoreTest)) {
            it(this.testName, this.test.bind(this, projectManager, targetPlatform));
        }
    }
}

//////////////////////////////////////////////////////////////////////////////////////////
// Use these functions in tests

/**
 * Returns a default empty response to give to the app in a checkForUpdate request
 */
export function createDefaultResponse(): su.CheckForUpdateResponseMock {
    var defaultResponse = new su.CheckForUpdateResponseMock();

    defaultResponse.downloadURL = "";
    defaultResponse.description = "";
    defaultResponse.isAvailable = false;
    defaultResponse.isMandatory = false;
    defaultResponse.appVersion = "";
    defaultResponse.packageHash = "";
    defaultResponse.label = "";
    defaultResponse.packageSize = 0;
    defaultResponse.updateAppVersion = false;

    return defaultResponse;
}

/**
 * Returns a default update response to give to the app in a checkForUpdate request
 */
export function createUpdateResponse(mandatory: boolean = false, targetPlatform?: platform.IPlatform, randomHash: boolean = true): su.CheckForUpdateResponseMock {
    var updateResponse = new su.CheckForUpdateResponseMock();
    updateResponse.isAvailable = true;
    updateResponse.appVersion = "1.0.0";
    updateResponse.downloadURL = "mock.url/download";
    updateResponse.isMandatory = mandatory;
    updateResponse.label = "mock-update";
    updateResponse.packageHash = "12345-67890";
    updateResponse.packageSize = 12345;
    updateResponse.updateAppVersion = false;

    if (!!targetPlatform) updateResponse.downloadURL = targetPlatform.getServerUrl() + "/download";
    
    // We need unique hashes to avoid conflicts.
    if (randomHash) {
        updateResponse.packageHash = "randomHash-" + Math.floor(Math.random() * 10000);
    }
    
    return updateResponse;
}

/**
 * Wrapper for ProjectManager.setupScenario
 */
export function setupScenario(projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform, scenarioJsPath: string, version?: string): Q.Promise<string> {
    return projectManager.setupScenario(testRunDirectory, TestNamespace, templatePath, scenarioJsPath, targetPlatform, version);
}

/**
 * Creates an update and zip for the test app using the specified scenario and version
 */
export function createUpdate(projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform, scenarioJsPath: string, version: string): Q.Promise<string> {
    return projectManager.setupScenario(updatesDirectory, TestNamespace, templatePath, scenarioJsPath, targetPlatform, version)
        .then<string>(projectManager.createUpdateArchive.bind(projectManager, updatesDirectory, targetPlatform));
}

/**
 * Returns a promise that waits for the next set of test messages sent by the app and resolves if that they are equal to the expected messages or rejects if they are not.
 */
export function expectTestMessages(expectedMessages: (string | su.AppMessage)[]): Q.Promise<void> {
    var deferred = Q.defer<void>();
    
    var messageIndex = 0;
    testMessageCallback = (requestBody: su.AppMessage) => {
        try {
            console.log("Message index: " + messageIndex);
            if (typeof expectedMessages[messageIndex] === "string") {
                assert.equal(requestBody.message, expectedMessages[messageIndex]);
            }
            else {
                assert(su.areEqual(requestBody, <su.AppMessage>expectedMessages[messageIndex]));
            }
            /* end of message array */
            if (++messageIndex === expectedMessages.length) {
                deferred.resolve(undefined);
            }
        } catch (e) {
            deferred.reject(e);
        }
    };
    
    return deferred.promise;
};

/** The server to respond to requests from the app. */
var server: any;

/**
 * Sets up the server that the test app uses to send test messages and check for and download updates.
 */
export function setupServer(targetPlatform: platform.IPlatform) {
    console.log("Setting up server at " + targetPlatform.getServerUrl());
    
    var app = express();
    app.use(bodyparser.json());
    app.use(bodyparser.urlencoded({ extended: true }));
    
    app.use(function(req: any, res: any, next: any) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "*");
        res.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept, X-CodePush-SDK-Version");
        next();
    });

    app.get("/updateCheck", function(req: any, res: any) {
        updateCheckCallback && updateCheckCallback(req);
        res.send(updateResponse);
        console.log("Update check called from the app.");
        console.log("Request: " + JSON.stringify(req.query));
        console.log("Response: " + JSON.stringify(updateResponse));
    });

    app.get("/download", function(req: any, res: any) {
        console.log("Application downloading the package.");
        
        res.download(updatePackagePath);
    });

    app.post("/reportTestMessage", function(req: any, res: any) {
        console.log("Application reported a test message.");
        console.log("Body: " + JSON.stringify(req.body));

        if (!testMessageResponse) {
            console.log("Sending OK");
            res.sendStatus(200);
        } else {
            console.log("Sending body: " + testMessageResponse);
            res.status(200).send(testMessageResponse);
        }

        testMessageCallback && testMessageCallback(req.body);
    });

    var serverPortRegEx = /:([0-9]+)/;
    server = app.listen(+targetPlatform.getServerUrl().match(serverPortRegEx)[1]);
}

/**
 * Closes the server.
 */
export function cleanupServer(): void {
    if (server) {
        server.close();
        server = undefined;
    }
}

//////////////////////////////////////////////////////////////////////////////////////////
/**
 * Call this function with a ProjectManager and an array of TestBuilderDescribe objects to run tests
 */
export function initializeTests(projectManager: tm.ProjectManager, rootTest: TestBuilder, supportedTargetPlatforms: platform.IPlatform[]): void {
    
    // DETERMINE PLATFORMS TO TEST //
    
    /** The platforms to test on. */
    var targetPlatforms: platform.IPlatform[] = [];
    
    supportedTargetPlatforms.forEach(supportedPlatform => {
        if (testUtil.readMochaCommandLineFlag(supportedPlatform.getCommandLineFlagName())) targetPlatforms.push(supportedPlatform);
    });
    
    // Log current configuration
    
    console.log("Initializing tests for " + testUtil.getPluginName());
    console.log(TestAppName + "\n" + TestNamespace);
    console.log("Testing " + thisPluginPath + ".");
    targetPlatforms.forEach(platform => {
        console.log("On " + platform.getName());
    });
    console.log("test run directory = " + testRunDirectory);
    console.log("updates directory = " + updatesDirectory);
    if (onlyRunCoreTests) console.log("--only running core tests--");
    if (shouldSetup) console.log("--setting up--");
    if (restartEmulators) console.log("--restarting emulators--");
    
    // FUNCTIONS //

    function cleanupTest(): void {
        console.log("Cleaning up!");
        updateResponse = undefined;
        testMessageCallback = undefined;
        updateCheckCallback = undefined;
        testMessageResponse = undefined;
    }

    /**
     * Sets up tests for each platform.
     * Creates the test project directory and the test update directory.
     * Starts required emulators.
     */
    function setupTests(): void {
        it("sets up tests correctly", (done) => {
            var promises: Q.Promise<string>[] = [];
            
            targetPlatforms.forEach(platform => {
                promises.push(platform.getEmulatorManager().bootEmulator(restartEmulators));
            });
            
            console.log("Building test project.");
            // create the test project
            promises.push(createTestProject(testRunDirectory)
                .then(() => {
                    console.log("Building update project.");
                    // create the update project
                    return createTestProject(updatesDirectory);
                }));
                
            Q.all<string>(promises).then(() => { done(); }, (error) => { done(error); });
        });
    }

    /**
     * Creates a test project directory at the given path.
     */
    function createTestProject(directory: string): Q.Promise<string> {
        return projectManager.setupProject(directory, templatePath, TestAppName, TestNamespace);
    }

    /**
     * Creates and runs the tests from the projectManager and TestBuilderDescribe objects passed to initializeTests.
     */
    function createAndRunTests(targetPlatform: platform.IPlatform): void {
        describe("CodePush", function() {
            before(() => {
                setupServer(targetPlatform);
                return targetPlatform.getEmulatorManager().uninstallApplication(TestNamespace)
                    .then(projectManager.preparePlatform.bind(projectManager, testRunDirectory, targetPlatform))
                    .then(projectManager.preparePlatform.bind(projectManager, updatesDirectory, targetPlatform));
            });
            
            after(() => {
                cleanupServer();
                return projectManager.cleanupAfterPlatform(testRunDirectory, targetPlatform).then(projectManager.cleanupAfterPlatform.bind(projectManager, updatesDirectory, targetPlatform));
            });
            
            // Build the tests through the root test.
            rootTest.create(onlyRunCoreTests, projectManager, targetPlatform);
        });
    }

    // BEGIN TESTING //

    describe("CodePush " + projectManager.getPluginName() + " Plugin", function () {
        this.timeout(100 * 60 * 1000);
        
        if (shouldSetup) describe("Setting Up For Tests", () => setupTests());
        else {
            targetPlatforms.forEach(platform => {
                var prefix: string = (onlyRunCoreTests ? "Core Tests " : "Tests ") + thisPluginPath + " on ";
                describe(prefix + platform.getName(), () => createAndRunTests(platform));
            });
        }
    });
}