import * as assert from "assert";
import * as CodePush from "rest-definitions";
import { Command } from "./utils/command";
import { Error } from "./utils/error";
import { makeRandomString } from "./utils/misc";
import { Success } from "./utils/success";
import { Validate } from "./utils/validate";
var nixt = require("nixt");
var tryJSON = require("try-json");

export function appTests() {
    
    describe("app ls", () => {
        it("succeeds", (done: any) => {
            nixt()
                .expect(Validate.Apps())
                .run(Command.appLs())
                .end(done);
        });
    });
    
    describe("app add", () => {
        var appName: string;
        beforeEach((done) => {
            appName = makeRandomString();
            
            nixt()
                .stdout(Success.appAdd(appName))
                .run(Command.appAdd(appName))
                .end(done);
        });
        
        it("succeeds", (done) => {
            nixt()
                .expect(Validate.Apps.checkFor(appName, true))
                .run(Command.appLs())
                .end(done);
        });
        
        it("fails if app conflict", (done) => {
            nixt()
                .stderr(Error.appConflict(appName))
                .run(Command.appAdd(appName))
                .end(done);
        });
    });
    
    describe("app rm", () => {
        var appName: string;
        beforeEach((done) => {
            appName = makeRandomString();
            
            nixt()
                .stdout(Success.appAdd(appName))
                .run(Command.appAdd(appName))
                .end(done);
        });
        
        it("succeeds with Y", (done: any) => {
            nixt()
                .stdout(Success.appRm(appName))
                .run(Command.appRm(appName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(() => {
                    nixt()
                        .expect(Validate.Apps.checkFor(appName, false))
                        .run(Command.appLs())
                        .end(done);
                });
        });
        
        it("fails with n", (done: any) => {
            nixt()
                .stdout("App removal cancelled.")
                .run(Command.appRm(appName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_REJECT)
                .end(() => {
                    nixt()
                        .expect(Validate.Apps.checkFor(appName, true))
                        .run(Command.appLs())
                        .end(done);
                });
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.appRm(fakeAppName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(done);
        });
    });
    
    describe("app rename", () => {
        var oldAppName: string;
        var newAppName: string;
        beforeEach((done) => {
            oldAppName = makeRandomString();
            newAppName = makeRandomString();
            
            nixt()
                .stdout(Success.appAdd(oldAppName))
                .run(Command.appAdd(oldAppName))
                .end(done);
        });
        
        it("succeeds", (done: any) => {
            nixt()
                .stdout(Success.appRename(oldAppName, newAppName))
                .run(Command.appRename(oldAppName, newAppName))
                .end(() => {
                    nixt()
                        .expect(Validate.Apps.checkForMany({ [oldAppName]: false, [newAppName]: true }))
                        .run(Command.appLs())
                        .end(done);
                });
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(Error.appNotFound(fakeAppName))
                .run(Command.appRename(fakeAppName, newAppName))
                .end(done);
        });
        
        it("fails if app conflict", (done: any) => {
            nixt()
                .code(201)
                .run(Command.appAdd(newAppName))
                .end(() => {
                    nixt()
                        .stderr(Error.appConflict(newAppName))
                        .run(Command.appRename(oldAppName, newAppName))
                        .end(done);
                });
        });
    });
    
    // TODO: TRANSFER APP TESTS
}
