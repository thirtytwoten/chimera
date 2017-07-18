const DEBUG = true;
const INTERVAL = 50;
const ROTATION_SPEED = 5;
const ARENA_MARGIN = 30;
// fin index
const TL = 0;
const TR = 1;
const BL = 2;
const BR = 3;


function Game(arenaId, w, h, socket){
	this.turtles = []; //Turtles (other than the local turtle)
	this.width = w;
	this.height = h;
	this.$arena = $(arenaId);
	this.$arena.css('width', w);
	this.$arena.css('height', h);
	this.socket = socket;

	var g = this;
	setInterval(function(){
		g.mainLoop();
	}, INTERVAL);
}

Game.prototype = {

	addTurtle: function(id, type, isLocal, x, y, hp){
		var t = new Turtle(id, type, this.$arena, this, isLocal, x, y, hp);
		if(isLocal){
			this.localTurtle = t;
		}else{
			this.turtles.push(t);
		}
	},

	removeTurtle: function(turtleId){
		//Remove turtle object
		this.turtles = this.turtles.filter( function(t){return t.id != turtleId} );
		//remove turtle from dom
		$('#' + turtleId).remove();
		$('#info-' + turtleId).remove();
	},

	killTurtle: function(turtle){
		turtle.dead = true;
		this.removeTurtle(turtle.id);
		//place explosion
		this.$arena.append('<img id="expl' + turtle.id + '" class="explosion" src="./img/explosion.gif">');
		$('#expl' + turtle.id).css('left', (turtle.x - 50)  + 'px');
		$('#expl' + turtle.id).css('top', (turtle.y - 100)  + 'px');

		setTimeout(function(){
			$('#expl' + turtle.id).remove();
		}, 1000);

	},

	mainLoop: function(){
		if(this.localTurtle != undefined){
			//send data to server about local turtle
			this.sendData();
			//move local turtle
			this.localTurtle.move();
		}
	},

	sendData: function(){
		//Send local data to server
		var gameData = {};

		//Send turtle data
		var t = {
			id: this.localTurtle.id,
			x: this.localTurtle.x,
			y: this.localTurtle.y,
			baseAngle: this.localTurtle.baseAngle,
			finAngle: this.localTurtle.finAngle
		};
		gameData.turtle = t;
		this.socket.emit('sync', gameData);
	},

	receiveData: function(serverData){
		var game = this;

		serverData.turtles.forEach( function(serverTurtle){

			//Update local turtle stats
			if(game.localTurtle !== undefined && serverTurtle.id == game.localTurtle.id){
				game.localTurtle.hp = serverTurtle.hp;
				if(game.localTurtle.hp <= 0){
					game.killTurtle(game.localTurtle);
				}
			}

			//Update foreign turtles
			var found = false;
			game.turtles.forEach( function(clientTurtle){
				//update foreign turtles
				if(clientTurtle.id == serverTurtle.id){
					clientTurtle.x = serverTurtle.x;
					clientTurtle.y = serverTurtle.y;
					clientTurtle.baseAngle = serverTurtle.baseAngle;
					clientTurtle.finAngle = serverTurtle.finAngle;
					clientTurtle.hp = serverTurtle.hp;
					if(clientTurtle.hp <= 0){
						game.killTurtle(clientTurtle);
					}
					clientTurtle.refresh();
					found = true;
				}
			});
			if(!found &&
				(game.localTurtle == undefined || serverTurtle.id != game.localTurtle.id)){
				//I need to create it
				game.addTurtle(serverTurtle.id, serverTurtle.type, false, serverTurtle.x, serverTurtle.y, serverTurtle.hp);
			}
		});
	}
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

	// increaseBaseRotation: function(){
	// 	this.baseAngle += ROTATION_SPEED;
	// 	if(this.baseAngle >= 360){
	// 		this.baseAngle = 0;
	// 	}
	// },

	// decreaseBaseRotation: function(){
	// 	this.baseAngle -= ROTATION_SPEED;
	// 	if(this.baseAngle < 0){
	// 		this.baseAngle = 0;
	// 	}
	// },

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