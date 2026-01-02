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
	
	handler_marketplace: function(args, callback) {
		// rudimentary marketplace placeholder API
		// params: { keywords, type, tags, sort_by, sort_dir, offset, limit }
		var marketplace = require('../marketplace.json');
		var params = args.query;
		
		if (params.id && params.readme) {
			// fetch readme
			// https://raw.githubusercontent.com/pixlcore/xyplug-stagehand/refs/tags/v1.0.9/README.md
			var item = Tools.findObject( marketplace.rows, { id: params.id } );
			if (!item) return callback({ code: 'marketplace', description: "Marketplace item not found" });
			
			var version = params.version || item.versions[0];
			var url = `https://raw.githubusercontent.com/${item.id}/refs/tags/v${version}/README.md`;
			
			this.request.get( url, function(err, resp, data, perf) {
				if (err) return callback({ code: 'marketplace', description: "Failed to fetch README: " + err });
				callback({ code: 0, data: data.toString() });
			});
			return;
		}
		else if (params.id && params.data) {
			// fetch data
			// https://raw.githubusercontent.com/pixlcore/xyplug-stagehand/refs/tags/v1.0.9/xyops.json
			var item = Tools.findObject( marketplace.rows, { id: params.id } );
			if (!item) return callback({ code: 'marketplace', description: "Marketplace item not found" });
			
			var version = params.version || item.versions[0];
			var url = `https://raw.githubusercontent.com/${item.id}/refs/tags/v${version}/xyops.json`;
			
			this.request.json( url, false, function(err, resp, data, perf) {
				if (err) return callback({ code: 'marketplace', description: "Failed to fetch data: " + err });
				callback({ code: 0, data: data });
			});
			return;
		}
		
		// apply user search filters
		var rows = marketplace.rows.filter( function(row) {
			if (params.keywords) {
				var text = [row.title, row.description, row.id, ...row.tags, ...row.requires].join(' ').toLowerCase();
				if (!text.includes(params.keywords.toLowerCase())) return false;
			}
			if (params.tags && !Tools.includesAll(item.tags, params.tags)) return false;
			if (params.requires && !Tools.includesAll(item.requires, params.requires)) return false;
			return true;
		} );
		
		// decorate with logo urls
		var final_rows = rows.map( function(item) {
			var url = `https://raw.githubusercontent.com/${item.id}/refs/heads/main/logo.png`;
			return Object.assign( {}, item, { logo: url } );
		} );
		
		callback({ code: 0, rows: final_rows, list: { length: marketplace.rows.length } });
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
