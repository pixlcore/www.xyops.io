//
// Math utilities, borrowed from Effect Games
//

function _RADIANS_TO_DECIMAL(_rad) { return _rad * 180.0 / Math.PI; }
function _DECIMAL_TO_RADIANS(_dec) { return _dec * Math.PI / 180.0; }

//
// Point class
//

function Point(_newX, _newY) {
	// class constructor
	this.x = _newX ? _newX : 0;
	this.y = _newY ? _newY : 0;
};

Point.prototype.set = function() {
	// set point based on coords or object
	if (arguments.length == 1) {
		this.x = arguments[0].x;
		this.y = arguments[0].y;
	}
	else {
		this.x = arguments[0];
		this.y = arguments[1];
	}
	return this;
};

Point.prototype.offset = function() {
	// offset point based on coords or object
	if (arguments.length == 1) {
		this.x += arguments[0].x;
		this.y += arguments[0].y;
	}
	else {
		this.x += arguments[0];
		this.y += arguments[1];
	}
	return this;
};

Point.prototype.floor = function() {
	// convert x and y to ints
	this.x = Math.floor(this.x);
	this.y = Math.floor(this.y);
	return this;
};

Point.prototype.ceil = function() {
	// convert x and y to ints, rounding upward
	this.x = Math.ceil(this.x);
	this.y = Math.ceil(this.y);
	return this;
};

Point.prototype.getPointFromOffset = function() {
	// return new point from offset
	if (arguments.length == 1) {
		return new Point( this.x + arguments[0].x, this.y + arguments[0].y );
	}
	else {
		return new Point( this.x + arguments[0], this.y + arguments[1] );
	}
};

Point.prototype.getDistance = function() {
	// get distance between point and us
	var _pt;
	if (arguments.length == 1) _pt = arguments[0];
	else _pt = new Point(arguments[0], arguments[1]);
	
	if ((_pt.x == this.x) && (_pt.y == this.y)) return 0;
	return Math.sqrt( Math.pow(Math.abs(_pt.x - this.x), 2) + Math.pow(Math.abs(_pt.y - this.y), 2) );
};

Point.prototype.getAngle = function() {
	// get angle of point vs us
	var _pt;
	if (arguments.length == 1) _pt = arguments[0];
	else _pt = new Point(arguments[0], arguments[1]);
	
	if (this.x == _pt.x && this.y == _pt.y) return 0;
	
	var _side;
	var _quadrant;
	
	if (_pt.y < this.y && _pt.x >= this.x) { _quadrant = 0.0; _side = Math.abs(_pt.y - this.y); }
	else if (_pt.y < this.y && _pt.x < this.x) { _quadrant = 90.0; _side = Math.abs(_pt.x - this.x); }
	else if (_pt.y >= this.y && _pt.x < this.x) { _quadrant = 180.0; _side = Math.abs(_pt.y - this.y); }
	else { _quadrant = 270.0; _side = Math.abs(_pt.x - this.x); }
	
	var _angle = _quadrant + _RADIANS_TO_DECIMAL( Math.asin( _side / this.getDistance(_pt) ) );
	if (_angle >= 360.0) _angle -= 360.0;
	
	return _angle;
};

Point.prototype.getPointFromProjection = function(_angle, _distance) {
	// get new point projected at specified angle and distance
	return this.clone().project(_angle, _distance);
};

Point.prototype.project = function(_angle, _distance) {
	// move point projected at specified angle and distance
	_angle = _angle % 360;
	
	// these functions are not accurate at certain angles, hence the trickery:
	var _temp_cos = ((_angle == 90) || (_angle == 270)) ? 0 : Math.cos( _DECIMAL_TO_RADIANS(_angle) );
	var _temp_sin = ((_angle == 0) || (_angle == 180)) ? 0 : Math.sin( _DECIMAL_TO_RADIANS(_angle) );
	
	this.x += (_temp_cos * _distance);
	this.y -= (_temp_sin * _distance);
	return this;
};

Point.prototype.getMidPoint = function() {
	// get point halfway from us to specified point
	var _pt;
	if (arguments.length == 1) _pt = arguments[0];
	else _pt = new Point(arguments[0], arguments[1]);
	
	return new Point(
		this.x + ((_pt.x - this.x) / 2),
		this.y + ((_pt.y - this.y) / 2)
	);
};

Point.prototype.clone = function() {
	// return copy of our pt
	return new Point(this.x, this.y);
};
