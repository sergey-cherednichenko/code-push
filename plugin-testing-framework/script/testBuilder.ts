"use strict";

// IMPORTS

import platform = require("./platform");
import { ProjectManager } from "./projectManager";
import ServerUtil = require("./serverUtil");
import TestConfig = require("./testConfig");

//////////////////////////////////////////////////////////////////////////////////////////
// Use this class to create and structure the tests.

// Usage is almost identical to Mocha, but with the addition of the optional "scenarioPath" in describe() and the required "isCoreTest" in it().

export class TestBuilder {
    public static describe: ITestBuilderContextDefintion = getDescribe();
    public static it: ITestBuilderTestDefinition = getIt();
}

//////////////////////////////////////////////////////////////////////////////////////////
// Base TestBuilder class

export class TestBuilderBase {
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
    public create(coreTestsOnly: boolean, projectManager: ProjectManager, targetPlatform: platform.IPlatform): void {};
}

//////////////////////////////////////////////////////////////////////////////////////////
// TestBuilder subclasses

/** Use this class to create a mocha.describe that contains additional tests */
export class TestBuilderDescribe extends TestBuilderBase {
    /** The name passed to the describe */
    private describeName: string;
    /** The path to the scenario that will be loaded by the test app for the nested TestBuilder objects */
    private scenarioPath: string;
    /** An array of nested TestBuilder objects that this describe contains */
    private testBuilders: TestBuilderBase[];
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
    constructor(describeName: string, testBuilders: TestBuilderBase[], scenarioPath?: string, options?: { only?: boolean, skip?: boolean }) {
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
    public create(coreTestsOnly: boolean, projectManager: ProjectManager, targetPlatform: platform.IPlatform): void {
        if (this.skip) return;
        
        describe(this.describeName, () => {
            if (this.hasIts) {
                afterEach(() => {
                    console.log("Cleaning up!");
                    ServerUtil.updateResponse = undefined;
                    ServerUtil.testMessageCallback = undefined;
                    ServerUtil.updateCheckCallback = undefined;
                    ServerUtil.testMessageResponse = undefined;
                });
            
                beforeEach(() => {
                    return targetPlatform.getEmulatorManager().prepareEmulatorForTest(TestConfig.TestNamespace);
                });
            }

            if (this.scenarioPath) {
                before(() => {
                    return projectManager.setupScenario(TestConfig.testRunDirectory, TestConfig.TestNamespace, TestConfig.templatePath, this.scenarioPath, targetPlatform);
                });
            }
            
            this.testBuilders.forEach(testBuilder => {
                if (!(this.hasOnly && !testBuilder.only)) testBuilder.create(coreTestsOnly, projectManager, targetPlatform);
            });
        });
    }
}

/** A test case to be run by the Plugin Testing Framework. */
export type TestCase = (projectManager: ProjectManager, targetPlatform: platform.IPlatform, done: MochaDone) => void;

/** Use this class to create a test through mocha.it */
export class TestBuilderIt extends TestBuilderBase {
    /** The name of the test */
    private testName: string;
    /** The test to be run */
    private test: TestCase;
    /** Whether or not the test should be run when "--core" is supplied */
    private isCoreTest: boolean;
    
    /**
     * testName - used as the expectation in the call to it
     * test - the test to provide to it
     * isCoreTest - whether or not the test should run when "--core" is supplied
     * only - if true, use it.only
     */
    constructor(testName: string, test: TestCase, isCoreTest: boolean, options?: { only?: boolean, skip?: boolean }) {
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
    public create(coreTestsOnly: boolean, projectManager: ProjectManager, targetPlatform: platform.IPlatform): void {
        if (!this.skip && (!coreTestsOnly || this.isCoreTest)) {
            it(this.testName, this.test.bind(this, projectManager, targetPlatform));
        }
    }
}

//////////////////////////////////////////////////////////////////////////////////////////
// Mocha mimicry

export interface ITestBuilderContextDefintion {
    (description: string, tests: TestBuilderBase[], scenarioPath?: string): TestBuilderBase;
    only(description: string, tests: TestBuilderBase[], scenarioPath?: string): TestBuilderBase;
    skip(description: string, tests: TestBuilderBase[], scenarioPath?: string): TestBuilderBase;
}

/**
 * Returns a hybrid type that mimics mocha's describe object.
 */
function getDescribe(): ITestBuilderContextDefintion {
    var describer = <ITestBuilderContextDefintion>function(description: string, tests: TestBuilderBase[], scenarioPath?: string): TestBuilderBase {
        return new TestBuilderDescribe(description, tests, scenarioPath);
    };
    describer.only = function(description: string, tests: TestBuilderBase[], scenarioPath?: string): TestBuilderBase {
        return new TestBuilderDescribe(description, tests, scenarioPath, { only: true });
    };
    describer.skip = function(description: string, tests: TestBuilderBase[], scenarioPath?: string): TestBuilderBase {
        return new TestBuilderDescribe(description, tests, scenarioPath, { skip: true });
    };
    return describer;
}

export interface ITestBuilderTestDefinition {
    (expectation: string, assertion: TestCase, isCoreTest: boolean): TestBuilderBase;
    only(expectation: string, assertion: TestCase, isCoreTest: boolean): TestBuilderBase;
    skip(expectation: string, assertion: TestCase, isCoreTest: boolean): TestBuilderBase;
}

/**
 * Returns a hybrid type that mimics mocha's it object.
 */
function getIt(): ITestBuilderTestDefinition {
    var itr = <ITestBuilderTestDefinition>function(expectation: string, assertion: TestCase, isCoreTest: boolean): TestBuilderBase {
        return new TestBuilderIt(expectation, assertion, isCoreTest);
    };
    itr.only = function(expectation: string, assertion: TestCase, isCoreTest: boolean): TestBuilderBase {
        return new TestBuilderIt(expectation, assertion, isCoreTest, { only: true });
    };
    itr.skip = function(expectation: string, assertion: TestCase, isCoreTest: boolean): TestBuilderBase {
        return new TestBuilderIt(expectation, assertion, isCoreTest, { skip: true });
    };
    return itr;
}