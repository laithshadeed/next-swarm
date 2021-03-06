var _ = require('underscore-node');

var bus = require("hermes-bus");

var requireL = require("root-require")("./src/require-local.js");
var orElse = requireL("utils").orElse;

const {
	COMPLETED_WITHOUT_FAILING_TESTS,
	COMPLETED_WITH_FAILING_TESTS,
} = requireL("exitcodes");

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
					TASKNAME=URI. \
					This argument should be repeated for each task.'
		}
	);
});

// workaround for the missing '.publish' on hermes-bus:
bus.on("taskUpdated", function(){});
bus.on("tasksUpdated", function(){});

var triggerTasksUpdated = _.throttle((tasks) => bus.triggerTasksUpdated(tasks), 100);
var triggerTaskUpdated = function(task, propertyName) {
	bus.triggerTaskUpdated(task, propertyName);
	triggerTasksUpdated(tasks);
};

bus.on("commandlineArgumentsParsed", function (args) {
	var taskObjects = (args.tasks || []).map(function(taskSpec) {
		var keyValueTuple = taskSpec.split(/=(.+)?/);
		return {
			name: keyValueTuple[0],
			uri:  keyValueTuple[1],
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
						return orElse(task[propertyName], defaultValue);
					},
					set: function(value) {
						task[propertyName] = value;
						triggerTaskUpdated(accessor, propertyName);
					},
				});
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
	const allTasksCompleted = tasks.every((task) => task.completed);
	let exitCode = undefined;

	if(allTasksCompleted) {
		const allTasksSuccess = tasks.every((task) => task.status === statusTypes.SUCCESS);
		exitCode = allTasksSuccess
			? COMPLETED_WITHOUT_FAILING_TESTS
			: COMPLETED_WITH_FAILING_TESTS
			;
	}

	if(exitCode !== undefined) {
		exitCodeReference.value = exitCode;
	}
});

module.exports = {
	statusTypes: statusTypes,
};
