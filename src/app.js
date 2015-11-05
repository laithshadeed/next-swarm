var _ = require('underscore-node');
var connect = require('connect')
var http = require('http');
var enableDestroy = require('server-destroy');
var serveIndex = require('serve-index');
var serveNonCachedStatic = require('serve-static');
var serveCachedStatic = require('connect-static');
var pjson = require('root-require')('./package.json');
var ArgumentParser = require('argparse').ArgumentParser;
var bodyParser = require('body-parser');
var dns = require('dns');

var parser = new ArgumentParser({
	version: pjson.version,
	addHelp: true,
	description: pjson.description
});

parser.addArgument(
	['-c', '--cached'],
	{
		action: 'storeTrue',
		help: 'Serve files from in-memory cache.'
	}
);

var args = parser.parseArgs();

var publicFolder = 'public';

// Serve directory indexes for public folder (with icons)
var index = serveIndex(publicFolder, {'icons': true});

// Serve up public folder files
if(args.cached) {
	console.info("Serving cached resources from "+publicFolder);
	serveCachedStatic({}, function (err, middleware) {
		if (err) {
			throw err;
		}
		setupServer(middleware)
	});
} else {
	console.info("Serving non-cached resources from "+publicFolder);
	setupServer(serveNonCachedStatic(publicFolder));
}

function reportTasks(tasks) {
	console.log(tasks);
	console.log("");
}

function setupServer(serveStatic) {
	// Setup connect
	var app = connect();

	// @TODO crawl for tests
	var SCHEDULED = "Scheduled...";
	var PICKED_UP = "Picked up.";
	var RUNNING   = "Running...";
	var FAILED    = "Failed!";
	var SUCCESS   = "Success!";
	var testFiles = ["/awf/test/awf.communication.test.js", "/awf/test/awf.core.test.js"];
	var tasks = testFiles.map(function(testFile) {
		return {
			workerId:  undefined,
			testFile:  testFile,
			status:    SCHEDULED,
			completed: false,
			report: {
				fail:  undefined,
				error: undefined,
				total: undefined,
			}
		};
	});

	reportTasks(tasks);

	var getHostname = function(request, onResult) {
		var ip = request.headers['x-forwarded-for'] ||
				 request.connection.remoteAddress ||
				 request.socket.remoteAddress ||
				 request.connection.socket.remoteAddress;

		dns.reverse(ip, function(err, domains) {
			if(err) {
				console.log(err.toString());
			}
			onResult(_.first(domains));
		});
	}

	app.use('/get-task', function(request, response, next) {
		var testRunnerBaseUri = "/common/test-framework/src/test-runners/test.html?testFiles=";
		var task = tasks.find((task) => task.status === SCHEDULED);

		if(task) {
			task.status = PICKED_UP;
			task.workerId = "Pending...";
			reportTasks(tasks);
			response.writeHead(307, {
				Location: testRunnerBaseUri + task.testFile,
			});
			response.write('');

			getHostname(request, function(hostname) {
				task.workerId = hostname;
				reportTasks(tasks);
			});
		} else {
			response.writeHead(200, {});
			response.write('\
				<html>\n\
					<head>\n\
						<title>nextSWARM</title>\n\
						<meta http-equiv="refresh" content="5" />\n\
					</head>\n\
					<body style="font-family: sans">\n\
						No more tasks.\n\
					</body>\n\
				</html>'
			);
		}

		response.end();
	});

	var getHostname = function(request, onResult) {
		var ip = request.headers['x-forwarded-for'] ||
				 request.connection.remoteAddress ||
				 request.socket.remoteAddress ||
				 request.connection.socket.remoteAddress;

		dns.reverse(ip, function(err, domains) {
			if(err) {
				console.log(err.toString());
			}
			onResult(_.first(domains));
		});
	};

	app.use('/report', bodyParser.json());
	app.use('/report', function(request, response, next) {
		getHostname(request, function(hostname) {
			var report = request.body;
			var task = tasks.find((task) => task.testFile === report.test);
			task.completed = true;
			task.status = (report.fail+report.error) === 0 ? SUCCESS : FAILED;
			task.report = report;

			reportTasks(tasks);

			var allTasksCompleted = tasks.every((task) => task.completed);
			if(allTasksCompleted) {
				setTimeout(function() {
					console.info("Stopping...");
					server.destroy(function() {
						console.info("Stopped.");
						var exitCode = tasks.every((task) => task.status === SUCCESS) ? 0 : 1;
						process.exit(exitCode);
					});
				}, 1000);
			}
		});

		response.writeHead(200, {});
		response.write('Thank you.');
		response.end();
	});

	app.use(function(req, res, next) {
		serveStatic(req, res, function onNext(err) {
			if (err) {
				return next(err);
			}
			index(req, res, next);
		});
	});

	// Listen
	var server = app.listen(3000);
	enableDestroy(server);

	console.info("Started listening at port 3000");
}
