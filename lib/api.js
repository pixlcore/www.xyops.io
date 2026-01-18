// xyOps.io App API

// var os = require('os');
// var pkg = require('../package.json');
var fs = require('fs');
var Tools = require('pixl-tools');
var PixlRequest = require('pixl-request');

module.exports = {
	
	startup: function(callback) {
		// A worker child is starting up
		this.request = new PixlRequest( "xyOps Marketplace v1" );
		this.request.setTimeout( 30 * 1000 );
		this.request.setFollow( 5 );
		this.request.setAutoError( true );
		this.request.setKeepAlive( true );
		
		callback();
	},
	
	handler: function(args, callback) {
		// route to named handler
		var matches = args.request.url.match(/^\/api\/(\w+)/);
		if (!matches) return callback({ code: 'api', description: "Unsupported API" });
		
		var func = 'handler_' + matches[1];
		if (!this[func]) return callback({ code: 'api', description: "Unsupported API" });
		
		this[func](args, callback);
	},
	
	handler_signup: function(args, callback) {
		// Send JSON response
		var params = args.params;
		var email = '' + params.email;
		if (!email || !email.match(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
			return callback({ code: 'api', description: "Please enter a valid email address." });
		}
		
		var stub = { email, ips: args.ips, date: Date.now() / 1000 };
		this.logDebug(2, "Got Signup!", stub);
		fs.appendFileSync( 'logs/xyops-signups.txt', JSON.stringify(stub) + "\n" );
		
		callback({ code: 0 });
	},
	
	shutdown: function(callback) {
		// Worker child is shutting down
		callback();
	}
	
};
