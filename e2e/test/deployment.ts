import * as assert from "assert";
import * as CodePush from "rest-definitions";
import { Command, validateResponse } from "./utils/command";
import { getErrorAppNotFound, getErrorDeploymentConflict, getErrorDeploymentNotFound } from "./utils/error";
import { makeRandomString } from "./utils/misc";
import { getSuccessAppAdd, getSuccessDeploymentAdd, getSuccessDeploymentRename, getSuccessDeploymentRm } from "./utils/success";
var nixt = require("nixt");
var tryJSON = require("try-json");

function validateDeployments(deployments: CodePush.Deployment[]): void {
    assert(deployments);
    
    // No two deployments for a single app can share the same name or key.
    var doesNameExist: { [name: string]: boolean } = {};
    var doesKeyExist: { [key: string]: boolean } = {};
    
    deployments.forEach((deployment: CodePush.Deployment) => {
        assert(!doesNameExist[deployment.name]);
        doesNameExist[deployment.name] = true;
        
        assert(!doesKeyExist[deployment.key]);
        doesKeyExist[deployment.key] = true;
    });
}

function validateAndCheckForDeployments(deploymentTuplesToCheck: { [deploymentName: string]: boolean }): (deployments: CodePush.Deployment[]) => void {
    return validateResponse((deployments: CodePush.Deployment[]) => {
        validateDeployments(deployments);
        
        deployments.forEach((deployment: CodePush.Deployment) => {
            assert(deploymentTuplesToCheck[deployment.name] === true || deploymentTuplesToCheck[deployment.name] === undefined);
            if (deploymentTuplesToCheck[deployment.name]) {
                delete deploymentTuplesToCheck[deployment.name];
            }
        });
        
        // At this point, all deployment tuples remaining in the map should be ones that should not be in the list of deployments.
        for (var deploymentName in deploymentTuplesToCheck) {
            assert(deploymentTuplesToCheck[deploymentName] === false);
        }
    });
}

function validateAndCheckForDeployment(deploymentName: string, exists: boolean): (deployments: CodePush.Deployment[]) => void {
    return validateAndCheckForDeployments({ [deploymentName]: exists });
}

export function deploymentTests() {
    var appName: string = makeRandomString();
    before((done) => {
        nixt()
            .stdout(getSuccessAppAdd(appName))
            .run(Command.appAdd(appName))
            .end(done);
    });
    
    describe("deployment ls", () => {
        it("succeeds", (done: any) => {
            nixt()
                .expect(validateResponse(validateDeployments))
                .run(Command.deploymentLs(appName))
                .end(done);
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(getErrorAppNotFound(fakeAppName))
                .run(Command.deploymentLs(fakeAppName))
                .end(done);
        });
    });
    
    describe("deployment add", () => {
        var deploymentName: string;
        beforeEach((done) => {
            deploymentName = makeRandomString();
            
            nixt()
                .stdout(getSuccessDeploymentAdd(deploymentName, appName))
                .run(Command.deploymentAdd(deploymentName, appName))
                .end(done);
        });
        
        it("succeeds", (done) => {
            nixt()
                .expect(validateAndCheckForDeployment(deploymentName, true))
                .run(Command.deploymentLs(appName))
                .end(done);
        });
        
        it("fails if deployment conflict", (done) => {
            nixt()
                .stderr(getErrorDeploymentConflict(deploymentName))
                .run(Command.deploymentAdd(deploymentName, appName))
                .end(done);
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(getErrorAppNotFound(fakeAppName))
                .run(Command.deploymentAdd(deploymentName, fakeAppName))
                .end(done);
        });
    });
    
    describe("deployment rm", () => {
        var deploymentName: string;
        beforeEach((done) => {
            deploymentName = makeRandomString();
            
            nixt()
                .stdout(getSuccessDeploymentAdd(deploymentName, appName))
                .run(Command.deploymentAdd(deploymentName, appName))
                .end(done);
        });
        
        it("succeeds with Y", (done: any) => {
            nixt()
                .stdout(getSuccessDeploymentRm(deploymentName, appName))
                .run(Command.deploymentRm(deploymentName, appName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(() => {
                    nixt()
                        .expect(validateAndCheckForDeployment(deploymentName, false))
                        .run(Command.deploymentLs(appName))
                        .end(done);
                });
        });
        
        it("fails with n", (done: any) => {
            nixt()
                .stdout("Deployment removal cancelled.")
                .run(Command.deploymentRm(deploymentName, appName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_REJECT)
                .end(() => {
                    nixt()
                        .expect(validateAndCheckForDeployment(deploymentName, true))
                        .run(Command.deploymentLs(appName))
                        .end(done);
                });
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(getErrorAppNotFound(fakeAppName))
                .run(Command.deploymentRm(deploymentName, fakeAppName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(done);
        });
        
        it("fails if deployment not found", (done: any) => {
            var fakeDeploymentName: string = "not_a_real_deployment";
            
            nixt()
                .stderr(getErrorDeploymentNotFound(fakeDeploymentName))
                .run(Command.deploymentRm(fakeDeploymentName, appName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(done);
        });
    });
    
    describe("deployment rename", () => {
        var oldDeploymentName: string;
        var newDeploymentName: string;
        beforeEach((done) => {
            oldDeploymentName = makeRandomString();
            newDeploymentName = makeRandomString();
            
            nixt()
                .stdout(getSuccessDeploymentAdd(oldDeploymentName, appName))
                .run(Command.deploymentAdd(oldDeploymentName, appName))
                .end(done);
        });
        
        it("succeeds", (done: any) => {
            nixt()
                .stdout(getSuccessDeploymentRename(oldDeploymentName, newDeploymentName, appName))
                .run(Command.deploymentRename(oldDeploymentName, newDeploymentName, appName))
                .end(() => {
                    nixt()
                        .expect(validateAndCheckForDeployments({ [oldDeploymentName]: false, [newDeploymentName]: true }))
                        .run(Command.deploymentLs(appName))
                        .end(done);
                });
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(getErrorAppNotFound(fakeAppName))
                .run(Command.deploymentRename(oldDeploymentName, newDeploymentName, fakeAppName))
                .end(done);
        });
        
        it("fails if deployment not found", (done: any) => {
            var fakeDeploymentName: string = "not_a_real_deployment";
            
            nixt()
                .stderr(getErrorDeploymentNotFound(fakeDeploymentName))
                .run(Command.deploymentRename(fakeDeploymentName, newDeploymentName, appName))
                .end(done);
        });
        
        it("fails if deployment conflict", (done: any) => {
            nixt()
                .stdout(getSuccessDeploymentAdd(newDeploymentName, appName))
                .run(Command.deploymentAdd(newDeploymentName, appName))
                .end(() => {
                    nixt()
                        .stderr(getErrorDeploymentConflict(newDeploymentName))
                        .run(Command.deploymentRename(oldDeploymentName, newDeploymentName, appName))
                        .end(done);
                });
        });
    });
    
    // TODO: clear, history
}
