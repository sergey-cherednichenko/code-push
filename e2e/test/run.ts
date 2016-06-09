import * as assert from "assert";
var tryJSON = require("try-json");
var nixt = require("nixt");

function validateApps(result: any): void {
    var apps: any[] = tryJSON(result.stdout);
    assert(apps);
    var appNames: string[] = apps.map((app: any) => app.name);
    console.log(appNames);
}

describe("Codepush app commands", function() {
  it("app ls", function(done) {
    nixt()
        .expect(validateApps)
        .run("code-push app ls --format json")
        .end(done);
  });
});