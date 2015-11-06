
var bus = require("hermes-bus");

// @TODO crawl for tests
var statusTypes = {
	SCHEDULED: "Scheduled...",
	PICKED_UP: "Picked up.",
	RUNNING  : "Running...",
	FAILED   : "Failed!",
	SUCCESS  : "Success!",
};
var testFiles = ["/awf/test/awf.communication.test.js", "/awf/test/awf.core.test.js"];
var tasks = testFiles.map(function(testFile) {
	return {
		workerId:  undefined,
		testFile:  testFile,
		status:    statusTypes.SCHEDULED,
		completed: false,
		report: {
			fail:  undefined,
			error: undefined,
			total: undefined,
		}
	};
});

bus.on("applicationStarted", function() {
	bus.triggerScheduleTasks(tasks);
});

bus.on("requestStopApplication", function(exitCodeReference) {
	var exitCode = tasks.every((task) => task.status === statusTypes.SUCCESS) ? 0 : 1;
	exitCodeReference.value = exitCode;
});

module.exports = {
	statusTypes: statusTypes,
};
