var finalhandler = require('finalhandler');
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
	console.info("Serving non-cached resources from "+publicFolder);
	serve(serveNonCachedStatic(publicFolder));
} else {
	console.info("Serving cached resources from "+publicFolder);
	serveCachedStatic({}, function (err, middleware) {
		if (err) {
			throw err;
		}
		serve(middleware)
	});
}

function serve(serve) {
	// Create server
	var server = http.createServer(function onRequest(req, res) {
		var done = finalhandler(req, res);
		serve(req, res, function onNext(err) {
			if (err) {
				return done(err);
			}
			index(req, res, done);
		})
	})

	// Listen
	server.listen(3000);

	console.info("Started listening at port 3000");
}
