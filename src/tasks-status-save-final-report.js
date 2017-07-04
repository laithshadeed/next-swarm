var bus = require("hermes-bus");
var fs = require('fs')

var requireL = require("root-require")("./src/require-local.js");
const {
	APPLICATION_STOPPED_WITH_NO_ERRORS,
	COMPLETED_WITHOUT_FAILING_TESTS,
	COMPLETED_WITH_FAILING_TESTS,
} = requireL("exitcodes");

bus.on("registerCommandlineArguments", function (parser) {
	parser.addArgument(
		['--write-report'],
		{
			dest: 'outputReportFile',
			metavar: 'FILE',
			help: 'Write a final report to the specified file.'
		}
	);
});

var reportFile;
bus.on("commandlineArgumentsParsed", function (args) {
	reportFile = args.outputReportFile;
});

var tasks = [];
function updateTasks(tasks_) {
	tasks = tasks_;
}
bus.on("tasksUpdated", updateTasks);
bus.on("scheduleTasks", updateTasks);

bus.on("requestStopApplication", function(exitCodeReference) {
	const shouldWriteOn = (exitCode) =>
		exitCode === APPLICATION_STOPPED_WITH_NO_ERRORS ||
		exitCode === COMPLETED_WITHOUT_FAILING_TESTS ||
		exitCode === COMPLETED_WITH_FAILING_TESTS ||
		exitCode === undefined
	;
	if(reportFile && shouldWriteOn(exitCodeReference.value)) {
		fs.writeFileSync(reportFile, tasks.toString());
	}
});
