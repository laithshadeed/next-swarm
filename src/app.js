var finalhandler = require('finalhandler')
var http = require('http')
var serveIndex = require('serve-index')
var serveStatic = require('serve-static')

// Serve directory indexes for public/ftp folder (with icons)
var index = serveIndex('public', {'icons': true})

// Serve up public/ftp folder files
var serve = serveStatic('public')

// Create server
var server = http.createServer(function onRequest(req, res){
  var done = finalhandler(req, res)
  serve(req, res, function onNext(err) {
    if (err) return done(err)
    index(req, res, done)
  })
})

// Listen
server.listen(3000)


//var connect = require('connect');
//var http = require('http');
//var createStatic = require('connect-static');
//var serveIndex = require('serve-index')
////var path = require('path');
//
//var app = connect();
//
//// These are all defaults. If you leave any options out, this is what they
//// will be.
//var options = {
//	dir: "public",
//	aliases: [
//		['/', '/index.html'],
//	],
//	ignoreFile: function (fullPath) {
//		return false;
////		var basename = path.basename(fullPath);
////		return /^\./.test(basename) || /~$/.test(basename);
//	},
//	followSymlinks: true,
//	cacheControlHeader: "max-age=0, must-revalidate",
//};
//
////createStatic(options, function (err, middleware) {
////	if (err) {
////		throw err;
////	}
////
////	app.use('/', middleware);
////});
//
//var index = serveIndex('foo', {'icons': true});
//app.use('/', index);
//
////create node.js http server and listen on port
//http.createServer(app).listen(3000);
