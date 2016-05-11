"use strict";

// IMPORTS //

import assert = require("assert");
var bodyparser = require("body-parser");
var express = require("express");
import path = require("path");
import platform = require("./platform");
import Q = require("q");
import tm = require("./projectManager");
import tu = require("./testUtil");
import su = require("./serverUtil");

//////////////////////////////////////////////////////////////////////////////////////////
// Use these variables in tests

// CONST
export const TestAppName = "TestCodePush";
export const TestNamespace = "com.microsoft.codepush.test";
export const AcquisitionSDKPluginName = "code-push";

// NON CONST
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

// READ FROM THE COMMAND LINE
export var testUtil = tu.TestUtil;
export var templatePath = testUtil.templatePath;
export var thisPluginPath = testUtil.readPluginPath();
export var testRunDirectory = testUtil.readTestRunDirectory();
export var updatesDirectory = testUtil.readTestUpdatesDirectory();
export var onlyRunCoreTests = testUtil.readCoreTestsOnly();
export var targetPlatforms: platform.IPlatform[] = platform.PlatformResolver.resolvePlatforms(testUtil.readTargetPlatforms());
export var shouldUseWkWebView = testUtil.readShouldUseWkWebView();
export var shouldSetup: boolean = testUtil.readShouldSetup();
export var restartEmulators: boolean = testUtil.readRestartEmulators();

//////////////////////////////////////////////////////////////////////////////////////////
// Use these classes to create and structure the tests

export interface TestBuilder {
    /**
     * Called to create the test suite by the initializeTests function
     * 
     * coreTestsOnly - Whether or not only core tests are to be run
     * projectManager - The projectManager instance that these tests are being run with
     * targetPlatform - The platform that these tests are going to be run on
     */
    create(coreTestsOnly: boolean, projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform): void;
}

/** Use this class to create a mocha.describe that contains additional tests */
export class TestBuilderDescribe implements TestBuilder {
    /** The name passed to the describe */
    private describeName: string;
    /** The path to the scenario that will be loaded by the test app for the nested TestBuilder objects */
    private scenarioPath: string;
    /** An array of nested TestBuilder objects that this describe contains */
    private testBuilders: TestBuilder[];
    /** Whether or not this.testBuilders directly contains any TestBuildIt objects */
    private hasIts: boolean;
    /** The function that create calls (used for describe.only) */
    private functionToUse: (description: string, spec: () => void) => Mocha.ISuite = describe;
    
    /**
     * describeName - used as the description in the call to describe
     * scenarioPath - if specified, will be set up before the tests run
     * testBuilders - the testBuilders to create within this describe call
     * only - if true, use describe.only
     */
    constructor(describeName: string, testBuilders: TestBuilder[], scenarioPath?: string, only?: boolean) {
        this.describeName = describeName;
        this.scenarioPath = scenarioPath;
        this.testBuilders = testBuilders;
        
        if (only) this.functionToUse = describe.only;
        
        this.hasIts = false;
        for (var i = 0; i < this.testBuilders.length; i++) {
            if (this.testBuilders[i] instanceof TestBuilderIt) {
                this.hasIts = true;
                break;
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
    create(coreTestsOnly: boolean, projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform): void {
        this.functionToUse(this.describeName, () => {
            if (this.hasIts) {
                afterEach(() => {
                    console.log("Cleaning up!");
                    updateResponse = undefined;
                    testMessageCallback = undefined;
                    updateCheckCallback = undefined;
                    testMessageResponse = undefined;
                });
            
                beforeEach(() => {
                    return projectManager.prepareEmulatorForTest(TestNamespace, targetPlatform);
                });
            }

            if (this.scenarioPath) {
                before(() => {
                    return projectManager.setupScenario(testRunDirectory, TestNamespace, templatePath, this.scenarioPath, targetPlatform);
                });
            }
            
            this.testBuilders.forEach(testBuilder => {
                testBuilder.create(coreTestsOnly, projectManager, targetPlatform);
            });
        });
    }
}

/** Use this class to create a test through mocha.it */
export class TestBuilderIt implements TestBuilder {
    /** The name of the test */
    private testName: string;
    /** The test to be run */
    private test: (projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform, done: MochaDone) => void;
    /** Whether or not the test should be run when "--core" is supplied */
    private isCoreTest: boolean;
    /** The function that create calls (used for it.only) */
    private functionToUse: (expectation: string, assertion?: (done: MochaDone) => void) => Mocha.ITest = it;
    
    /**
     * testName - used as the expectation in the call to it
     * test - the test to provide to it
     * isCoreTest - whether or not the test should run when "--core" is supplied
     * only - if true, use it.only
     */
    constructor(testName: string, test: (projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform, done: MochaDone) => void, isCoreTest: boolean, only?: boolean) {
        this.testName = testName;
        this.test = test;
        this.isCoreTest = isCoreTest;
        if (only) this.functionToUse = it.only;
    }
    
    /**
     * Called to create the test suite by the initializeTests function
     * 
     * coreTestsOnly - Whether or not only core tests are to be run
     * projectManager - The projectManager instance that these tests are being run with
     * targetPlatform - The platform that these tests are going to be run on
     */
    create(coreTestsOnly: boolean, projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform): void {
        if (!coreTestsOnly || this.isCoreTest) {
            this.functionToUse(this.testName, this.test.bind(this, projectManager, targetPlatform));
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
export function createMockResponse(mandatory: boolean = false): su.CheckForUpdateResponseMock {
    var updateResponse = new su.CheckForUpdateResponseMock();
    updateResponse.isAvailable = true;
    updateResponse.appVersion = "1.0.0";
    updateResponse.downloadURL = "mock.url/download";
    updateResponse.isMandatory = mandatory;
    updateResponse.label = "mock-update";
    updateResponse.packageHash = "12345-67890";
    updateResponse.packageSize = 12345;
    updateResponse.updateAppVersion = false;

    return updateResponse;
}
        
/**
 * Returns a default update response with a download URL and random package hash.
 */
export function getMockResponse(targetPlatform: platform.IPlatform, mandatory: boolean = false, randomHash: boolean = true): su.CheckForUpdateResponseMock {
    var updateResponse = createMockResponse(mandatory);
    updateResponse.downloadURL = targetPlatform.getServerUrl() + "/download";
    // we need unique hashes to avoid conflicts - the application is not uninstalled between tests
    // and we store the failed hashes in preferences
    if (randomHash) {
        updateResponse.packageHash = "randomHash-" + Math.floor(Math.random() * 10000);
    }
    return updateResponse;
};

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
 * Waits for the next set of test messages sent by the app and asserts that they are equal to the expected messages
 */
export function verifyMessages(expectedMessages: (string | su.AppMessage)[], deferred: Q.Deferred<void>): (requestBody: any) => void {
    var messageIndex = 0;
    return (requestBody: su.AppMessage) => {
        try {
            console.log("Message index: " + messageIndex);
            if (typeof expectedMessages[messageIndex] === "string") {
                assert.equal(expectedMessages[messageIndex], requestBody.message);
            }
            else {
                assert(su.areEqual(<su.AppMessage>expectedMessages[messageIndex], requestBody));
            }
            /* end of message array */
            if (++messageIndex === expectedMessages.length) {
                deferred.resolve(undefined);
            }
        } catch (e) {
            deferred.reject(e);
        }
    };
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
export function initializeTests(projectManager: tm.ProjectManager, tests: TestBuilderDescribe[]): void {
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
        /**
         * Prepares for the next test
         */
        function prepareTest(): Q.Promise<string> {
            return projectManager.prepareEmulatorForTest(TestNamespace, targetPlatform);
        }
        
        describe("CodePush", function() {
            before(() => {
                setupServer(targetPlatform);
                return projectManager.uninstallApplication(TestNamespace, targetPlatform)
                    .then(projectManager.preparePlatform.bind(projectManager, testRunDirectory, targetPlatform))
                    .then(projectManager.preparePlatform.bind(projectManager, updatesDirectory, targetPlatform));
            });
            
            after(() => {
                cleanupServer();
                return projectManager.cleanupAfterPlatform(testRunDirectory, targetPlatform).then(projectManager.cleanupAfterPlatform.bind(projectManager, updatesDirectory, targetPlatform));
            });
            
            // build the tests through the TestBuilders
            tests.forEach(test => {
                test.create(onlyRunCoreTests, projectManager, targetPlatform);
            });
        });
    }

    // CODE THAT EXECUTES THE TESTS //

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