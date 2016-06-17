import * as assert from "assert";
import * as CodePush from "rest-definitions";
import { Command, validateResponse } from "./utils/command";
import { getErrorAppConflict, getErrorAppNotFound } from "./utils/error";
import { makeRandomString } from "./utils/misc";
import { getSuccessAppAdd, getSuccessAppRename, getSuccessAppRm } from "./utils/success";
var nixt = require("nixt");
var tryJSON = require("try-json");

function validateApp(app: CodePush.App): void {
    assert(app);

    // An app must have a name.
    assert(app.name);

    var collaboratorMap: CodePush.CollaboratorMap = app.collaborators;
    assert(collaboratorMap);

    // An app must have exactly one owner and an infinite amount of collaborators in its collaborator list.
    var hasOwner: boolean = false;
    // An app must have exactly one collaborator marked as the current account.
    var hasCurrentAccount: boolean = false;

    // No two collaborators can share the same email.
    var doesEmailExist: { [email: string]: boolean } = {};

    for (var email in collaboratorMap) {
        assert(!doesEmailExist[email]);
        doesEmailExist[email] = true;

        var collaboratorProperties: CodePush.CollaboratorProperties = collaboratorMap[email];

        var isOwner: boolean = collaboratorProperties.permission === "Owner";
        assert(!(isOwner && hasOwner));
        hasOwner = isOwner;

        var isCurrentAccount: boolean = collaboratorProperties.isCurrentAccount;
        assert(!(isCurrentAccount && hasCurrentAccount));
        hasCurrentAccount = isCurrentAccount;
    }

    assert(hasOwner);
    assert(hasCurrentAccount);
}

function validateApps(apps: CodePush.App[]): void {
    assert(apps);

    // A user cannot have two apps of the same name.
    var doesNameExist: { [name: string]: boolean } = {};

    apps.forEach((app: CodePush.App) => {
        assert(!doesNameExist[app.name]);
        doesNameExist[app.name] = true;
        
        validateApp(app);
    });
}

function validateAndCheckForApps(appTuplesToCheck: { [appName: string]: boolean }): (apps: CodePush.App[]) => void {
    return validateResponse((apps: CodePush.App[]) => {
        validateApps(apps);
        
        apps.forEach((app: CodePush.App) => {
            assert(appTuplesToCheck[app.name] === true || appTuplesToCheck[app.name] === undefined);
            if (appTuplesToCheck[app.name]) {
                console.log("\tHERE");
                delete appTuplesToCheck[app.name];
            }
        });
        
        // At this point, all app tuples remaining in the map should be ones that should not be in the list of apps.
        for (var appName in appTuplesToCheck) {
            assert(appTuplesToCheck[appName] === false);
        }
    });
}

function validateAndCheckForApp(appName: string, exists: boolean): (apps: CodePush.App[]) => void {
    return validateAndCheckForApps({ [appName]: exists });
}

export function appTests() {
    
    describe("app ls", () => {
        it("succeeds", (done: any) => {
            nixt()
                .expect(validateResponse(validateApps))
                .run(Command.appLs())
                .end(done);
        });
    });
    
    describe("app add", () => {
        var appName: string;
        beforeEach((done) => {
            appName = makeRandomString();
            
            nixt()
                .stdout(getSuccessAppAdd(appName))
                .run(Command.appAdd(appName))
                .end(done);
        });
        
        it("succeeds", (done) => {
            nixt()
                .expect(validateAndCheckForApp(appName, true))
                .run(Command.appLs())
                .end(done);
        });
        
        it("fails if app conflict", (done) => {
            nixt()
                .stderr(getErrorAppConflict(appName))
                .run(Command.appAdd(appName))
                .end(done);
        });
    });
    
    describe("app rm", () => {
        var appName: string;
        beforeEach((done) => {
            appName = makeRandomString();
            
            nixt()
                .stdout(getSuccessAppAdd(appName))
                .run(Command.appAdd(appName))
                .end(done);
        });
        
        it("succeeds with Y", (done: any) => {
            nixt()
                .stdout(getSuccessAppRm(appName))
                .run(Command.appRm(appName))
                .on(Command.PROMPT_ARE_YOU_SURE).respond(Command.RESPONSE_ACCEPT)
                .end(() => {
                    nixt()
                        .expect(validateAndCheckForApp(appName, false))
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
                        .expect(validateAndCheckForApp(appName, true))
                        .run(Command.appLs())
                        .end(done);
                });
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(getErrorAppNotFound(fakeAppName))
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
                .stdout(getSuccessAppAdd(oldAppName))
                .run(Command.appAdd(oldAppName))
                .end(done);
        });
        
        it("succeeds", (done: any) => {
            nixt()
                .stdout(getSuccessAppRename(oldAppName, newAppName))
                .run(Command.appRename(oldAppName, newAppName))
                .end(() => {
                    nixt()
                        .expect(validateAndCheckForApps({ [oldAppName]: false, [newAppName]: true }))
                        .run(Command.appLs())
                        .end(done);
                });
        });
        
        it("fails if app not found", (done: any) => {
            var fakeAppName: string = "not_a_real_app";
            
            nixt()
                .stderr(getErrorAppNotFound(fakeAppName))
                .run(Command.appRename(fakeAppName, newAppName))
                .end(done);
        });
        
        it("fails if app conflict", (done: any) => {
            nixt()
                .code(201)
                .run(Command.appAdd(newAppName))
                .end(() => {
                    nixt()
                        .stderr(getErrorAppConflict(newAppName))
                        .run(Command.appRename(oldAppName, newAppName))
                        .end(done);
                });
        });
    });
    
    // TODO: TRANSFER APP TESTS
}
