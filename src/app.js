#!/usr/bin/env node

var requireL = require("root-require")("./src/require-local.js");
var console_log = requireL("logging").logger("console");

var bus = require("hermes-bus");

const {APPLICATION_STOPPED_WITH_NO_ERRORS} = requireL("exitcodes");

requireL(
	"logging",
	"logging-vt100",
	//"logging-websockets",
	"commandline-arguments",
	"tasks",
	"tasks-smart-order",
	"tasks-status-reporting",
	"tasks-status-save-final-report",
	"manage-slaves",
	"http/http"
);

bus.on("requestStopApplication", function(exitCodeReference) {
	var exitCode = exitCodeReference.value || APPLICATION_STOPPED_WITH_NO_ERRORS;
	console_log("Stopped.");

	// Give all modules a chance to receive the last
	// logs before terminating the application.
	setTimeout(function() {
		process.exit(exitCode);
	}, 2000);
});

bus.triggerApplicationStarting();
bus.triggerApplicationStarted();
