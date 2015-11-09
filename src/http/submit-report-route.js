var requireL = require("root-require")("./src/require-local.js");
var getHostname = requireL("http/http-util").getHostname;
var bodyParser = require('body-parser');
var bus = require("hermes-bus");

with(requireL("tasks").statusTypes) {

var tasks = [];

bus.on("scheduleTasks", function(tasks2) {
	tasks = tasks2;
});

bus.on("registerConnectModules", function(connectApp) {
	connectApp.use('/submit-report', bodyParser.json());
	connectApp.use('/submit-report', function(request, response, next) {
		getHostname(request, function(hostname) {
			var report = request.body;
			var task = tasks.find((task) => task.name === report.name);
			task.completed = true;
			task.status = (report.fail+report.error) === 0 ? SUCCESS : FAILED;
			task.report = report;

			// @TODO put in separate module
			bus.triggerReportTasks(tasks);

			var allTasksCompleted = tasks.every((task) => task.completed);
			if(allTasksCompleted) {
				bus.triggerRequestStopConnectServer();
			}
		});

		response.writeHead(200, {});
		response.write('Thank you.');
		response.end();
	});
});

} // with tasks.statusTypes
