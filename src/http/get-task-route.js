var _ = require('underscore-node');
var requireL = require("root-require")("./src/require-local.js");
var query = require("connect-query");

var bus = require("hermes-bus");

bus.on("registerCommandlineArguments", function (parser) {
	parser.addArgument(
		['--test-runner'],
		{
			dest: 'testRunner',
			metavar: 'PATH',
			required: false,
			help: 'Specify the test runner path. This is the base uri path \
					at which the test runner is served. The test runner will \
					receive the following uri parameters: \
						name     - the name of the task, should be in the report \
						workerId - the id of the worked (used for heartbeats) \
						swarmURL - the base url on which next-swarm runs (needed \
								   if the tests are served on a different url to \
								   find out where to send heart beats and to \
								   submit the report etc.)'
		}
	);
});

var testRunnerBaseUri = "";
bus.on("commandlineArgumentsParsed", function (args) {
	testRunnerBaseUri = args.testRunner || "";
});

with(requireL("tasks").statusTypes) {

var tasks = [];
function updateTasks(tasks_) {
	tasks = tasks_;
}
bus.on("tasksUpdated", updateTasks);
bus.on("scheduleTasks", updateTasks);

const die = (message) => {
	console_log(message);
	console_log( "Exiting...");
	bus.triggerRequestStopApplication({value: 1});
}

const constructTaskUri = (task) => {
	var taskUri = testRunnerBaseUri + task.uri;

	if(/[?]/.test(taskUri)) {
		taskUri += "&";
	} else {
		taskUri += "?";
	}

	taskUri += ["name="+task.name, "workerId="+task.workerId, "swarmURL="+connectServerUri].join("&");

	return taskUri;
};

bus.on("registerConnectModules", function(connectApp) {
	connectApp.use('/get-task', query());
	connectApp.use('/get-task', function(request, response, next) {
		var task = tasks.find((task) => task.status === SCHEDULED);

		if(!connectServerUri) {
			die("Error: connectServerUri (swarmURL) is not yet known!");
		}

		if(task) {
			task.status = PICKED_UP;
			task.workerId = request.query.workerId;

			response.writeHead(307, {
				Location: constructTaskUri(task),
			});
			response.write('');
		} else {
			response.writeHead(200, {});
			response.write('\
				<html>\n\
					<head>\n\
						<title>nextSWARM</title>\n\
						<meta http-equiv="refresh" content="5" />\n\
					</head>\n\
					<body style="font-family: sans">\n\
						No more tasks.\n\
					</body>\n\
				</html>'
			);
		}

		response.end();
	});
});

var connectServerUri;
bus.on("connectServerStarted", function(connectServer) {
	connectServerUri = connectServer.uri;
});

} // with tasks.statusTypes
