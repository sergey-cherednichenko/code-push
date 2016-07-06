var childProcess = require("child_process");
var moment = require("moment");
var path = require("path");
var Q = require("q");
var simctl = require("simctl");
var which = require("which");
var AndroidDebugPlatform = (function () {
    function AndroidDebugPlatform() {
    }
    AndroidDebugPlatform.prototype.getLogProcess = function () {
        try {
            which.sync("adb");
        }
        catch (e) {
            throw new Error("ADB command not found. Please ensure it is installed and available on your path.");
        }
        if (!this.isDeviceAvailable()) {
            throw new Error("No Android devices found. Re-run this command after starting one.");
        }
        return childProcess.spawn("adb", ["logcat"]);
    };
    // The following is an example of what the output looks
    // like when running the "adb devices" command.
    //
    // List of devices attached
    // emulator-5554	device
    AndroidDebugPlatform.prototype.isDeviceAvailable = function () {
        var output = childProcess.execSync("adb devices").toString();
        return output.search(/^[\w-]+\s+device$/mi) > -1;
    };
    AndroidDebugPlatform.prototype.normalizeLogMessage = function (message) {
        // Check to see whether the message includes the source URL
        // suffix, and if so, strip it. This can occur in Android Cordova apps.
        var sourceURLIndex = message.indexOf("\", source: file:///");
        if (~sourceURLIndex) {
            return message.substring(0, sourceURLIndex);
        }
        else {
            return message;
        }
    };
    return AndroidDebugPlatform;
})();
var iOSDebugPlatform = (function () {
    function iOSDebugPlatform() {
    }
    iOSDebugPlatform.prototype.getSimulatorID = function () {
        var output = simctl.list({ devices: true, silent: true });
        var simulators = output.json.devices
            .map(function (platform) { return platform.devices; })
            .reduce(function (prev, next) { return prev.concat(next); })
            .filter(function (device) { return device.state === "Booted"; })
            .map(function (device) { return device.id; });
        return simulators[0];
    };
    iOSDebugPlatform.prototype.getLogProcess = function () {
        if (process.platform !== "darwin") {
            throw new Error("iOS debug logs can only be viewed on OS X.");
        }
        var simulatorID = this.getSimulatorID();
        if (!simulatorID) {
            throw new Error("No iOS simulators found. Re-run this command after starting one.");
        }
        var logFilePath = path.join(process.env.HOME, "Library/Logs/CoreSimulator", simulatorID, "system.log");
        return childProcess.spawn("tail", ["-f", logFilePath]);
    };
    iOSDebugPlatform.prototype.normalizeLogMessage = function (message) {
        return message;
    };
    return iOSDebugPlatform;
})();
var logMessagePrefix = "[CodePush] ";
function processLogData(logData) {
    var _this = this;
    var content = logData.toString();
    content.split("\n")
        .filter(function (line) { return line.indexOf(logMessagePrefix) > -1; })
        .map(function (line) {
        // Allow the current platform
        // to normalize the message first.
        line = _this.normalizeLogMessage(line);
        // Strip the CodePush-specific, platform agnostic
        // log message prefix that is added to each entry.
        var message = line.substring(line.indexOf(logMessagePrefix) + logMessagePrefix.length);
        var timeStamp = moment().format("hh:mm:ss");
        return "[" + timeStamp + "] " + message;
    })
        .forEach(function (line) { return console.log(line); });
}
var debugPlatforms = {
    android: new AndroidDebugPlatform(),
    ios: new iOSDebugPlatform()
};
function default_1(command) {
    return Q.Promise(function (resolve, reject) {
        var platform = command.platform.toLowerCase();
        var debugPlatform = debugPlatforms[platform];
        if (!debugPlatform) {
            var availablePlatforms = Object.getOwnPropertyNames(debugPlatforms);
            return reject(new Error("\"" + platform + "\" is an unsupported platform. Available options are " + availablePlatforms.join(", ") + "."));
        }
        try {
            var logProcess = debugPlatform.getLogProcess();
            console.log("Listening for " + platform + " debug logs (Press CTRL+C to exit)");
            logProcess.stdout.on("data", processLogData.bind(debugPlatform));
            logProcess.stderr.on("data", reject);
            logProcess.on("close", resolve);
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.default = default_1;
;
