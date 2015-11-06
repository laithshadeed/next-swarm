var bus = require("hermes-bus");

var _ = require('underscore-node');

var serveIndex = require('serve-index');
var serveNonCachedStatic = require('serve-static');
var serveCachedStatic = require('connect-static');

bus.on("registerCommandlineArguments", function(parser) {
	parser.addArgument(
		['-c', '--cached'],
		{
			action: 'storeTrue',
			help: 'Serve files from in-memory cache.'
		}
	);
});

var args = {};

bus.on("commandlineArgumentsParsed", function(args2) {
	args = _.extend({}, args, args2);
});

var publicFolder = 'public';

bus.on("registerConnectModules", function(connectApp) {
	var registerStaticFilesModule = function(serveStatic) {
		connectApp.use(function(req, res, next) {
			serveStatic(req, res, function onNext(err) {
				if (err) {
					return next(err);
				}
				index(req, res, next);
			});
		});
	}

	// Serve directory indexes for public folder (with icons)
	var index = serveIndex(publicFolder, {'icons': true});

	// Serve up public folder files
	if(args.cached) {
		console.info("Serving cached resources from "+publicFolder);
		serveCachedStatic({}, function (err, middleware) {
			if (err) {
				throw err;
			}
			registerStaticFilesModule(middleware)
		});
	} else {
		console.info("Serving non-cached resources from "+publicFolder);
		registerStaticFilesModule(serveNonCachedStatic(publicFolder));
	}
});
	
module.exports = {};
