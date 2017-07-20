var express = require('express');
var app = express();
var counter = 0;  //not really used

app.use(express.static(__dirname + '/www'));
var server = app.listen(process.env.PORT || 8082, function () {
  var port = server.address().port;
  console.log('Server running at port %s', port);
});

var io = require('socket.io')(server);

function radians(degrees){
  return degrees * Math.PI / 180;
}

function GameServer(){
  this.fingers = [];
  this.turtle = {
    id: 'main-turtle',
    x: 300,
    y: 200,
    baseAngle: 0,
    hp: 100
  }
}

GameServer.prototype = {

  addFinger: function(finger){
    this.fingers.push(finger);
  },

  removeFinger: function(playerName){
    this.fingers = this.fingers.filter( function(f){return f.playerName != playerName} );
  },

  //Sync finger with new data received from a client
  syncFinger: function(clientFinger){
    let serverFinger = this.fingers.find(function(f){ return f.position == clientFinger.position});
    if(serverFinger) {
      Object.assign(serverFinger, clientFinger);
    } else {
      this.addFinger(clientFinger);
    }
  },

  moveTurtle: function(){
    let leftSide = 0, rightSide = 0;
    let directionalSpeed = 10;
    let rotationSpeed = 10;
    this.fingers.forEach(function(f){
      if(f.position.includes('left')){
        leftSide += Math.sin(radians(f.angle));
      } else {
        rightSide = Math.sin(radians(-f.angle));
      }
    });
    let magnitude = (leftSide + rightSide) * directionalSpeed;
    this.turtle.baseAngle += (leftSide - rightSide) * rotationSpeed; //positive: turn left, negative: turn right
    this.turtle.baseAngle %= 360;
    this.turtle.x += Math.cos(radians(this.turtle.baseAngle)) * magnitude;
    this.turtle.y += Math.sin(radians(this.turtle.baseAngle)) * magnitude;
    console.log(`x: ${this.turtle.x}, y: ${this.turtle.y}, baseAngle ${this.turtle.baseAngle}`);
  },

  hurtTurtle: function(turtle){
    turtle.hp -= 2;
  },

  getData: function(){
    var gameData = {};
    gameData.fingers = this.fingers;
    gameData.turtle = this.turtle;
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

  //sync existing information to client
  client.emit('sync', game.getData());

  client.on('joinGame', function(finger){
    console.log(finger.playerName + ' joined the game');
    client.emit('addPlayer', { playerName: finger.playerName, isLocal: true } );
    //client.broadcast.emit('addPlayer', { playerName: finger.playerName, isLocal: false } );
    //^should be picked up in sync calls
  });

  client.on('sync', function(data){
    if(data.finger != undefined){
      game.syncFinger(data.finger);
      game.moveTurtle();
      //Broadcast data to clients
      client.emit('sync', game.getData());
      client.broadcast.emit('sync', game.getData());
    }

    counter ++;
  });

  client.on('leaveGame', function(fingerName){
    console.log(fingerName + ' has left the game');
    game.removeFinger(fingerName);
    client.broadcast.emit('removeFinger', fingerName);
  });

});
