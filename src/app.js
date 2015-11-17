#!/usr/bin/env node

var requireL = require(__dirname+"/require-local.js");

var bus = require("hermes-bus");

requireL(
	"commandline-arguments",
	"tasks",
	"tasks-status-stdout",
	"manage-slaves",
	"http/http"
);

bus.on("requestStopApplication", function(exitCodeReference) {
	var exitCode = exitCodeReference.value || 0;
	console.info("Stopped.");
	process.exit(exitCode);
});

bus.triggerApplicationStarting();
bus.triggerApplicationStarted();
