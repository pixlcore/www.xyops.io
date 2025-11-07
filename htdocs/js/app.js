var app = {
	
	slideBaseURL: "images/screenshots",
	slides: [
		{ url: "workflow-2.webp" },
		{ url: "server-pies.webp" },
		{ url: "server-dashboard.webp" },
		{ url: "job-procs.webp" },
		{ url: "job-perf-metrics.webp" },
		{ url: "workflow-edit.webp" },
		{ url: "server-quickmon.webp" }
	],
	
	"chart_defaults": {
		"lineWidth": 2,
		"lineJoin": "round",
		"lineCap": "butt",
		"stroke": true,
		"fill": 0.5,
		"horizTicks": 6,
		"vertTicks": 6,
		"smoothingMaxSamples": 100,
		"smoothingMaxTotalSamples": 2000,
		hoverSort: -1,
		clip: true
	},
	
	base_api_url: '/api',
	
	init() {
		var dot_width = 18;
		$('.ss_dot_container').css('margin-left', '-' + Math.floor( this.slides.length * (dot_width / 2) ) + 'px');
		
		this.slides.forEach( function(slide, idx) {
			var $dot = $('<div/>').addClass('ss_dot').on('mousedown', function() {
				app.setSlide(idx);
			});
			$('.ss_dot_container').append( $dot );
			slide.$dot = $dot;
			
			var $img = $('<img>').addClass('ss_img').attr('src', app.slideBaseURL + '/' + slide.url).on('mousedown', function() {
				app.nextSlide();
			});
			$('.screenshot').append( $img );
			slide.$img = $img;
		} );
		
		this.setSlide(0);
		
		// starting pulse animation to draw attention to dots
		$('.ss_dot').each( function(idx) {
			var $this = $(this);
			if ($this.hasClass('active')) return;
			setTimeout( function() { $this.addClass('pulse'); }, 750 + (idx * 150) );
		} );
		
		this.setupCharts();
		
		$('#email').keypress( function(event) {
			if (event.keyCode == '13') { // enter key
				event.preventDefault();
				app.signUp();
			}
		} );
		
		window.addEventListener( "keydown", function(event) {
			app.handleKeyDown(event);
		}, false );
		
		// ensure tick is called exactly once per second, 50ms precision
		var last_sec = time_now();
		setInterval( function() {
			var now = time_now();
			
			// catch-up seconds if the browser throttled our timer
			while (last_sec < now) {
				last_sec++;
				app.tick(last_sec);
			}
			
		}, 50 );
		
		// ship game
		this.ship = {
			elem: $('#ship')[0],
			flame: $('#flame')[0],
			x: 0,
			y: 0,
			head: new Point(),
			tail: new Point(),
			thrust: 0,
			thrustMax: 6
		};
		this.ship.style = this.ship.elem.style;
		
		this.vingette = $('.vingette')[0];
		$('.vingette').on('pointermove', this.moveShip.bind(this));
	},
	
	scrollTo(sel) {
		// smooth scroll to selector
		$(sel)[0].scrollIntoView({ behavior: "smooth", block: "center" });
	},
	
	moveShip(event) {
		var ship = this.ship;
		var bounds = this.vingette.getBoundingClientRect();
		
		// joe's taildragger algorithm, from effect games, circa 2009
		ship.head.set( event.clientX - bounds.left, event.clientY - bounds.top );
		ship.tail = ship.head.getPointFromProjection( ship.head.getAngle(ship.tail), 48 );
		var pt = ship.head.getMidPoint( ship.tail );
		pt.offset( -24, -24 );
		
		// calculate thrust based on movement
		ship.thrust = pt.getDistance( new Point(ship.x, ship.y) );
		if (ship.thrust > ship.thrustMax) ship.thrust = ship.thrustMax;
		ship.flame.style.opacity = ship.thrust / ship.thrustMax;
		
		ship.x = pt.x;
		ship.y = pt.y;
		
		var rotate = 360 - (ship.tail.getAngle(ship.head) - 90);
		rotate -= 45; // ship sprite is baked at 45deg
		
		if (rotate < 0) rotate += 360;
		else if (rotate >= 360) rotate -= 360;
		
		// offsets from hot point
		var x = ship.head.x - 43;
		var y = ship.head.y - 5;
		
		ship.style.left = '' + x + 'px';
		ship.style.top = '' + y + 'px';
		ship.style.transform = 'rotate(' + rotate + 'deg)';
	},
	
	startGame() {
		// user closed signup dialog, let's play!
		this.game = true;
		
		var $cont = $('.vingette');
		$cont.addClass('game');
		
		$('body').addClass('game');
		
		$('.dialog.inline').remove();
		$('form').remove();
		$('.hero, .features, .detail_section').remove();
		
		window.scrollTo( 0, 9999 );
	},
	
	setSlide(idx) {
		var slide = this.slides[idx];
		
		$('.ss_dot, .ss_img').removeClass('active pulse');
		slide.$dot.addClass('active');
		slide.$img.addClass('active');
		
		this.currentSlideIdx = idx;
	},
	
	nextSlide() {
		this.currentSlideIdx++;
		if (this.currentSlideIdx >= this.slides.length) this.currentSlideIdx -= this.slides.length;
		this.setSlide( this.currentSlideIdx );
	},
	
	prevSlide() {
		this.currentSlideIdx--;
		if (this.currentSlideIdx < 0) this.currentSlideIdx += this.slides.length;
		this.setSlide( this.currentSlideIdx );
	},
	
	handleKeyDown: function(event) {
		// send keydown event to page if text element isn't current focused
		if (document.activeElement && document.activeElement.tagName.match(/^(INPUT|TEXTAREA)$/)) return;
		
		switch (event.key) {
			case 'ArrowRight': this.nextSlide(); break;
			case 'ArrowLeft': this.prevSlide(); break;
		}
	},
	
	setupCharts() {
		this.maxServers = 25;
		this.serverAddInterval = 5;
		this.maxSamples = 63;
		this.servers = [];
		this.charts = {};
		
		this.charts.cpu = this.createChart({
			"canvas": '#c_live_cpu',
			"title": "CPU Usage %",
			"dataType": "float",
			"dataSuffix": "%",
			"fill": false,
			"legend": false,
			minVertScale: 100,
			titleColor: getCSSVar('theme-color')
		});
		
		this.charts.mem = this.createChart({
			"canvas": '#c_live_mem',
			"title": "Memory Usage",
			"dataType": "bytes",
			"dataSuffix": "",
			"fill": false,
			"legend": false,
			minVertScale: 1024 * 1024 * 1024,
			titleColor: getCSSVar('green')
		});
		
		this.setupCustomHeadroom('cpu');
		this.setupCustomHeadroom('mem');
		
		this.heartbeats = {
			cpu: createPerlin({ min: -50, max: 50, kind: 'smooth' }),
			mem: createPerlin({ min: 1024 * 1024 * -250, max: 1024 * 1024 * 250, kind: 'smooth' })
		};
		
		var now = time_now();
		var then = now - 60;
		
		for (var idx = 0; idx < 10; idx++) {
			this.addServer(then);
		}
		
		this.lastCPUAlert = 0;
		this.lastCPUSpike = now - 15;
		this.lastMemDip = now - 30;
		this.lastServerAdded = 0;
		
		while (then < now) {
			this.lastServerAdded = then;
			this.tick(then++);
		}
		
		this.animate();
	},
	
	setupCustomHeadroom(id) {
		// add custom function for smoothly animating headroom (yMax)
		var chart = this.charts[id];
		if (!chart) return;
		
		var yMaxTarget = false;
		var yMaxCurrent = false;
		
		chart.customHeadroom = function() {
			// called during draw cycle, just after calculating limits
			var limits = chart.dataLimits;
			if (yMaxTarget === false) { yMaxTarget = yMaxCurrent = limits.yMax; return; }
			
			yMaxTarget = limits.yMax;
			yMaxCurrent = yMaxCurrent + ((yMaxTarget - yMaxCurrent) / 8);
			if (Math.abs(yMaxTarget - yMaxCurrent) < 1.0) yMaxCurrent = yMaxTarget;
			
			limits.yMax = Math.floor( yMaxCurrent );
		};
	},
	
	createChart(opts) {
		// merge opts with overrides and add user locale, return new chart
		opts.reducedMotion = true; // app.reducedMotion();
		return new Chart( Object.assign({ dirty: true }, this.chart_defaults, opts) );
	},
	
	addServer(now) {
		if (this.servers.length >= this.maxServers) return;
		var server = {
			hostname: 'server.' + get_short_id('', 8) + '.prod',
			created: now,
			ramps: {
				cpu: 2 + (Math.random() * 30),
				mem: 2 + (Math.random() * 15)
			},
			
			perlin: {
				cpu: createPerlin({ min: 0, max: 100, kind: 'smooth' }),
				mem: createPerlin({ min: 1024 * 1024 * 768, max: 1024 * 1024 * 1024, kind: 'smooth' })
			}
		};
		this.servers.push(server);
		
		for (var key in this.charts) {
			var chart = this.charts[key];
			chart.addLayer({ title: server.hostname, data: [] });
		}
		
		// this.toast({ type: 'info', icon: 'information-outline', msg: "New server added to cluster: " + server.hostname, lifetime: 4 });
	},
	
	tick(now) {
		// called every 1s
		// add new "server", and add new samples to all servers
		if (this.game) return;
		
		var self = this;
		
		if ((now - this.lastServerAdded >= this.serverAddInterval) && this.charts.cpu.isVisible()) {
			this.lastServerAdded = now;
			this.addServer(now);
		}
		
		if (now - this.lastCPUSpike >= 35) {
			this.lastCPUSpike = now;
			this.cpuSpike = {
				idx: Math.floor( Math.random() * this.servers.length ),
				created: now,
				ramp: 2 + (Math.random() * 15),
				delta: 25 + (Math.random() * 25)
			};
		}
		if (now - this.lastMemDip >= 45) {
			this.lastMemDip = now;
			this.memDip = {
				idx: Math.floor( Math.random() * this.servers.length ),
				created: now,
				ramp: 2 + (Math.random() * 20),
				delta: -134217728 - (Math.random() * 1024 * 1024 * 400)
			};
		}
		
		this.servers.forEach( function(server, idx) {
			for (var key in self.charts) {
				var chart = self.charts[key];
				var sample = { x: now + 1, y: 0 };
				var y = server.perlin[key].noise1Dfbm(now) + self.heartbeats[key].noise1Dfbm(now);
				
				if ((now - server.created) < server.ramps[key]) {
					y = tween( 0, y, ((now - server.created) / server.ramps[key]), 'EaseInOut', 'Quadratic' );
				}
				
				if (key == 'cpu') {
					if (self.cpuSpike && (self.cpuSpike.idx == idx)) {
						var spike = self.cpuSpike;
						if (now - spike.created < spike.ramp) {
							// ramp up
							y += tween( 0, spike.delta, ((now - spike.created) / spike.ramp), 'EaseInOut', 'Quadratic' );
						}
						else if (now - spike.created < spike.ramp * 2) {
							// ramp down
							y += tween( 0, spike.delta, 1.0 - (((now - spike.created) - spike.ramp) / spike.ramp), 'EaseInOut', 'Quadratic' );
						}
						else {
							// end
							delete self.cpuSpike;
						}
					} // spike
					
					if ((y >= 80) && (now - self.lastCPUAlert > 15)) {
						self.lastCPUAlert = now;
						sample.label = {
							"text": "Alert",
							"color": "red",
							"tooltip": true
						};
					}
					
					y = Math.min(100, y);
				} // cpu
				
				else if (key == 'mem') {
					if (self.memDip && (self.memDip.idx == idx)) {
						var dip = self.memDip;
						if (now - dip.created < dip.ramp) {
							// ramp up
							y += tween( 0, dip.delta, ((now - dip.created) / dip.ramp), 'EaseInOut', 'Quadratic' );
						}
						else if (now - dip.created < dip.ramp * 2) {
							// ramp down
							y += tween( 0, dip.delta, 1.0 - (((now - dip.created) - dip.ramp) / dip.ramp), 'EaseInOut', 'Quadratic' );
						}
						else {
							// end
							delete self.memDip;
						}
					} // dip
					
					y = Math.max(0, y);
				} // mem
				
				sample.y = y;
				chart.addLayerSample( idx, sample, self.maxSamples );
			}
		});
	},
	
	animate() {
		// animate quickmon charts
		if (this.game) return;
		
		var self = this;
		var now = hires_time_now();
		this.raf = false;
		
		for (var key in this.charts) {
			var chart = this.charts[key];
			chart.zoom = { xMin: now - 61, xMax: now - 1 };
			chart.dirty = true;
		};
		
		ChartManager.check();
		this.raf = requestAnimationFrame( this.animate.bind(this) );
	},
	
	toast: function(args) {
		// show toast notification given raw html
		var { type, icon, msg, lifetime, loc } = args;
		
		var html = '';
		html += '<div class="toast ' + type + '" style="display:none">';
			html += '<i class="mdi mdi-' + icon + '"></i>';
			html += '<span>' + msg + '</span>';
		html += '</div>';
		
		var $toast = $(html);
		var timer = null;
		$('#toaster').append( $toast );
		
		$toast.fadeIn(250);
		$toast.on('click', function() {
			if (timer) clearTimeout(timer);
			$toast.fadeOut( 250, function() { $(this).remove(); } );
			if (loc) Nav.go(loc);
		} );
		
		if ((type == 'success') || (type == 'info') || lifetime) {
			if (!lifetime) lifetime = 8;
			timer = setTimeout( function() {
				$toast.fadeOut( 500, function() { $(this).remove(); } );
			}, lifetime * 1000 );
		}
	},
	
	doError: function(msg) {
		// show an error message at the top of the screen
		// and hide the progress dialog if applicable
		this.showMessage( 'error', msg, 0 );
		return null;
	},
	
	badField: function(id, msg) {
		// mark field as bad
		if (id.match(/^\w+$/)) id = '#' + id;
		var $elem = $(id);
		
		if ($elem[0] && ($elem[0].nodeName == 'SELECT') && $elem.next().hasClass('multiselect')) {
			$elem = $elem.next();
		}
		
		$elem.removeClass('invalid').width(); // trigger reflow to reset css animation
		$elem.addClass('invalid');
		try { $elem.focus(); } catch (e) {;}
		
		if (msg) return this.doError(msg);
		else return false;
	},
	
	clearError: function() {
		// clear last error
		$('div.toast.error').remove();
		$('.invalid').removeClass('invalid');
	},
	
	showMessage: function(type, msg, lifetime, loc) {
		// show success, warning or error message
		// Dialog.hide();
		var icon = '';
		switch (type) {
			case 'success': icon = 'check-circle'; break;
			case 'warning': icon = 'alert-circle'; break;
			case 'error': icon = 'alert-decagram'; break;
			case 'info': icon = 'information-outline'; break;
			
			default:
				if (type.match(/^(\w+)\/(.+)$/)) { type = RegExp.$1; icon = RegExp.$2; }
			break;
		}
		
		this.toast({ type, icon, msg, lifetime, loc });
	},
	
	signUp() {
		// yay an interested visitor!
		this.clearError();
		
		var address = $('#email').val();
		if (!address) return this.badField('email', "Please enter your email address.");
		if (!address.match(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) return this.badField('email', "Please enter a valid email address.");
		
		// prevent double-click
		if (this.progress) return;
		this.progress = true;
		
		var $dialog = $('.dialog.inline');
		var $button = $dialog.find('.button.primary');
		
		$button.addClass('pulse');
		$dialog.removeClass('scrollin');
		
		// api call
		this.api.post( 'signup', { email: address }, function(resp) {
			// trigger dom reflow and fix height
			$dialog.css('height', $dialog[0].offsetHeight);
			
			// swap out content with thank you message
			$dialog.html( `
				<div class="dialog_thank">
					<div class="thank_icon" onClick="app.confettiParty({origin:this})"><i class="mdi mdi-check-circle"></i></div>
					<div class="thank_title">Thank you!</div>
					<div class="thank_msg">We'll let you know when xyOps drops!</div>
				</div>
			` );
			
			// celebrate!
			app.confettiParty();
			delete app.progress;
		}, 
		function(json) {
			app.doError("API Error: " + json.description);
			delete app.progress;
		} ); // api.post
	},
	
	confetti(args) {
		// augment confetti with origin element (optional)
		if (!args) args = {};
		
		if (args.origin && args.origin.jquery) args.origin = args.origin.get(0);
		if (args.origin && args.origin.getBoundingClientRect) {
			// center confetti emitter on selected DOM element
			var rect = args.origin.getBoundingClientRect();
			var x = (rect.left + (rect.width / 2)) / window.innerWidth;
			var y = (rect.top + (rect.height / 2)) / window.innerHeight;
			args.origin = { x, y };
		}
		
		confetti(args);
	},
	
	confettiParty(args = {}) {
		// yay!
		var count = 200;
		var defaults = {
			origin: { y: 0.7 },
			...args
		};
		
		function fire(particleRatio, opts) {
			app.confetti({
				...defaults,
				...opts,
				particleCount: Math.floor(count * particleRatio)
			});
		};
		
		fire(0.25, {
			spread: 26,
			startVelocity: 55,
		});
		fire(0.2, {
			spread: 60,
		});
		fire(0.35, {
			spread: 100,
			decay: 0.91,
			scalar: 0.8
		});
		fire(0.1, {
			spread: 120,
			startVelocity: 25,
			decay: 0.92,
			scalar: 1.2
		});
		fire(0.1, {
			spread: 120,
			startVelocity: 45,
		});
	},
	
	api: {
		
		fake: function(cmd, data, callback, errorCallback) {
			// fake an api call for testing purposes
			setTimeout( function() { 
				callback({ code: 0 }); 
			}, 250 );
		},
		
		request: function(url, opts, callback, errorCallback) {
			// send HTTP GET to API endpoint
			// Debug.trace('api', "Sending API request: " + url );
			
			// default 10 sec timeout
			var timeout = opts.timeout || 10000;
			delete opts.timeout;
			
			// retry delay (w/exp backoff)
			var retryDelay = opts.retryDelay || 100;
			delete opts.retryDelay;
			
			var timed_out = false;
			var timer = setTimeout( function() {
				timed_out = true;
				timer = null;
				var err = new Error("Timeout");
				// Debug.trace('api', "HTTP Error: " + err);
				
				if (errorCallback) errorCallback({ code: 'http', description: '' + (err.message || err) });
				else app.doError( "HTTP Error: " + err.message || err );
			}, timeout );
			
			window.fetch( url, opts )
				.then( function(res) {
					if (timer) { clearTimeout(timer); timer = null; }
					if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);
					return res.json();
				} )
				.then(function(json) {
					// got response
					if (timed_out) return;
					if (timer) { clearTimeout(timer); timer = null; }
					var text = JSON.stringify(json);
					if (text.length > 8192) text = "(" + text.length + " bytes)";
					// Debug.trace('api', "API Response: " + text );
					
					// use setTimeout to avoid insanity with the stupid fetch promise
					setTimeout( function() {
						if (('code' in json) && (json.code != 0)) {
							// an error occurred within the JSON response
							// session errors are handled specially
							if (errorCallback) errorCallback(json);
							else app.doError("API Error: " + json.description);
						}
						else if (callback) callback( json );
					}, 1 );
				} )
				.catch( function(err) {
					// HTTP error
					if (timed_out) return;
					if (timer) { clearTimeout(timer); timer = null; }
					// Debug.trace('api', "HTTP Error: " + err);
					
					// retry network errors
					if (err instanceof TypeError) {
						retryDelay = Math.min( retryDelay * 2, 8000 );
						// Debug.trace('api', `Retrying network error in ${retryDelay}ms...`);
						setTimeout( function() { app.api.request(url, { ...opts, timeout, retryDelay }, callback, errorCallback); }, retryDelay );
						return;
					}
					
					if (errorCallback) errorCallback({ code: 'http', description: '' + (err.message || err) });
					else app.doError( err.message || err );
				} );
		}, // api.request
		
		post: function(cmd, data, callback, errorCallback) {
			// send HTTP POST to API endpoint
			var url = cmd;
			if (!url.match(/^(\w+\:\/\/|\/)/)) url = app.base_api_url + "/" + cmd;
			
			var json_raw = JSON.stringify(data);
			// Debug.trace( 'api', "Sending HTTP POST to: " + url + ": " + json_raw );
			
			app.api.request( url, {
				method: "POST",
				headers: {
					"Content-Type": app.plain_text_post ? 'text/plain' : 'application/json',
				},
				body: json_raw
			}, callback, errorCallback );
		}, // api.post
		
		upload: function(cmd, data, callback, errorCallback) {
			// send FormData to API endpoint
			var url = cmd;
			if (!url.match(/^(\w+\:\/\/|\/)/)) url = app.base_api_url + "/" + cmd;
			
			// Debug.trace( 'api', "Uploading files to: " + url );
			
			app.api.request( url, {
				method: "POST",
				body: data,
				timeout: 300 * 1000 // 5 minutes
			}, callback, errorCallback );
		}, // api.post
		
		get: function(cmd, query, callback, errorCallback) {
			// send HTTP GET to API endpoint
			var url = cmd;
			if (!url.match(/^(\w+\:\/\/|\/)/)) url = app.base_api_url + "/" + cmd;
			
			if (!query) query = {};
			if (app.cacheBust) query.cachebust = app.cacheBust;
			url += compose_query_string(query);
			
			// Debug.trace( 'api', "Sending HTTP GET to: " + url );
			app.api.request( url, {}, callback, errorCallback );
		} // api.get
		
	} // api
	
}; // app

function time_now() {
	// return the Epoch seconds for like right now
	return Math.floor( Date.now() / 1000 );
};

function hires_time_now() {
	// return the Epoch seconds for like right now
	return Date.now() / 1000;
};

function zeroPad(value, len) {
	// Pad a number with zeroes to achieve a desired total length (max 10)
	return ('0000000000' + value).slice(0 - len);
};

const EASE_ALGOS = {
	Linear: function(_amount) { return _amount; },
	Quadratic: function(_amount) { return Math.pow(_amount, 2); },
	Cubic: function(_amount) { return Math.pow(_amount, 3); },
	Quartetic: function(_amount) { return Math.pow(_amount, 4); },
	Quintic: function(_amount) { return Math.pow(_amount, 5); },
	Sine: function(_amount) { return 1 - Math.sin((1 - _amount) * Math.PI / 2); },
	Circular: function(_amount) { return 1 - Math.sin(Math.acos(_amount)); }
};

const EASE_MODES = {
	EaseIn: function(_amount, _algo) { return EASE_ALGOS[_algo](_amount); },
	EaseOut: function(_amount, _algo) { return 1 - EASE_ALGOS[_algo](1 - _amount); },
	EaseInOut: function(_amount, _algo) {
		return (_amount <= 0.5) ? EASE_ALGOS[_algo](2 * _amount) / 2 : (2 - EASE_ALGOS[_algo](2 * (1 - _amount))) / 2;
	}
};

function clamp(val, min, max) {
	// simple math clamp implementation
	return Math.max(min, Math.min(max, val));
};

function tween(start, end, amount, mode, algo) {
	// Calculate the "tween" (value between two other values) using a variety of algorithms.
	// Useful for computing positions for animation frames.
	// Omit mode and algo for 'lerp' (simple linear interpolation).
	if (!mode) mode = 'EaseOut';
	if (!algo) algo = 'Linear';
	amount = clamp( amount, 0.0, 1.0 );
	return start + (EASE_MODES[mode]( amount, algo ) * (end - start));
};

function get_short_id(prefix = '', len = 10) {
	// Get unique ID using crypto, lower-case only
	var id = '';
	var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	while (id.length < len) {
		id += chars[ crypto.getRandomValues(new Uint32Array(1))[0] % chars.length ];
	}
	return prefix + id;
};

function getCSSVar(key) {
	if (!key.match(/^\-\-/)) key = '--' + key;
	return getComputedStyle(document.body).getPropertyValue(key).trim();
};

app.init();
