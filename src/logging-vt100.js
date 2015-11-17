var sprintf=require("sprintf-js").sprintf;
var _ = require('underscore-node');
var bus = require("hermes-bus");

var logAreas = {
	dashboard: [],
	console: [],
};
var supportedLogAreaNames = Object.keys(logAreas);

bus.on("logMessage", function(loggerId, message){
	if(_.contains(supportedLogAreaNames, loggerId)) {
		logAreas[loggerId].push.apply(logAreas[loggerId], message.split(/\n/));

		console.log("\033c");
		console.log(logAreas.dashboard.join("\n"));
		console.log(sprintf("\n%'="+process.stdout.columns+"s\n", ""));
		console.log(logAreas.console.slice(-10).join("\n"));
	}
});

bus.on("logReset", function(loggerId){
	if(_.contains(supportedLogAreaNames, loggerId)) {
		logAreas[loggerId] = [];
	}
});
