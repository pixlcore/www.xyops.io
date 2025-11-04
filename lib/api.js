// xyOps.io App API

// var os = require('os');
// var pkg = require('../package.json');
var fs = require('fs');

module.exports = {
	
	startup: function(callback) {
		// A worker child is starting up
		callback();
	},
	
	handler: function(args, callback) {
		// Send JSON response
		if (!args.request.url.match(/signup/)) return callback({ code: 'api', description: "Unsupported API" });
		
		var params = args.params;
		var email = '' + params.email;
		if (!email || !email.match(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
			return callback({ code: 'api', description: "Please enter a valid email address." });
		}
		
		var stub = { email, ips: args.ips, date: Date.now() / 1000 };
		this.logDebug(2, "Got Signup!", stub);
		fs.writeFileSync( 'logs/xyops-signups.txt', JSON.stringify(stub) + "\n" );
		
		callback({ code: 0 });
	},
	
	shutdown: function(callback) {
		// Worker child is shutting down
		callback();
	}
	
};
