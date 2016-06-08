var nixt = require("nixt");

function outfn(data) {
    console.log("All good: " + data);
}

nixt()
    .run("node --version")
    .stdout("v4.4.3")
    .end(outfn);
    