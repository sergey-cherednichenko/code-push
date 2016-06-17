import * as assert from "assert";
import * as CodePush from "rest-definitions";
import { Command } from "./utils/command";
var nixt = require("nixt");
var tryJSON = require("try-json");

function validateAccessKey(result: any): void {
    var apps: CodePush.App[] = tryJSON(result.stdout);
    assert(apps);
}

export function accessKeyTests() {
    before((done) =>  {
        done();
    });

    after((done) =>  {
        done();
    });

    it("app ls", (done: any) => {
        nixt()
            .expect(validateAccessKey)
            .run(Command.appLs())
            .end(done);
    });
}
