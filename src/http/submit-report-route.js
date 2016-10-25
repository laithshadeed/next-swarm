var requireL = require("root-require")("./src/require-local.js");
var bodyParser = require('body-parser');
var bus = require("hermes-bus");
var cors = require('cors');
var orElse = requireL("utils").orElse;

with(requireL("tasks").statusTypes) {

var tasks = [];

bus.on("scheduleTasks", function(tasks2) {
	tasks = tasks2;
});

bus.on("registerConnectModules", function(connectApp) {
	connectApp.use('/submit-report', cors());
	connectApp.use('/submit-report', bodyParser.json());
	connectApp.use('/submit-report', function(request, response, next) {
		var report = request.body;
		console.log("qetqetqet", tasks.toString(), report, report.name);
		var task = tasks.find((task) => task.name === report.name);
		task.completed = true;
		var numFailed = orElse(report.fail, 0);
		var numErrors = orElse(report.error, 0);
		task.status = (numFailed+numErrors) === 0 ? SUCCESS : FAILED;
		task.report = report;

		response.writeHead(200, {});
		response.write('Thank you.');
		response.end();
	});
});

} // with tasks.statusTypes
