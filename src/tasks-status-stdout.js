var bus = require("hermes-bus");

function reportTasks(tasks) {
	console.log(tasks.toString());
	console.log("");
}

bus.on("tasksUpdated", reportTasks);

bus.on("scheduleTasks", function(tasks) {
	reportTasks(tasks);
});
