/// <reference path="../typings/mocha.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/assert.d.ts" />
/// <reference path="../typings/codePush.d.ts" />

"use strict";

// IMPORTS //

import tm = require("./projectManager");
import tu = require("./testUtil");
import su = require("./serverUtil");
import platform = require("./platform");
import path = require("path");
import assert = require("assert");
import Q = require("q");

export module PluginTestingFramework {
    //////////////////////////////////////////////////////////////////////////////////////////
    // Use these variables in tests

    // CONST
    const TestAppName = "TestCodePush";
    const TestNamespace = "com.microsoft.codepush.test";
    const AcquisitionSDKPluginName = "code-push";
    
    // NON CONST
    /** Response the server gives the next update check request */
    var updateResponse: any;
    
    /** Response the server gives the next test message request */
    var testMessageResponse: any;
    
    /** Called after the next test message request */
    var testMessageCallback: (requestBody: any) => void;
    
    /** Called after the next update check request */
    var updateCheckCallback: (requestBody: any) => void;
    
    /** Location of the update package given in the update check response */
    var updatePackagePath: string;

    // READ FROM THE COMMAND LINE
    var testUtil = tu.TestUtil;
    var templatePath = testUtil.templatePath;
    var thisPluginPath = testUtil.readPluginPath();
    var testRunDirectory = testUtil.readTestRunDirectory();
    var updatesDirectory = testUtil.readTestUpdatesDirectory();
    var onlyRunCoreTests = testUtil.readCoreTestsOnly();
    var targetPlatforms: platform.IPlatform[] = platform.PlatformResolver.resolvePlatforms(testUtil.readTargetPlatforms());
    var shouldUseWkWebView = testUtil.readShouldUseWkWebView();
    var shouldSetup: boolean = testUtil.readShouldSetup();
    var restartEmulators: boolean = testUtil.readRestartEmulators();
    
    //////////////////////////////////////////////////////////////////////////////////////////
    // Use these classes to create and structure the tests
    
    interface TestBuilder {
        create(coreTestsOnly: boolean, projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform): void;
    }
    
    /** Use this class to create a mocha.describe that contains additional tests */
    class TestBuilderDescribe implements TestBuilder {
        private describeName: string;
        private scenarioPath: string;
        private testBuilders: TestBuilder[];
        private hasIts: boolean;
        
        /**
         * describeName - used as the description in the call to describe
         * scenarioPath - if specified, will be set up before the tests run
         * testBuilders - the testBuilders to create within this describe call
         */
        constructor(describeName: string, testBuilders: TestBuilder[], scenarioPath?: string) {
            this.describeName = describeName;
            this.scenarioPath = scenarioPath;
            this.testBuilders = testBuilders;
            
            this.hasIts = false;
            for (var i = 0; i < this.testBuilders.length; i++) {
                if (this.testBuilders[i] instanceof TestBuilderIt) {
                    this.hasIts = true;
                    break;
                }
            }
        }
        
        create(coreTestsOnly: boolean, projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform): void {
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
    class TestBuilderIt implements TestBuilder {
        private testName: string;
        private test: (done: MochaDone) => void;
        private isCoreTest: boolean;
        
        /**
         * testName - used as the expectation in the call to it
         * test - the test to provide to it
         * isCoreTest - whether or not the test should run when "--core" is supplied
         */
        constructor(testName: string, test: (done: MochaDone) => void, isCoreTest: boolean) {
            this.testName = testName;
            this.test = test;
            this.isCoreTest = isCoreTest;
        }
        
        create(coreTestsOnly: boolean, projectManager: tm.ProjectManager, targetPlatform: platform.IPlatform): void {
            if (!coreTestsOnly || this.isCoreTest) {
                it(this.testName, this.test);
            }
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////
    // Use these functions in tests
    
    function createDefaultResponse(): su.CheckForUpdateResponseMock {
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

    function createMockResponse(mandatory: boolean = false): su.CheckForUpdateResponseMock {
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

    function verifyMessages(expectedMessages: (string | su.AppMessage)[], deferred: Q.Deferred<void>): (requestBody: any) => void {
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
    
    //////////////////////////////////////////////////////////////////////////////////////////
    // Call this function with a ProjectManager and a set of TestBuilderDescribes to run tests
    function initializeTests(projectManager: tm.ProjectManager, tests: TestBuilderDescribe[]) {
        // GLOBALS //

        var express = require("express");
        var bodyparser = require("body-parser");

        // FUNCTIONS //

        function cleanupTest(): void {
            console.log("Cleaning up!");
            updateResponse = undefined;
            testMessageCallback = undefined;
            updateCheckCallback = undefined;
            testMessageResponse = undefined;
        }

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

        function createTestProject(directory: string): Q.Promise<string> {
            return projectManager.setupProject(directory, templatePath, TestAppName, TestNamespace);
        }

        function runTests(targetPlatform: platform.IPlatform): void {
            var server: any;
            
            function setupServer() {
                console.log("Setting up server at " + targetPlatform.getServerUrl());
                
                var app = express();
                app.use(bodyparser.json());
                app.use(bodyparser.urlencoded({ extended: true }));
                
                app.use(function(req: any, res: any, next: any) {
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.setHeader("Access-Control-Allow-Methods", "*");
                    res.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept");
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
            
            function cleanupServer(): void {
                if (server) {
                    server.close();
                    server = undefined;
                }
            }

            function prepareTest(): Q.Promise<string> {
                return projectManager.prepareEmulatorForTest(TestNamespace, targetPlatform);
            }
            
            function getMockResponse(mandatory: boolean = false, randomHash: boolean = true): su.CheckForUpdateResponseMock {
                var updateResponse = createMockResponse(mandatory);
                updateResponse.downloadURL = targetPlatform.getServerUrl() + "/download";
                // we need unique hashes to avoid conflicts - the application is not uninstalled between tests
                // and we store the failed hashes in preferences
                if (randomHash) {
                    updateResponse.packageHash = "randomHash-" + Math.floor(Math.random() * 10000);
                }
                return updateResponse;
            };
            
            describe("CodePush", function() {
                before(() => {
                    setupServer();
                    return projectManager.uninstallApplication(TestNamespace, targetPlatform)
                        .then(() => {
                            return projectManager.preparePlatform(testRunDirectory, targetPlatform);
                        });
                });
                
                after(() => {
                    cleanupServer();
                    return projectManager.cleanupAfterPlatform(testRunDirectory, targetPlatform).then(projectManager.cleanupAfterPlatform.bind(undefined, updatesDirectory, targetPlatform));
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
                    describe(prefix + platform.getName(), () => runTests(platform));
                });
            }
        });
    }
}