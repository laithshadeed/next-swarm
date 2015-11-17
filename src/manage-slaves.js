var requireL = require("root-require")("./src/require-local.js");
var console_log = requireL("logging").logger("console");

var _ = require('underscore-node');
var serverIpAddress = "";

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

with(requireL("tasks").statusTypes) {

var tasks = [];

bus.on("scheduleTasks", function(tasks2) {
	tasks = tasks2;
});

// maximum time since last heartbeat before we consider the slave lost
var SLAVE_MAX_TIMEOUT=30*1000;
// interval at which we check if a slave was lost
var SLAVE_SANITY_CHECK_INTERVAL= 1000;
// slave looks like: {workerId: "docker container id", timeOfLastHeartBeat: 1447284644252, taskName: "name of task it was running"}
var monitoredSlaves = [];
/*
 * Every SLAVE_SANITY_CHECK_INTERVAL ms we check if slaves were lost,
 * when this happens:
 *
 * 1) restart the slave
 * 2) reschedule the job that the slave was supposed to run
 */
var isMonitoringSlaves = false;
var startMonitoringSlaves = function() {
	isMonitoringSlaves = true;
	setInterval(function() {
//		console_log("Checking slaves:", monitoredSlaves);
		var now = Date.now();
		monitoredSlaves.forEach(function(slave) {

			if((now - slave.timeOfLastHeartBeat) > SLAVE_MAX_TIMEOUT) {
				console_log("slave " + slave.workerId + " seems lost, restarting");
				restartSlave(slave.workerId);
				var task = tasks.find((task) => task.name === slave.taskName);

				if(task && task.numRecoveryRunsLeft > 0){
					task.status = SCHEDULED;
					task.workerId = "<unknown>";
					task.numRecoveryRunsLeft -= 1;
				} else if(task){
					task.status = FAILED;
					task.completed = true;
					console_log("Task: "+ task.name +" reached max numOfRecoveryRuns!");
				}
			}
		});
	}, SLAVE_SANITY_CHECK_INTERVAL);
};

bus.on("taskUpdated", function(task) {
	if(task.workerId !== "<unknown>") {
		if(task.completed) {
			removeSlave(task.workerId);
		} else if(task.status === PICKED_UP) {
			if(task.numRecoveryRunsLeft == undefined) {
				task.defineProperty("numRecoveryRunsLeft", 3);
			}

			monitoredSlaves.push({
				workerId: task.workerId,
				timeOfLastHeartBeat: Date.now(),
				taskName: task.name,
			});

			if(!isMonitoringSlaves) {
				startMonitoringSlaves();
			}
		}
	}
});

bus.on("heartbeatReceived", function(workerId) {
	console_log("Heartbeat received from", workerId);
});

function restartSlave(workerId) {
	console_log("Restarting slave", workerId);

	removeSlave(workerId);
	var command = "docker stop --time=3 " + workerId;
	exec(command, function (error) {
		if (error) {
			console_log("FAILED to kill container", workerId, error);
		}
	});
	//For some reason this fails to start the docker container ????
	startSlave(serverIpAddress);
}

function removeSlave(workerId) {
	var monitoredSlave = monitoredSlaves.find((slave) => slave.workerId === workerId);
	if(monitoredSlave) {
		monitoredSlaves = _.without(monitoredSlaves, monitoredSlave);
	}
};

function startSlaves(serverAddress) {
	serverIpAddress = serverAddress;
	_.range(numSlaves).forEach(function() {
		startSlave(serverAddress);
	});
}

var SIGTERM = 137;
function startSlave(serverAddress){
	console_log("Booting-up a docker container...");
	var command = "docker run next-swarm-slave " + serverAddress;
	exec(command, function(error){
		if(error && error.code !== SIGTERM){
			return console_log("Failed to boot-up a slave", error);
		}
	});
}

} // with tasks.statusTypes

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

bus.on("connectServerStarted", function(connectServer) {
	startSlaves("http://"+localIpAddress+":"+connectServer.address().port);
});
