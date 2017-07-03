var sprintf=require("sprintf-js").sprintf;
var _ = require('underscore-node');
var bus = require("hermes-bus");

var logAreas = {
	dashboard: [],
	console: [],
};
var supportedLogAreaNames = Object.keys(logAreas);

var logToVT100 = function() {
	console.log("\033c");
	console.log(logAreas.dashboard.join("\n"));
	console.log(sprintf("\n%'="+process.stdout.columns+"s\n", ""));
	console.log(logAreas.console.slice(-10).join("\n"));
};
var DEFAULT_LOG_INTERVAL_SEC = 0.04;
var throttledLogToVT100 = _.throttle(logToVT100, DEFAULT_LOG_INTERVAL_SEC * 1000);
bus.on("registerCommandlineArguments", function (parser) {
	parser.addArgument(
		['--vt100-log-refresh-interval'],
		{
			dest: 'logRefreshInterval',
			metavar: 'SEC',
			type: 'float',
			help: 'The interval with which the log output on the command line is refreshed.'
		}
	);
});
bus.on("commandlineArgumentsParsed", function (args) {
	throttledLogToVT100 = _.throttle(
		logToVT100,
		(args.logRefreshInterval || DEFAULT_LOG_INTERVAL_SEC) * 1000
	);
});

bus.on("logMessage", function(loggerId, message){
	if(_.contains(supportedLogAreaNames, loggerId)) {
		logAreas[loggerId].push.apply(logAreas[loggerId], message.split(/\n/));

		throttledLogToVT100();
	}
});

bus.on("logReset", function(loggerId){
	if(_.contains(supportedLogAreaNames, loggerId)) {
		logAreas[loggerId] = [];
	}
});
