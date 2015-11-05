var connect = require('connect')
var http = require('http');
var serveIndex = require('serve-index');
var serveNonCachedStatic = require('serve-static');
var serveCachedStatic = require('connect-static');
var pjson = require('root-require')('./package.json');
var ArgumentParser = require('argparse').ArgumentParser;

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
