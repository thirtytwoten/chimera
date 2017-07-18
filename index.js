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
}

GameServer.prototype = {

	addTurtle: function(turtle){
		this.turtles.push(turtle);
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
				turtle.finAngle = newTurtleData.finAngle;
			}
		});
	},

	//Detect if ball collides with any turtle
	// detectCollision: function(ball){
	// 	var self = this;

	// 	this.turtles.forEach( function(turtle){
	// 		if(turtle.id != ball.ownerId
	// 			&& Math.abs(turtle.x - ball.x) < 30
	// 			&& Math.abs(turtle.y - ball.y) < 30){
	// 			//Hit turtle
	// 			self.hurtTurtle(turtle);
	// 			ball.out = true;
	// 			ball.exploding = true;
	// 		}
	// 	});
	// },

	hurtTurtle: function(turtle){
		turtle.hp -= 2;
	},

	getData: function(){
		var gameData = {};
		gameData.turtles = this.turtles;
		return gameData;
	},

	cleanDeadTurtles: function(){
		this.turtles = this.turtles.filter(function(t){
			return t.hp > 0;
		});
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
		//Broadcast data to clients
		client.emit('sync', game.getData());
		client.broadcast.emit('sync', game.getData());

		counter ++;
	});

	client.on('leaveGame', function(turtleId){
		console.log(turtleId + ' has left the game');
		game.removeTurtle(turtleId);
		client.broadcast.emit('removeTurtle', turtleId);
	});

});

	// fly: function(){
	// 	//move to trajectory
	// 	var speedX = BALL_SPEED * Math.sin(this.alpha);
	// 	var speedY = -BALL_SPEED * Math.cos(this.alpha);
	// 	this.x += speedX;
	// 	this.y += speedY;
	// }

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}
