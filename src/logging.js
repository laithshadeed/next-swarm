var _ = require('underscore-node');

var bus = require("hermes-bus");

// workaround for the missing '.publish' on hermes-bus:
bus.on("logMessage", function(loggerId, message){});
bus.on("logReset", function(loggerId){});

module.exports = {
	logger: function(loggerId) {
		var logger = function(message) {
			bus.triggerLogMessage(loggerId, _.toArray(arguments).join(" "));
		};
		var reset = function() {
			bus.triggerLogReset(loggerId);
		};

		Object.defineProperty(logger, "reset", {
			get: function() {
				return reset;
			}
		});

		return logger;
	},
};
