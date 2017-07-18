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
	this.fingers = [];
}

GameServer.prototype = {

	addFinger: function(finger){
		this.fingers.push(finger);
	},

	removeFinger: function(fingerName){
		//Remove finger object
		this.fingers = this.fingers.filter( function(f){return f.name != fingerName} );
	},

	//Sync finger with new data received from a client
	syncFinger: function(newFingerData){
		this.fingers.forEach( function(finger){
			if(finger.name == newFingerData.name){
				finger.position = newFingerData.position;
				finger.angle = newFingerData.angle;
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
		gameData.fingers = this.fingers;
		return gameData;
	},

	cleanDeadTurtles: function(){
		this.turtles = this.turtles.filter(function(t){
			return t.hp > 0;
		});
	}

}

var game = new GameServer();
game.addTurtle({ id: 'turtle', x: 0, y: 0, hp: TANK_INIT_HP});

/* Connection events */

io.on('connection', function(client) {
	console.log('User connected');

	client.on('joinGame', function(finger){
		console.log(finger.name + ' joined the game');
		client.emit('addFinger', { name: finger.name, position: finger.position, angle: finger.angle, isLocal: true } );
		client.broadcast.emit('addFinger', { id: finger.id, position: finger.position, angle: finger.angle, isLocal: false} );
		// var initX = getRandomInt(40, 900);
		// var initY = getRandomInt(40, 500);
		//client.emit('addTurtle', { id: turtle.id, type: turtle.type, isLocal: true, x: initX, y: initY, hp: TANK_INIT_HP });
		//client.broadcast.emit('addTurtle', { id: turtle.id, type: turtle.type, isLocal: false, x: initX, y: initY, hp: TANK_INIT_HP} );
	});

	client.on('sync', function(data){
		//Receive data from clients
		// if(data.turtle != undefined){
		// 	game.syncTurtle(data.turtle);
		// }
		if(data.finger != undefined){
			game.syncFinger(data.finger);
		}
		//Broadcast data to clients
		client.emit('sync', game.getData());
		client.broadcast.emit('sync', game.getData());

		counter ++;
	});

	client.on('leaveGame', function(fingerId){
		console.log(fingerId + ' has left the game');
		game.removeFinger(fingerId);
		client.broadcast.emit('removeFinger', fingerId);
	});

});

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}
