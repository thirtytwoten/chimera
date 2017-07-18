var DEBUG = true;
var INTERVAL = 50;
var ROTATION_SPEED = 5;
var ARENA_MARGIN = 30;

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
			cannonAngle: this.localTurtle.cannonAngle
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
					clientTurtle.cannonAngle = serverTurtle.cannonAngle;
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
	this.baseAngle = getRandomInt(0, 360);
	//Make multiple of rotation amount
	this.baseAngle -= (this.baseAngle % ROTATION_SPEED);
	this.cannonAngle = 0;
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

		this.$body.append('<div id="cannon-' + this.id + '" class="turtle-cannon"></div>');
		this.$cannon = $('#cannon-' + this.id);

		this.$body.append('<div id="fin-' + 'tl-' + this.id + '" class="fin fin-tl"></div>');
		this.$cannon = $('#fin-' + 'tl-' + this.id);

		this.$body.append('<div id="fin-' + 'tr-' + this.id + '" class="fin fin-tr"></div>');
		this.$cannon = $('#fin-' + 'tr-' + this.id);

		this.$body.append('<div id="fin-' + 'bl-' + this.id + '" class="fin fin-bl"></div>');
		this.$cannon = $('#fin-' + 'bl-' + this.id);

		this.$body.append('<div id="fin-' + 'br-' + this.id + '" class="fin fin-br"></div>');
		this.$cannon = $('#fin-' + 'br-' + this.id);

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

		var cannonAbsAngle = this.cannonAngle - this.baseAngle;
		this.$cannon.css('-webkit-transform', 'rotateZ(' + cannonAbsAngle + 'deg)');
		this.$cannon.css('-moz-transform', 'rotateZ(' + cannonAbsAngle + 'deg)');
		this.$cannon.css('-o-transform', 'rotateZ(' + cannonAbsAngle + 'deg)');
		this.$cannon.css('transform', 'rotateZ(' + cannonAbsAngle + 'deg)');

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

		/* Detect both keypress and keyup to allow multiple keys
		 and combined directions */
		$(document).keypress( function(e){
			var k = e.keyCode || e.which;
			switch(k){
				case 119: //W
					t.dir.up = true;
					break;
				case 100: //D
					t.dir.right = true;
					break;
				case 115: //S
					t.dir.down = true;
					break;
				case 97: //A
					t.dir.left = true;
					break;
			}

		}).keyup( function(e){
			var k = e.keyCode || e.which;
			switch(k){
				case 87: //W
					t.dir.up = false;
					break;
				case 68: //D
					t.dir.right = false;
					break;
				case 83: //S
					t.dir.down = false;
					break;
				case 65: //A
					t.dir.left = false;
					break;
			}
		}).mousemove( function(e){ //Detect mouse for aiming
			t.mx = e.pageX - t.$arena.offset().left;
			t.my = e.pageY - t.$arena.offset().top;
			t.setCannonAngle();
		}).click( function(){
			t.shoot();
		});

	},

	move: function(){
		if(this.dead){
			return;
		}

		var moveX = 0;
		var moveY = 0;

		if (this.dir.up) {
			moveY = -1;
		} else if (this.dir.down) {
			moveY = 1;
		}
		if (this.dir.left) {
			moveX = -1;
		} else if (this.dir.right) {
			moveX = 1;
		}

		moveX = this.speed * moveX;
		moveY = this.speed * moveY;

		if(this.x + moveX > (0 + ARENA_MARGIN) && (this.x + moveX) < (this.$arena.width() - ARENA_MARGIN)){
			this.x += moveX;
		}
		if(this.y + moveY > (0 + ARENA_MARGIN) && (this.y + moveY) < (this.$arena.height() - ARENA_MARGIN)){
			this.y += moveY;
		}
		this.rotateBase();
		this.setCannonAngle();
		this.refresh();
	},

	/* Rotate base of turtle to match movement direction */
	rotateBase: function(){
		if((this.dir.up && this.dir.left)
			|| (this.dir.down && this.dir.right)){ //diagonal "left"
			this.setDiagonalLeft();
		}else if((this.dir.up && this.dir.right)
			|| (this.dir.down && this.dir.left)){ //diagonal "right"
			this.setDiagonalRight();
		}else if(this.dir.up || this.dir.down){ //vertical
			this.setVertical();
		}else if(this.dir.left || this.dir.right){  //horizontal
			this.setHorizontal();
		}

	},

	/* Rotate base until it is vertical */
	setVertical: function(){
		var a = this.baseAngle;
		if(a != 0 && a != 180){
			if(a < 90 || (a > 180 && a < 270)){
				this.decreaseBaseRotation();
			}else{
				this.increaseBaseRotation();
			}
		}
	},

	/* Rotate base until it is horizontal */
	setHorizontal: function(){
		var a = this.baseAngle;
		if(a != 90 && a != 270){
			if(a < 90 || (a > 180 && a < 270)){
				this.increaseBaseRotation();
			}else{
				this.decreaseBaseRotation();
			}
		}
	},

	setDiagonalLeft: function(){
		var a = this.baseAngle;
		if(a != 135 && a != 315){
			if(a < 135 || (a > 225 && a < 315)){
				this.increaseBaseRotation();
			}else{
				this.decreaseBaseRotation();
			}
		}
	},

	setDiagonalRight: function(){
		var a = this.baseAngle;
		if(a != 45 && a != 225){
			if(a < 45 || (a > 135 && a < 225)){
				this.increaseBaseRotation();
			}else{
				this.decreaseBaseRotation();
			}
		}
	},

	increaseBaseRotation: function(){
		this.baseAngle += ROTATION_SPEED;
		if(this.baseAngle >= 360){
			this.baseAngle = 0;
		}
	},

	decreaseBaseRotation: function(){
		this.baseAngle -= ROTATION_SPEED;
		if(this.baseAngle < 0){
			this.baseAngle = 0;
		}
	},

	setCannonAngle: function(){
		var turtle = { x: this.x , y: this.y};
		var deltaX = this.mx - turtle.x;
		var deltaY = this.my - turtle.y;
		this.cannonAngle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
		this.cannonAngle += 90;
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
