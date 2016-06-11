import * as assert from "assert";
import * as CodePush from "rest-definitions";
import { getCommand } from "./utils/command";
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
        var command: string = getCommand("app ls");
        nixt()
            .expect(validateAccessKey)
            .run(command)
            .end(done);
    });
}
