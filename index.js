var express = require('express');
var app = express();

app.use(express.static(__dirname + '/www'));
var server = app.listen(process.env.PORT || 8082, function () {
  var port = server.address().port;
  console.log('Server running at port %s', port);
});

var io = require('socket.io')(server);

function radians(degrees){
  return degrees * Math.PI / 180;
}

function highPassFilter(n) {
  return n;
  //return (Math.abs(n) < 0.2) ? 0 : n;
}

function GameServer(){
  this.fingers = [];
  this.arena = {
    id: 'pool',
    width: 800,
    height: 500,
    margin: 50,
    updateRate: 50,
  };
  this.turtle = {
    id: 'main-turtle',
    x: this.arena.width/2,
    y: this.arena.height/2,
    baseAngle: 0,
    moveAngle: 0,
    moveX: 0,
    moveY: 0,
    hp: 100,
  };
  this.defaultTurtle = {
    id: 'main-turtle',
    x: this.arena.width/2,
    y: this.arena.height/2,
    baseAngle: 0,
    moveAngle: 0,
    moveX: 0,
    moveY: 0,
    hp: 100,
  }
  this.moving = false;
  this.interval = null;
  this.counter = 0;
}

GameServer.prototype = {

  stop: function() {
    clearInterval(this.interval);
    this.counter = 0;
  },

  go: function() {
    this.interval = setInterval(function(){
      game.calcMovement();
      game.moveTurtle();
      //console.log(++game.counter);
    }, game.arena.updateRate);
  },

  addFinger: function(finger){
    this.fingers.push(finger);
    if(this.fingers.length === 1){
      this.go();
    }
  },

  removeFinger: function(playerName){
    this.fingers = this.fingers.filter( function(f){return f.playerName != playerName} );
    if(this.fingers.length === 0){
      Object.assign(this.turtle, this.defaultTurtle);
      this.stop();
    };
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

  moveTurtle: function() {
    this.turtle.baseAngle += this.turtle.moveAngle;
    this.turtle.baseAngle %= 360;
    if(this.turtle.x + this.turtle.moveX > (0 + this.arena.margin) && (this.turtle.x + this.turtle.moveX) < (this.arena.width - this.arena.margin)){
      this.turtle.x += this.turtle.moveX;
    }
    if(this.turtle.y + this.turtle.moveY > (0 + this.arena.margin) && (this.turtle.y + this.turtle.moveY) < (this.arena.height - this.arena.margin)){
      this.turtle.y += this.turtle.moveY;
    }
  },

  calcMovement: function(){
    let leftSide = 0, rightSide = 0;
    let directionalSpeed = 10;
    let rotationSpeed = 10;
    this.fingers.forEach(function(f){
      if(f.position.includes('left')){
        leftSide += Math.sin(radians(-f.angle));
      } else {
        rightSide = Math.sin(radians(f.angle));
      }
    });
    let magnitude = highPassFilter((leftSide + rightSide)) * directionalSpeed;
    let moveAngle = highPassFilter((leftSide - rightSide)) * rotationSpeed; //positive: turn left, negative: turn right
    //should set baseAngle before moveX&Y
    let moveX = Math.cos(radians(this.turtle.baseAngle)) * magnitude;
    let moveY = Math.sin(radians(this.turtle.baseAngle)) * magnitude;
    this.turtle.moveAngle = moveAngle;
    this.turtle.moveX = moveX;
    this.turtle.moveY = moveY;
  },

  hurtTurtle: function(turtle){
    turtle.hp -= 2;
  },

  getData: function(){
    var gameData = {};
    gameData.fingers = this.fingers;
    gameData.turtle = this.turtle;
    gameData.arena = this.arena;
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

  let syncRate = 100; //game.arena.updateRate;
  setInterval(function(){
    client.emit('sync', game.getData());
    client.broadcast.emit('sync', game.getData());
    //console.log(++game.counter);
  }, syncRate);

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
      //Broadcast data to clients
      // client.emit('sync', game.getData());
      // client.broadcast.emit('sync', game.getData());
    }
  });

  client.on('leaveGame', function(fingerName){
    console.log(fingerName + ' has left the game');
    game.removeFinger(fingerName);
    client.broadcast.emit('removeFinger', fingerName);
  });

});
