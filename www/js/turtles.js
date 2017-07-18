const DEBUG = true;
const INTERVAL = 50;
const ROTATION_SPEED = 5;
const ARENA_MARGIN = 30;

function Game(arenaId, w, h, socket){
	this.fingers = []; //Fingers (other than the local finger)
	this.localFinger = null;
	this.bigFinger = null;
	this.width = w;
	this.height = h;
	this.$arena = $(arenaId);
	this.$arena.css('width', w);
	this.$arena.css('height', h);
	this.turtle = null;
	this.socket = socket;

	var g = this;
	setInterval(function(){
		g.mainLoop();
	}, INTERVAL);
}

Game.prototype = {

	addTurtle: function(id, x, y, hp){
		this.turtle = new Turtle(id, this.$arena, this, x, y, hp);
	},

	addFinger: function(){
		var f = new Finger(id, position, angle, this.turtle, this.$arena, this, isLocal);
		if(isLocal){
			this.localFinger = f;
			this.bigFinger = new Bigfinger(f);
		}else{
			this.fingers.push(f);
		}
	},

	mainLoop: function(){
		if(this.localTurtle != undefined){
			//move local turtle
			this.turtle.move();
		}
	},

	sendData: function(){
		//Send local data to server
		var gameData = {};

		//Send finger data
		var f = {
			name: this.localFinger.name,
			position: this.localFinger.position,
			angle: this.localFinger.angle
		};
		gameData.finger = f;
		this.socket.emit('sync', gameData);
	},

	receiveData: function(serverData){
		var game = this;

		serverData.fingers.forEach( function(serverFinger){

			// //Update local turtle stats
			// if(game.localTurtle !== undefined && serverTurtle.id == game.localTurtle.id){
			// 	game.localTurtle.hp = serverTurtle.hp;
			// 	if(game.localTurtle.hp <= 0){
			// 		game.killTurtle(game.localTurtle);
			// 	}
			// }

			//Update foreign turtles
			var found = false;
			game.fingers.forEach( function(clientFinger){
				//update foreign turtles
				if(clientFinger.name == serverFinger.name){
					clientFinger.position = serverFinger.position;
					clientTurtle.angle = serverFinger.angle;
					// if(clientTurtle.hp <= 0){
					// 	game.killTurtle(clientTurtle);
					// }
					clientFinger.refresh();
					found = true;
				}
			});
			if(!found &&
				(game.localFinger == undefined || serverFinger.name != game.localFinger.name)){
				//I need to create it
				game.addFinger(serverFinger.name, serverFinger.position, serverFinger.angle, false);
			}
		});
	}
}

function BigFinger(f){
	this.angle = f.angle;
}

BigFinger.prototype = {

}

function Turtle(id, type, $arena, game, isLocal, x, y, hp){
	this.id = id;
	this.type = type;
	this.speed = 5;
	this.$arena = $arena;
	this.w = 60;
	this.h = 80;
	this.baseAngle = 0;//getRandomInt(0, 360);
	//Make multiple of rotation amount
	this.baseAngle -= (this.baseAngle % ROTATION_SPEED);
	this.finAngle = 0;
	//this.finPos = [0,0,0,0];
	this.x = x;
	this.y = y;
	this.mx = null;
	this.my = null;
	this.dir = {
		up: false,
		down: false,
		left: false,
		right: false
	};
	this.game = game;
	this.isLocal = isLocal;
	this.hp = hp;
	this.dead = false;

	this.materialize();
}

Turtle.prototype = {

	materialize: function(){
		this.$arena.append('<div id="' + this.id + '" class="turtle turtle' + this.type + '"></div>');
		this.$body = $('#' + this.id);
		this.$body.css('width', this.w);
		this.$body.css('height', this.h);

		this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-moz-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-o-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('transform', 'rotateZ(' + this.baseAngle + 'deg)');

		this.$arena.append('<div id="big-fin-' + this.id + '" class="big-fin"></div>');
		this.$bigFin = $('#big-fin-' + this.id);

		this.$body.append('<div id="fin-' + 'tl-' + this.id + '" class="fin fin-tl"></div>');
		this.$finTL = $('#fin-' + 'tl-' + this.id);

		this.$body.append('<div id="fin-' + 'tr-' + this.id + '" class="fin fin-tr"></div>');
		this.$finTR = $('#fin-' + 'tr-' + this.id);

		this.$body.append('<div id="fin-' + 'bl-' + this.id + '" class="fin fin-bl"></div>');
		this.$finBL = $('#fin-' + 'bl-' + this.id);

		this.$body.append('<div id="fin-' + 'br-' + this.id + '" class="fin fin-br"></div>');
		this.$finBR = $('#fin-' + 'br-' + this.id);

		this.$arena.append('<div id="info-' + this.id + '" class="info"></div>');
		this.$info = $('#info-' + this.id);
		this.$info.append('<div class="label">' + this.id + '</div>');
		this.$info.append('<div class="hp-bar"></div>');

		this.refresh();

		if(this.isLocal){
			this.setControls();
		}
	},

	isMoving: function(){
		return this.dir.up || this.dir.down || this.dir.left || this.dir.right;
	},

	refresh: function(){
		this.$body.css('left', this.x - 30 + 'px');
		this.$body.css('top', this.y - 40 + 'px');
		this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-moz-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-o-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('transform', 'rotateZ(' + this.baseAngle + 'deg)');

		var finAbsAngle = this.finAngle;// - this.baseAngle;
		this.$bigFin.css('-webkit-transform', 'rotateZ(' + finAbsAngle + 'deg)');
		this.$bigFin.css('-moz-transform', 'rotateZ(' + finAbsAngle + 'deg)');
		this.$bigFin.css('-o-transform', 'rotateZ(' + finAbsAngle + 'deg)');
		this.$bigFin.css('transform', 'rotateZ(' + finAbsAngle + 'deg)');

		this.$info.css('left', (this.x) + 'px');
		this.$info.css('top', (this.y) + 'px');
		if(this.isMoving()){
			this.$info.addClass('fade');
		}else{
			this.$info.removeClass('fade');
		}

		this.$info.find('.hp-bar').css('width', this.hp + 'px');
		this.$info.find('.hp-bar').css('background-color', getGreenToRed(this.hp));
	},

	setControls: function(){
		var t = this;
		$(document).mousemove( function(e){ //Detect mouse for pointing finger
			t.mx = e.pageX - t.$arena.offset().left;
			t.setFinAngle();
		});

	},

	move: function(){
		if(this.dead){
			return;
		}

		this.setFinAngle();
		//aggregate fin values to get base speed and rotation

		var moveX = 0;//Math.cos(radians(this.finAngle));
		var moveY = Math.sin(radians(this.finAngle));

		moveX = this.speed * moveX;
		moveY = this.speed * moveY;

		if(this.x + moveX > (0 + ARENA_MARGIN) && (this.x + moveX) < (this.$arena.width() - ARENA_MARGIN)){
			this.x += moveX;
		}
		if(this.y + moveY > (0 + ARENA_MARGIN) && (this.y + moveY) < (this.$arena.height() - ARENA_MARGIN)){
			this.y += moveY;
		}
		//this.rotateBase();
		
		this.refresh();
	},

	setFinAngle: function(){
		// if 0 is strait up, finger should move from -90 to 90
		let domain = [0, this.game.width];
		let range = [-90, 90];
		this.finAngle = scale(this.mx, domain, range);
	}

}

function Finger(name, position, angle, turtle, game, isLocal) {
	this.name = name;
	this.position = position;
	this.angle = 0;
	//Make multiple of rotation amount
	//this.baseAngle -= (this.baseAngle % ROTATION_SPEED);
	//this.game = game;
	this.turtle = turtle;
	this.isLocal = isLocal;

	this.materialize();
}

Finger.prototype = {

	materialize: function(){

		// this.$arena.append('<div id="big-fin-' + this.id + '" class="big-fin"></div>');
		// this.$bigFin = $('#big-fin-' + this.id);

		this.turtle.$body.append('<div id="fin-' + this.position + '-' + this.id + '" class="fin fin-' + this.position + '"></div>');
		this.$fin = $('#fin-' + this.position + '-' + this.name);

		this.refresh();

		if(this.isLocal){
			this.setControls();
		}
	},

	refresh: function(){
		this.$fin.css('-webkit-transform', 'rotateZ(' + this.angle + 'deg)');
		this.$fin.css('-moz-transform', 'rotateZ(' + this.angle + 'deg)');
		this.$fin.css('-o-transform', 'rotateZ(' + this.angle + 'deg)');
		this.$fin.css('transform', 'rotateZ(' + this.angle + 'deg)');
	},

	setControls: function(){
		var t = this;
		$(document).mousemove( function(e){ //Detect mouse for pointing finger
			t.mx = e.pageX - t.turtle.$arena.offset().left;
			t.setFinAngle();
		});

	},

	move: function(){
		if(this.dead){
			return;
		}

		this.setFinAngle();
		//aggregate fin values to get base speed and rotation

		var moveX = 0;//Math.cos(radians(this.finAngle));
		var moveY = Math.sin(radians(this.finAngle));

		moveX = this.speed * moveX;
		moveY = this.speed * moveY;

		if(this.x + moveX > (0 + ARENA_MARGIN) && (this.x + moveX) < (this.$arena.width() - ARENA_MARGIN)){
			this.x += moveX;
		}
		if(this.y + moveY > (0 + ARENA_MARGIN) && (this.y + moveY) < (this.$arena.height() - ARENA_MARGIN)){
			this.y += moveY;
		}
		//this.rotateBase();
		
		this.refresh();
	},

	setFinAngle: function(){
		// if 0 is strait up, finger should move from -90 to 90
		let domain = [0, this.game.width];
		let range = [-90, 90];
		this.finAngle = scale(this.mx, domain, range);
	}

}

function debug(msg){
	if(DEBUG){
		console.log(msg);
	}
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

function getGreenToRed(percent){
	r = percent<50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
	g = percent>50 ? 255 : Math.floor((percent*2)*255/100);
	return 'rgb('+r+','+g+',0)';
}

function scale(input, domain, range) {
	let clamped = input <= domain[0] ? domain[0] : input >= domain[1] ? domain[1] : input;
	let percent = (clamped - domain[0]) / (domain[1] - domain[0]);
	return percent * (range[1] - range[0]) + range[0];
}

function radians(degrees){
	return degrees * Math.PI / 180;
}
