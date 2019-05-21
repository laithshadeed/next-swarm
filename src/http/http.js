var _ = require('underscore-node');

var requireL = require("root-require")("./src/require-local.js");
var console_log = requireL("logging").logger("console");

var connect = require('connect')
var http = require('http');

var enableDestroy = require('server-destroy');

var bus = require("hermes-bus");

const {ERROR_DURING_APPLICATION_START} = requireL("exitcodes");

requireL(
	"http/get-task-route",
	"http/submit-report-route",
	"http/heartbeat-route",
	"http/static-files-route"
);

// workaround for the missing '.publish' on hermes-bus:
bus.on("connectServerStarted", function(){});

// Initial server is a stub.
var server = {
	destroy: function(){},
};

var os = require('os');
var publicIpAddress = "127.0.0.1";
bus.on("applicationStarted", function determinePublicAddress() {
	var firstNonLocalNetworkConfig = _.values(os.networkInterfaces()).flatten().find((e) => e.address !== "127.0.0.1" && e.address !== "::1" );

	if(firstNonLocalNetworkConfig) {
		publicIpAddress = firstNonLocalNetworkConfig.address;
	} else {
		console_log("Error: Unable to determine public ip address of this host!");
		console_log( "Exiting...");
		bus.triggerRequestStopApplication({value: ERROR_DURING_APPLICATION_START});
	}
});

bus.on("applicationStarted", function setupServer() {
	// Setup connect
	var app = connect();

	bus.triggerRegisterConnectModules(app);

	// Generate random port between 3000 -> 6000 until we package next-swarm as docker container
	var port = Math.floor(3000 * (Math.random() + 1));
	var connectServerUri = "http://"+publicIpAddress+":"+port;

	// Listen
	server = app.listen(port);
	enableDestroy(server);

	server.uri = connectServerUri;

	bus.triggerConnectServerStarted(server);

	console_log("Started listening at port " + port);
});

bus.on("tasksUpdated", function(task) {
	var allTasksCompleted = tasks.every((task) => task.completed);
	if(allTasksCompleted) {
		bus.triggerRequestStopConnectServer();
	}
});

bus.on("requestStopConnectServer", function() {
	setTimeout(function() {
		server.destroy(function() {
			// We don't know an exit code, but rely on the fact
			// that somebody does:)
			console_log("Stopping...");
			bus.triggerRequestStopApplication({value: undefined});
		});
	}, 1000);
});

module.exports = {};
