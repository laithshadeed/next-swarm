var _ = require('underscore-node');

var projectRootRequire = require("root-require");

module.exports = function(id0, id1, idN) {
	return _.last(Array.prototype.slice.call(arguments, 0).map(function(id) {
		return projectRootRequire("./src/"+id+".js");
	}));
};
