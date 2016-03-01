var bus = require("hermes-bus");
var fs = require('fs')

bus.on("registerCommandlineArguments", function (parser) {
	parser.addArgument(
		['--write-report'],
		{
			dest: 'reportFile',
			metavar: 'FILE',
			help: 'Write a final report to the specified file.'
		}
	);
});

var reportFile;
bus.on("commandlineArgumentsParsed", function (args) {
	reportFile = args.reportFile;
});

var tasks = [];
function updateTasks(tasks_) {
	tasks = tasks_;
}
bus.on("tasksUpdated", updateTasks);
bus.on("scheduleTasks", updateTasks);

bus.on("requestStopApplication", function() {
	if(reportFile) {
		fs.writeFileSync(reportFile, tasks.toString());//JSON.stringify(tasks, undefined, '\t'));
	}
});
