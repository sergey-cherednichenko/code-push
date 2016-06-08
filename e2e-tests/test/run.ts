var nixt = require("nixt");

function refute(err: any) {
    if (err) {
        console.log(err);
    } else {
        console.log("All good");
    }
}

describe("Codepush app commands", function() {
  it("app ls", function(done) {
    nixt()
        .expect((result: any) => {
            console.log(result.stdout);
        })
        .run("code-push app ls")
        .end(done);
  });
});