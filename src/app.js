var finalhandler = require('finalhandler')
var http = require('http')
var serveIndex = require('serve-index')
var serveStatic = require('serve-static')
var serveCachedStatic = require('connect-static')

// Serve directory indexes for public/ftp folder (with icons)
var index = serveIndex('public', {'icons': true})

// Serve up public/ftp folder files
//var serve = serveStatic('public')

serveCachedStatic({}, function (err, serve) {
	if (err) {
		throw err;
	}

	// Create server
	var server = http.createServer(function onRequest(req, res) {
		var done = finalhandler(req, res)
		serve(req, res, function onNext(err) {
			if (err) {
				return done(err)
			}
			index(req, res, done)
		})
	})

	// Listen
	server.listen(3000)
});
