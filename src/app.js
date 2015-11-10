#!/usr/bin/env node

var requireL = require(__dirname+"/require-local.js");

var bus = require("hermes-bus");

requireL(
	"commandline-arguments",
	"tasks",
	"tasks-status-stdout",
	"http/http"
);

bus.triggerApplicationStarting();
bus.triggerApplicationStarted();

bus.on("requestStopApplication", function(exitCodeReference) {
	var exitCode = exitCodeReference.value || 0;
	process.exit(exitCode);
});
