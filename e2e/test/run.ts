import * as assert from "assert";
import * as CodePush from "rest-definitions";
var nixt = require("nixt");
var tryJSON = require("try-json");

function validateApps(result: any): void {
    var apps: CodePush.App[] = tryJSON(result.stdout);
    assert(apps);
}

function getCommand(args: string) {
    return "code-push " + args + " --format json";
}

describe("CodePush", () => {
    before((done) => {
        nixt()
            .expect((result: any) => {
                console.log("\tTesting CodePush CLI version: " + result.stdout);
            })
            .run("code-push --v")
            .end(done);
    });

    describe("Running commands", () => {
        it("app ls", (done: any) => {
            var command: string = getCommand("app ls");
            nixt()
                .expect(validateApps)
                .run(command)
                .end(done);
        });
    });
});