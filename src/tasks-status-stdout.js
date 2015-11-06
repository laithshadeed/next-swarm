var bus = require("hermes-bus");

function reportTasks(tasks) {
	console.log(tasks);
	console.log("");
}

bus.on("reportTasks", reportTasks);

// @TODO Put in separate bus module (benefits other output, e.g. web/http)
bus.on("scheduleTasks", function(tasks) {
	bus.triggerReportTasks(tasks);
});
