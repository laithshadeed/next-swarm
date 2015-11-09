var requireL = require("root-require")("./src/require-local.js");
var getHostname = requireL("http/http-util").getHostname;
var bus = require("hermes-bus");

bus.on("registerCommandlineArguments", function (parser) {
	parser.addArgument(
		['--test-runner'],
		{
			dest: 'testRunner',
			metavar: 'PATH',
			required: true,
			help: 'Specify the test runner path. This is the base uri path \
					at which the test runner is served. The test runner is \
					expected to handle two uri parameters: name and testFiles.'
		}
	);
});

var testRunnerBaseUri = "";
bus.on("commandlineArgumentsParsed", function (args) {
	testRunnerBaseUri = args.testRunner || "";
});

with(requireL("tasks").statusTypes) {

var tasks = [];

bus.on("scheduleTasks", function(tasks2) {
	tasks = tasks2;
});

bus.on("registerConnectModules", function(connectApp) {
	connectApp.use('/get-task', function(request, response, next) {
		var task = tasks.find((task) => task.status === SCHEDULED);

		if(task) {
			task.status = PICKED_UP;
			task.workerId = "Pending...";

			// @TODO put in separate module
			bus.triggerReportTasks(tasks);

			response.writeHead(307, {
				Location: testRunnerBaseUri + "?name="+task.name+"&testFiles="+task.testFiles,
			});
			response.write('');

			getHostname(request, function(hostname) {
				task.workerId = hostname;

				// @TODO put in separate module
				bus.triggerReportTasks(tasks);
			});
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

} // with tasks.statusTypes
