import * as assert from "assert";
import * as CodePush from "rest-definitions";
import { Command } from "./utils/command";
var nixt = require("nixt");
var tryJSON = require("try-json");

function validateCollaborator(result: any): void {
    var apps: CodePush.App[] = tryJSON(result.stdout);
    assert(apps);
}

export function collaboratorTests() {
    before((done) =>  {
        done();
    });

    after((done) =>  {
        done();
    });

    it("app ls", (done: any) => {
        nixt()
            .expect(validateCollaborator)
            .run(Command.appLs())
            .end(done);
    });
}
