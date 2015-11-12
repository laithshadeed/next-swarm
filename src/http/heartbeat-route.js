var requireL = require("root-require")("./src/require-local.js");
var query = require("connect-query");

var bus = require("hermes-bus");

// workaround for the missing '.publish' on hermes-bus:
bus.on("heartbeatReceived", function(){});

bus.on("registerConnectModules", function(connectApp) {
	connectApp.use('/heartbeat', query());
	connectApp.use('/heartbeat', function(request, response, next) {
		bus.triggerHeartbeatReceived(request.query.workerId);

		response.writeHead(200, {});
		response.write('Thank you.');
		response.end();
	});
});
