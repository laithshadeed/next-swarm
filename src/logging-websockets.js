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
