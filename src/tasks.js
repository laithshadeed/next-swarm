var _ = require('underscore-node');

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

// workaround for the missing '.publish' on hermes-bus:
bus.on("taskUpdated", function(){});
bus.on("tasksUpdated", function(){});

var triggerTasksUpdated = _.throttle((tasks) => bus.triggerTasksUpdated(tasks), 100);
var triggerTaskUpdated = _.throttle(function(task) {
	bus.triggerTaskUpdated(task);
	triggerTasksUpdated(tasks);
}, 100);

bus.on("commandlineArgumentsParsed", function (args) {
	var taskObjects = (args.tasks || []).map(function(taskSpec) {
		var keyValueTuple = taskSpec.split(/=/);
		return {
			name: keyValueTuple[0],
			testFiles:  keyValueTuple[1],
			workerId:  "<unknown>",
			status:    statusTypes.SCHEDULED,
			completed: false,
			report: {
				fail:  undefined,
				error: undefined,
				total: undefined,
			}
		};
	});

	tasks = taskObjects.map(function(task) {
		var accessor = {
			defineProperty: function(propertyName, defaultValue) {
				Object.defineProperty(accessor,	propertyName, {
					get: function() {
						return task[propertyName];
					},
					set: function(value) {
						task[propertyName] = value;
						triggerTaskUpdated(accessor);
					},
				});

				if(defaultValue != undefined) {
					this[propertyName] = defaultValue;
				}
			}
		};
		Object.keys(task).forEach((key) => accessor.defineProperty(key));

		return accessor;
	});

	tasks.toString = function() {
		return JSON.stringify(taskObjects, undefined, "  ");
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
