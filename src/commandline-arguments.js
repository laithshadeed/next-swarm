var _require = require('root-require');
var pjson = _require('./package.json');
var ArgumentParser = require('argparse').ArgumentParser;

var bus = require("hermes-bus");

bus.on("applicationStarting", function() {
	var parser = new ArgumentParser({
		version: pjson.version,
		addHelp: true,
		description: pjson.description
	});

	bus.triggerRegisterCommandlineArguments(parser);

	var args = parser.parseArgs();

	bus.triggerCommandlineArgumentsParsed(args);
});

