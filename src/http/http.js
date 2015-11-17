var _ = require('underscore-node');

var requireL = require(__dirname+"/../require-local.js");

var connect = require('connect')
var http = require('http');

var enableDestroy = require('server-destroy');

var bus = require("hermes-bus");

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

bus.on("applicationStarted", function setupServer() {
	// Setup connect
	var app = connect();

	bus.triggerRegisterConnectModules(app);

	// Listen
	server = app.listen(3000);
	enableDestroy(server);

	bus.triggerConnectServerStarted(server);

	console.info("Started listening at port 3000");
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
			console.info("Stopping...");
			bus.triggerRequestStopApplication({value: undefined});
		});
	}, 1000);
});

module.exports = {};
