var sprintf=require("sprintf-js").sprintf;
var _ = require("underscore-node");
var bus = require("hermes-bus");

function orElse(a, b) {
	return a != undefined ? a : b;
}

function reportTasks(tasks) {
	console.log('\033[2J'); // clear console (ANSI terminal/VT100)
	console.log("Tasks:");
	console.log("           Test Name              |    Status    |   Worker Id    | Completed? |Retry| Report");
	console.log(tasks.map(function(task) {
		var taskCopy = {
			name:		task.name.substr(-30),
			status:		task.status,
			completed:	task.completed ? "Completed" : "",
			workerId:	task.workerId,
			numRecoveryRunsLeft: 3-orElse(task.numRecoveryRunsLeft, 3),
			report:		JSON.stringify(_.pick(task.report, "fail", "error", "total")),
		};
		taskCopy.name = task.name.substr(-30);
		return sprintf("   %(name)30s | %(status)12s | %(workerId)14s | %(completed)10s | %(numRecoveryRunsLeft)3s | %(report)s", taskCopy);
	}).join("\n"));
	console.log("");
}

bus.on("tasksUpdated", reportTasks);

bus.on("scheduleTasks", function(tasks) {
	reportTasks(tasks);
});
