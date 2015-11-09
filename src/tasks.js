
var bus = require("hermes-bus");

var statusTypes = {
	SCHEDULED: "Scheduled...",
	PICKED_UP: "Picked up.",
	RUNNING  : "Running...",
	FAILED   : "Failed!",
	SUCCESS  : "Success!",
};

bus.on("registerCommandlineArguments", function (parser) {
	parser.addArgument(
		['-t', '--task'],
		{
			action: 'append',
			dest: 'tasks',
			metavar: 'TASK',
			help: 'Specify a task to run. A task is specified as \
					TASKNAME=TESTFILE1,TESTFILE2,...,TESTFILEN. \
					This argument should be repeated for each task.'
		}
	);
});

bus.on("commandlineArgumentsParsed", function (args) {
	tasks = (args.tasks || []).map(function(taskSpec) {
		var keyValueTuple = taskSpec.split(/=/);
		return {
			name: keyValueTuple[0],
			testFiles:  keyValueTuple[1],
			workerId:  undefined,
			status:    statusTypes.SCHEDULED,
			completed: false,
			report: {
				fail:  undefined,
				error: undefined,
				total: undefined,
			}
		}
	});
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
