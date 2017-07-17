var express = require('express');
var app = express();
var counter = 0;
var BALL_SPEED = 10;
var WIDTH = 1100;
var HEIGHT = 580;
var TANK_INIT_HP = 100;

//Static resources server
app.use(express.static(__dirname + '/www'));

var server = app.listen(process.env.PORT || 8082, function () {
	var port = server.address().port;
	console.log('Server running at port %s', port);
});

var io = require('socket.io')(server);

function GameServer(){
	this.turtles = [];
	this.balls = [];
	this.lastBallId = 0;
}

GameServer.prototype = {

	addTurtle: function(turtle){
		this.turtles.push(turtle);
	},

	addBall: function(ball){
		this.balls.push(ball);
	},

	removeTurtle: function(turtleId){
		//Remove turtle object
		this.turtles = this.turtles.filter( function(t){return t.id != turtleId} );
	},

	//Sync turtle with new data received from a client
	syncTurtle: function(newTurtleData){
		this.turtles.forEach( function(turtle){
			if(turtle.id == newTurtleData.id){
				turtle.x = newTurtleData.x;
				turtle.y = newTurtleData.y;
				turtle.baseAngle = newTurtleData.baseAngle;
				turtle.cannonAngle = newTurtleData.cannonAngle;
			}
		});
	},

	//The app has absolute control of the balls and their movement
	syncBalls: function(){
		var self = this;
		//Detect when ball is out of bounds
		this.balls.forEach( function(ball){
			self.detectCollision(ball);

			if(ball.x < 0 || ball.x > WIDTH
				|| ball.y < 0 || ball.y > HEIGHT){
				ball.out = true;
			}else{
				ball.fly();
			}
		});
	},

	//Detect if ball collides with any turtle
	detectCollision: function(ball){
		var self = this;

		this.turtles.forEach( function(turtle){
			if(turtle.id != ball.ownerId
				&& Math.abs(turtle.x - ball.x) < 30
				&& Math.abs(turtle.y - ball.y) < 30){
				//Hit turtle
				self.hurtTurtle(turtle);
				ball.out = true;
				ball.exploding = true;
			}
		});
	},

	hurtTurtle: function(turtle){
		turtle.hp -= 2;
	},

	getData: function(){
		var gameData = {};
		gameData.turtles = this.turtles;
		gameData.balls = this.balls;

		return gameData;
	},

	cleanDeadTurtles: function(){
		this.turtles = this.turtles.filter(function(t){
			return t.hp > 0;
		});
	},

	cleanDeadBalls: function(){
		this.balls = this.balls.filter(function(ball){
			return !ball.out;
		});
	},

	increaseLastBallId: function(){
		this.lastBallId ++;
		if(this.lastBallId > 1000){
			this.lastBallId = 0;
		}
	}

}

var game = new GameServer();

/* Connection events */

io.on('connection', function(client) {
	console.log('User connected');

	client.on('joinGame', function(turtle){
		console.log(turtle.id + ' joined the game');
		var initX = getRandomInt(40, 900);
		var initY = getRandomInt(40, 500);
		client.emit('addTurtle', { id: turtle.id, type: turtle.type, isLocal: true, x: initX, y: initY, hp: TANK_INIT_HP });
		client.broadcast.emit('addTurtle', { id: turtle.id, type: turtle.type, isLocal: false, x: initX, y: initY, hp: TANK_INIT_HP} );

		game.addTurtle({ id: turtle.id, type: turtle.type, hp: TANK_INIT_HP});
	});

	client.on('sync', function(data){
		//Receive data from clients
		if(data.turtle != undefined){
			game.syncTurtle(data.turtle);
		}
		//update ball positions
		game.syncBalls();
		//Broadcast data to clients
		client.emit('sync', game.getData());
		client.broadcast.emit('sync', game.getData());

		//I do the cleanup after sending data, so the clients know
		//when the turtle dies and when the balls explode
		game.cleanDeadTurtles();
		game.cleanDeadBalls();
		counter ++;
	});

	client.on('shoot', function(ball){
		var ball = new Ball(ball.ownerId, ball.alpha, ball.x, ball.y );
		game.addBall(ball);
	});

	client.on('leaveGame', function(turtleId){
		console.log(turtleId + ' has left the game');
		game.removeTurtle(turtleId);
		client.broadcast.emit('removeTurtle', turtleId);
	});

});

function Ball(ownerId, alpha, x, y){
	this.id = game.lastBallId;
	game.increaseLastBallId();
	this.ownerId = ownerId;
	this.alpha = alpha; //angle of shot in radians
	this.x = x;
	this.y = y;
	this.out = false;
};

Ball.prototype = {

	fly: function(){
		//move to trajectory
		var speedX = BALL_SPEED * Math.sin(this.alpha);
		var speedY = -BALL_SPEED * Math.cos(this.alpha);
		this.x += speedX;
		this.y += speedY;
	}

}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}
