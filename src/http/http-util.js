var _ = require('underscore-node');
var dns = require('dns');

module.exports = {
	getHostname: function(request, onResult) {
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
	},
};
