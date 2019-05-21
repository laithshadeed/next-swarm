var requireL = require("root-require")("./src/require-local.js");
var console_log = requireL("logging").logger("console");

var _ = require('underscore-node');
var serverIpAddress = "";

// @TODO move to monkeypatch-array module
Array.prototype.flatten = function() {return _.flatten(this)};

var exec = require('child_process').exec;
var bus = require("hermes-bus");
// 3 MB of stdout buffer (@TODO we should use a ring-buffer)
var MAX_STDOUT_BUFFER = {maxBuffer: 3000 * 1024};

var numSlaves = 1;
var dockerSlaveImageId = 'next-swarm-slave';
var dockerSlaveTimeout = 30;
var dockerSlaveOptions = "";
bus.on("registerCommandlineArguments", function (parser) {
	parser.addArgument(
		['-s', '--slaves'],
		{
			dest: 'numSlaves',
			metavar: 'NUM',
			help: 'Specify a how many slaves to start.'
		}
	);
	parser.addArgument(
		['--docker-slave-image-id'],
		{
			dest: 'dockerSlaveImageId',
			metavar: 'ID',
			help: 'The slave image id that docker uses to run a slave (default: \'next-swarm-slave\').'
		}
	);
	parser.addArgument(
		['--docker-slave-timeout'],
		{
			dest: 'dockerSlaveTimeout',
			metavar: 'SEC',
			help: 'The allowed maximum number of seconds between two consecutive heartbeats before next-swarm considers the slave lost.'
		}
	);
	parser.addArgument(
		['--docker-slave-options'],
		{
			dest: 'dockerSlaveOptions',
			metavar: 'OPTIONS',
			help: 'Additional options passed to docker when starting slaves.'
		}
	);
});

bus.on("commandlineArgumentsParsed", function (args) {
	numSlaves = args.numSlaves || numSlaves;
	dockerSlaveImageId = args.dockerSlaveImageId || dockerSlaveImageId;

	// Explicit loose equality check
	dockerSlaveTimeout = args.dockerSlaveTimeout != undefined ? args.dockerSlaveTimeout : dockerSlaveTimeout;
	dockerSlaveOptions = args.dockerSlaveOptions != undefined ? args.dockerSlaveOptions : dockerSlaveOptions;
});

with(requireL("tasks").statusTypes) {

var tasks = [];

bus.on("scheduleTasks", function(tasks2) {
	tasks = tasks2;
});

// maximum time since last heartbeat before we consider the slave lost
var getSlaveMaxTimeout = function() {
	return dockerSlaveTimeout*1000;
}

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
//		console_log("Checking slaves:", JSON.stringify(monitoredSlaves, null, 4));
		var now = Date.now();
		monitoredSlaves.forEach(function(slave) {

			if((now - slave.timeOfLastHeartBeat) > getSlaveMaxTimeout()) {
				console_log("slave " + slave.workerId + " seems lost, restarting");
				restartSlave(slave.workerId);
				var task = tasks.find((task) => task.name === slave.taskName);

				if(task && !task.completed) {
					if(task.numRecoveryRunsLeft > 0){
						task.status = SCHEDULED;
						task.workerId = "<unknown>";
						task.numRecoveryRunsLeft -= 1;
					} else {
						task.status = FAILED;
						task.completed = true;
						console_log("Task: "+ task.name +" reached max numOfRecoveryRuns!");
					}
				}
			}
		});
	}, SLAVE_SANITY_CHECK_INTERVAL);
};

bus.on("taskUpdated", function(task) {
	if(task.workerId !== "<unknown>") {
		if(task.completed) {
			unmonitorSlave(task.workerId);
		} else if(task.status === PICKED_UP) {
			if(task.numRecoveryRunsLeft == undefined) {
				task.defineProperty("numRecoveryRunsLeft", 3);
			}

			monitorSlave(task);
		}
	}
});

bus.on("heartbeatReceived", function(workerId) {
	console_log("Heartbeat received from", workerId);

	var monitoredSlave = findSlave(workerId);
	if(monitoredSlave) {
		monitoredSlave.timeOfLastHeartBeat = Date.now();
	}
});

function restartSlave(workerId) {
	console_log("Restarting slave", workerId);

	unmonitorSlave(workerId);
	var command = "docker stop --time=3 " + workerId;
	exec(command, MAX_STDOUT_BUFFER, function (error) {
		if (error) {
			console_log("FAILED to kill container", workerId, error);
		}
	});
	//For some reason this fails to start the docker container ????
	startSlave(serverIpAddress);
}

function findSlave(workerId) {
	return monitoredSlaves.find((slave) => slave.workerId === workerId);
}

function monitorSlave(taskThatSlaveIsRunning) {
	var monitoredSlave = findSlave(taskThatSlaveIsRunning.workerId);
	if(!monitoredSlave) {
		monitoredSlaves.push({
			workerId: taskThatSlaveIsRunning.workerId,
			timeOfLastHeartBeat: Date.now(),
			taskName: taskThatSlaveIsRunning.name,
		});

		if(!isMonitoringSlaves) {
			startMonitoringSlaves();
		}
	}
}

function unmonitorSlave(workerId) {
	var monitoredSlave = findSlave(workerId);
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

var SIGKILL = 137;
var SIGTERM = 143;
function startSlave(serverAddress){
	console_log("Booting-up a docker container...");
	var command = "docker run --rm " + dockerSlaveOptions + " " + dockerSlaveImageId + " " + serverAddress;
	exec(command, MAX_STDOUT_BUFFER, function(error){
		if(error && !(error.code === SIGKILL || error.code == SIGTERM)) {
			console_log("Failed to boot-up a slave:", error);
			bus.triggerRequestStopApplication({value: 1});
		}
	});
}

} // with tasks.statusTypes

bus.on("connectServerStarted", function(connectServer) {
	startSlaves(connectServer.uri);
});
