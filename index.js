var express = require('express');
var app = express();
var counter = 0;  //not really used
var WIDTH = 1100;
var HEIGHT = 580;

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

  removeFinger: function(playerName){
    //Remove finger
    this.fingers = this.fingers.filter( function(f){return f.playerName != playerName} );
  },

  //Sync finger with new data received from a client
  syncFinger: function(newFingerData){
    let found = false;
    this.fingers.forEach( function(finger){
      if(finger.playerName == newFingerData.playerName){
        finger.position = newFingerData.position;
        finger.angle = newFingerData.angle;
        found = true;
      }
    });
    if(!found){
      this.addFinger(newFingerData);
    }
  },

  //Detect if ball collides with any turtle
  // detectCollision: function(ball){
  //  var self = this;

  //  this.turtles.forEach( function(turtle){
  //    if(turtle.id != ball.ownerId
  //      && Math.abs(turtle.x - ball.x) < 30
  //      && Math.abs(turtle.y - ball.y) < 30){
  //      //Hit turtle
  //      self.hurtTurtle(turtle);
  //      ball.out = true;
  //      ball.exploding = true;
  //    }
  //  });
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

/* Connection events */

io.on('connection', function(client) {
  console.log('User connected');

  client.on('joinGame', function(finger){
    console.log(finger.playerName + ' joined the game');
    client.emit('addPlayer', { playerName: finger.playerName, isLocal: true } );
    client.broadcast.emit('addPlayer', { playerName: finger.playerName, isLocal: false } );
  });

  client.on('sync', function(data){
    if(data.finger != undefined){
      game.syncFinger(data.finger);
    }
    //Broadcast data to clients
    client.emit('sync', game.getData());
    client.broadcast.emit('sync', game.getData());

    counter ++;
  });

  client.on('leaveGame', function(fingerName){
    console.log(fingerName + ' has left the game');
    game.removeFinger(fingerName);
    client.broadcast.emit('removeFinger', fingerName);
  });

});

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
