"use strict";

var gulp = require("gulp");
var merge = require("merge2");
var plugins = require("gulp-load-plugins")();
var replaceStream = require('replacestream');
var fs = require('fs');
var path = require('path');

function contentTask(cwd) {
    var options = {
        cwd: cwd,
        base: "./" + cwd
    };

    return gulp.src([
        "{script,test}/**/*.{css,ejs,html,js,json,png,xml}",
        "test/resources/**/*",
        "*.{public,private}",
        "package.json",
        "plugin.xml",
        "server.js",
        "web.config",
        ".npmignore",
        "README.md"
    ], options)
    .pipe(gulp.dest("bin", options));
}

gulp.task("rest-definitions", function(){
    if(!fs.existsSync("./sdk/bin")) {
        fs.mkdirSync("./sdk/bin");
    }
    var writeStream = fs.createWriteStream(path.join(__dirname, '..', 'sdk', 'bin', 'rest-definitions.d.ts'));
    return fs.createReadStream(path.join(__dirname, '..', 'definitions', 'rest-definitions.d.ts'))
        .pipe(replaceStream(/^\s*declare module "rest-definitions"\s*{/, ""))
        .pipe(replaceStream(/}\s*$/, ""))
        .pipe(writeStream);

});

gulp.task("content-sdk", ["rest-definitions"], function() { return contentTask("sdk"); });
gulp.task("content-cli", function() { return contentTask("cli"); });
