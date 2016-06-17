import * as assert from "assert";
import * as CodePush from "rest-definitions";
import { accessKeyTests } from "./access-key";
import { appTests } from "./app";
import { deploymentTests } from "./deployment";
import { collaboratorTests } from "./collaborator";

var nixt = require("nixt");
var tryJSON = require("try-json");

function validateApps(result: any): void {
    var apps: CodePush.App[] = tryJSON(result.stdout);
    assert(apps);
}

describe("CodePush", () => {
    before((done) => {
        nixt()
            .expect((result: any) => {
                console.log(`   Testing CodePush CLI version: ${result.stdout}`);
            })
            .run("code-push --v")
            .end(done);
    });

    // describe("Access key commands", () => accessKeyTests());
    describe("App commands", () => appTests());
    // describe("Collaborator commands", () => collaboratorTests());
    describe("Deployment commands", () => deploymentTests());
});