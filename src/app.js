var connect = require('connect')
var http = require('http');
var serveIndex = require('serve-index');
var serveNonCachedStatic = require('serve-static');
var serveCachedStatic = require('connect-static');
var pjson = require('root-require')('./package.json');
var ArgumentParser = require('argparse').ArgumentParser;
var bodyParser = require('body-parser');

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

function setupServer(serveStatic) {
	// Setup connect
	var app = connect();

	// @TODO crawl for tests
	var tasks = ["/awf/test/awf.communication.test.js", "/awf/test/awf.core.test.js"];

	app.use('/get-task', function(request, response, next) {
		var testRunnerBaseUri = "/common/test-framework/src/test-runners/test.html?testFiles=";

		if(tasks.length) {
			response.writeHead(307, {
				Location: testRunnerBaseUri + tasks[0],
			});
			tasks = tasks.slice(1);
			response.write('');
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

	app.use('/report', bodyParser.json());
	app.use('/report', function(request, response, next) {
		console.log('report request: ', request.body, request.body.fail);
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

	console.info("Started listening at port 3000");
}
