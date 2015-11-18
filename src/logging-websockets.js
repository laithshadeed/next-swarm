var sprintf=require("sprintf-js").sprintf;
var _ = require('underscore-node');
var bus = require("hermes-bus");

// Retain a local cache of what was logged to the dashboard and console,
// so that, even if a web client connects later, it will still show all
// relevant past messages.
var logAreas = {
	dashboard: [],
	console: [],
};
var supportedLogAreaNames = Object.keys(logAreas);

bus.on("logMessage", function(loggerId, message){
	if(_.contains(supportedLogAreaNames, loggerId)) {
		logAreas[loggerId].push.apply(logAreas[loggerId], message.split(/\n/));
	}
});

bus.on("logReset", function(loggerId){
	if(_.contains(supportedLogAreaNames, loggerId)) {
		logAreas[loggerId] = [];
	}
});

// Adds a link to the web client reporting page
bus.on("logReset", function(loggerId){
	if(loggerId === "dashboard" && localConnectServerUri) {
		bus.triggerLogMessage("dashboard", "\033[H" + sprintf("%"+process.stdout.columns+"s", "Interactive log also available at: "+localConnectServerUri+"/report-task-status/"));
	}
});

// @TODO remove duplicate code
var localIpAddress = "127.0.0.1";

bus.on("applicationStarted", function() {
	var firstNonLocalNetworkConfig = _.values(os.networkInterfaces()).flatten().find((e) => e.address !== "127.0.0.1" && e.address !== "::1" );

	if(firstNonLocalNetworkConfig) {
		localIpAddress = firstNonLocalNetworkConfig.address;
	} else {
		console_log("Error: Unable to determine public ip address of this host!");
		console_log( "Exiting...");
		bus.triggerRequestStopApplication({value: 1});
	}
});

var os = require('os');
var localConnectServerUri;
bus.on("connectServerStarted", function(connectServer) {
	localConnectServerUri = "http://"+localIpAddress+":"+connectServer.address().port;
});

var WebSocketServer = require('ws').Server;

var wss = new WebSocketServer({port: 3001});

wss.on('connection', function(ws) {
	var send = function(busMessageId, args) {
		ws.send(JSON.stringify({busMessageId: busMessageId, arguments: args}));
	};

	["logMessage", "logReset"].forEach(function(busMessageId) {
		bus.on(busMessageId, function() {
			send(busMessageId, _.toArray(arguments));
		});
	});

	supportedLogAreaNames.forEach(function(logAreaName) {
		logAreas[logAreaName].forEach(function(logEntry) {
			send("logMessage", [logAreaName, logEntry]);
		});
	});
});
