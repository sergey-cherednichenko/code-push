import * as assert from "assert";
import * as CodePush from "rest-definitions";
import { Command } from "./utils/command";
import { Error } from "./utils/error";
import { makeRandomString } from "./utils/misc";
import { Success } from "./utils/success";
import { Validate } from "./utils/validate";
var nixt = require("nixt");
var tryJSON = require("try-json");

export function deploymentTests() {
    var appName: string = makeRandomString();
    before((done) => {
        nixt()
            .stdout(Success.appAdd(appName))
            .run(Command.appAdd(appName))
            .end(done);
    });
    
    describe("deployment ls", () => {
        it("succeeds", (done: any) => {
            nixt()
                .expect(Validate.Deployments())
                .run(Command.deploymentLs(appName))
                .end(done);
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.deploymentLs(fakeAppName))
                .end(done);
        });
    });
    
    describe("deployment add", () => {
        var deploymentName: string;
        beforeEach((done) => {
            deploymentName = makeRandomString();
            
            nixt()
                .stdout(Success.deploymentAdd(deploymentName, appName))
                .run(Command.deploymentAdd(deploymentName, appName))
                .end(done);
        });
        
        it("succeeds", (done) => {
            nixt()
                .expect(Validate.Deployments.checkFor(deploymentName, true))
                .run(Command.deploymentLs(appName))
                .end(done);
        });
        
        it("fails if deployment conflict", (done) => {
            nixt()
                .stderr(Error.deploymentConflict(deploymentName))
                .run(Command.deploymentAdd(deploymentName, appName))
                .end(done);
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.deploymentAdd(deploymentName, fakeAppName))
                .end(done);
        });
    });
    
    describe("deployment rm", () => {
        var deploymentName: string;
        beforeEach((done) => {
            deploymentName = makeRandomString();
            
            nixt()
                .stdout(Success.deploymentAdd(deploymentName, appName))
                .run(Command.deploymentAdd(deploymentName, appName))
                .end(done);
        });
        
        it("succeeds with Y", (done: any) => {
            nixt()
                .stdout(Success.deploymentRm(deploymentName, appName))
                .run(Command.deploymentRm(deploymentName, appName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(() => {
                    nixt()
                        .expect(Validate.Deployments.checkFor(deploymentName, false))
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
                        .expect(Validate.Deployments.checkFor(deploymentName, true))
                        .run(Command.deploymentLs(appName))
                        .end(done);
                });
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.deploymentRm(deploymentName, fakeAppName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(done);
        });
        
        it("fails if deployment not found", (done: any) => {
            var fakeDeploymentName: string = "not_a_real_deployment";
            
            nixt()
                .stderr(Error.deploymentNotFound(fakeDeploymentName))
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
                .stdout(Success.deploymentAdd(oldDeploymentName, appName))
                .run(Command.deploymentAdd(oldDeploymentName, appName))
                .end(done);
        });
        
        it("succeeds", (done: any) => {
            nixt()
                .stdout(Success.deploymentRename(oldDeploymentName, newDeploymentName, appName))
                .run(Command.deploymentRename(oldDeploymentName, newDeploymentName, appName))
                .end(() => {
                    nixt()
                        .expect(Validate.Deployments.checkForMany({ [oldDeploymentName]: false, [newDeploymentName]: true }))
                        .run(Command.deploymentLs(appName))
                        .end(done);
                });
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.deploymentRename(oldDeploymentName, newDeploymentName, fakeAppName))
                .end(done);
        });
        
        it("fails if deployment not found", (done: any) => {
            var fakeDeploymentName: string = "not_a_real_deployment";
            
            nixt()
                .stderr(Error.deploymentNotFound(fakeDeploymentName))
                .run(Command.deploymentRename(fakeDeploymentName, newDeploymentName, appName))
                .end(done);
        });
        
        it("fails if deployment conflict", (done: any) => {
            nixt()
                .stdout(Success.deploymentAdd(newDeploymentName, appName))
                .run(Command.deploymentAdd(newDeploymentName, appName))
                .end(() => {
                    nixt()
                        .stderr(Error.deploymentConflict(newDeploymentName))
                        .run(Command.deploymentRename(oldDeploymentName, newDeploymentName, appName))
                        .end(done);
                });
        });
    });
    
    // TODO: clear, history
}
