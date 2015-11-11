var _ = require('underscore-node');
// @TODO move to monkeypatch-array module
Array.prototype.flatten = function() {return _.flatten(this)};

var os = require('os');
var exec = require('child_process').exec;

var bus = require("hermes-bus");

var numSlaves = 1;
bus.on("registerCommandlineArguments", function (parser) {
	parser.addArgument(
		['-s', '--slaves'],
		{
			dest: 'numSlaves',
			metavar: 'NUM',
			help: 'Specify a how many slaves to start.'
		}
	);
});

bus.on("commandlineArgumentsParsed", function (args) {
	numSlaves = args.numSlaves || numSlaves;
});

function startSlaves(serverAddress) {
	_.range(numSlaves).forEach(function() {
		var command = "docker run next-swarm-slave "+serverAddress;
		console.log(command);
		exec(command);
	});
}

var localIpAddress = "127.0.0.1";

bus.on("applicationStarted", function() {
	var firstNonLocalNetworkConfig = _.values(os.networkInterfaces()).flatten().find((e) => e.address !== "127.0.0.1" && e.address !== "::1" );

	if(firstNonLocalNetworkConfig) {
		localIpAddress = firstNonLocalNetworkConfig.address;
	} else {
		console.error("Error: Unable to determine public ip address of this host!");
		console.error("Exiting...");
		bus.triggerRequestStopApplication({value: 1});
	}
});

bus.on("connectServerStarted", function(connectServer) {
	startSlaves("http://"+localIpAddress+":"+connectServer.address().port);
});
