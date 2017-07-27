/* global $, localGame */
'use strict';

const DEBUG = true;
const INTERVAL = 50;

let GameViewElementFns = {
  getDomElement: function(){ return $('#' + this.id) },
  show: function(){ this.getDomElement().css('visibility','visible') },
  hide: function(){ this.getDomElement().css('visibility','hidden') },
  rotate: function(deg){
    this.getDomElement()
        .css('-webkit-transform', 'rotateZ(' + deg + 'deg)')
        .css('-moz-transform', 'rotateZ(' + deg + 'deg)')
        .css('-o-transform', 'rotateZ(' + deg + 'deg)')
        .css('transform', 'rotateZ(' + deg + 'deg)');
  }
};

function Player(name, position){
  this.name = name;
  this.position = position;
  this.angle = 0;
  this.id = 'big-fin';
  //this.littleFinger = null;
}
Player.prototype = {
  refresh: function() {
    this.rotate(this.angle);
  },
  dataPacket: function(){
    return {
      playerName: this.name,
      position: this.position,
      angle: this.angle
    };
  }
}
Object.assign(Player.prototype, GameViewElementFns);

function Finger(position){
  this.position = position;
  this.angle = 0;
  this.occupied = false;
  this.isLocal = false;
  this.id = 'fin-' + this.position;  // TODO make as general (!id) selectors for when there's going to be two turtles
  this.cssDegOffset = this.position.includes('right') ? 180 : 0;
}
Finger.prototype = {
  reset: function(){
    this.angle = 0;
    this.occupied = false;
    this.isLocal = false;
  }
};
Object.assign(Finger.prototype, GameViewElementFns);

function Game(turtleId, socket){
  this.width = null;
  this.height = null;
  this.player = null;
  this.turtle = null;
  this.socket = socket;
  this.$arena = null;
  this.update = false;
  this.mx = 0;
}
Game.prototype = {
  init: function(serverData){
    this.$arena = this.buildPool(serverData.arena);
    this.turtle = new Turtle(serverData.turtle);
    this.turtle.materialize(this.$arena);
    this.setControls();
    setInterval(function(){
      localGame.mainLoop();
    }, INTERVAL);
  },

  mainLoop: function(){
    if(this.update){
      this.sendData();
      this.update = false;
    }
    this.turtle.refresh();
  },

  sendData: function(){
    var gameData = {};
    gameData.finger = this.player.dataPacket();
    this.socket.emit('sync', gameData);
  },

  receiveData: function(serverData, init){
    if(init){ this.init(serverData) }
    Object.assign(this.turtle, serverData.turtle);
    serverData.fingers.forEach(function(serverFin){
      let clientFin = localGame.turtle.getFinAtPosition(serverFin.position);
      Object.assign(clientFin, serverFin);
      if(!clientFin.occupied){
        clientFin.occupied = true;
        clientFin.show();
      }
    });
  },

  buildPool: function(arena) {
    this.width = arena.width;
    this.height = arena.height;
    return $('#' + arena.id)
      .css('width', arena.width)
      .css('height', arena.height); 
  },

  setControls: function(){
    $(document).mousemove( function(e){
      localGame.updateLocalAngle(e.pageX - localGame.$arena.offset().left);
    });
  },
  //move to player
  updateLocalAngle: function(newMx){
    if (newMx !== this.mx) {
      this.mx = newMx
      if(this.player){
        let domain = [0, this.width];
        let range = [-80, 80];
        let newAngle = scale(this.mx, domain, range);
        this.update = this.player.angle !== newAngle;
        this.player.angle = newAngle;
        this.player.refresh();
      }
    }
  },

  addPlayer: function(playerName, isLocal){
    if(isLocal){
      let newFin = this.turtle.getOpenFin();
      this.player = new Player(playerName, newFin.position); //maybe server should assign position
      // TODO fix this
      let filter = newFin.getDomElement().css("filter"); //
      $(`#big-fin`).css("filter", filter);
      this.player.show();
    }
  }
};

function Turtle({id, x, y}){
  this.id = id;
  this.body = null;
  this.baseAngle = 90;
  this.x = x;
  this.y = y;
  this.FIN_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  this.fins = this.stubFins();
}
Turtle.prototype = {
  materialize: function($pool){
    $pool.append('<div id="' + this.id + '" class="turtle turtle1"></div>');
    let $turtle = localGame.turtle.getDomElement();
    this.fins.forEach(function(f){
      $turtle.append(`<div id="${f.id}" class="fin"></div>`);
      f.hide();
    });
    this.refresh();
  },

  refresh: function(){
    this.getDomElement()
      .css('left', this.x + 'px')
      .css('top', this.y + 'px');
    this.rotate(this.baseAngle);
    this.occupiedFins().forEach(function(f){ f.rotate(f.angle + f.cssDegOffset) });
  },

  stubFins: function(){
    return this.FIN_POSITIONS.map(function(p){
      return (new Finger(p));
    });
  },

  getFinAtPosition: function(strOrIndex){
    let index = Number.isInteger(strOrIndex) ? strOrIndex : this.FIN_POSITIONS.indexOf(strOrIndex);
    return (index >= 0 && index < this.FIN_POSITIONS.length) ? this.fins[index] : null;
  },

  getFinById: function(id) {
    return this.fins.find(function(fin){ return fin.id === id });
  },

  getOpenFin: function() {
    return this.fins.find(function(fin){ return !fin.occupied });
  },

  occupiedFins: function() {
    return this.fins.filter(function(fin){ return fin.occupied });
  }

};
Object.assign(Turtle.prototype, GameViewElementFns);

////// helpers

function debug(msg){
  if(DEBUG){
    console.log(msg);
  }
}

function scale(input, domain, range) {
  let clamped = input <= domain[0] ? domain[0] : input >= domain[1] ? domain[1] : input;
  let percent = (clamped - domain[0]) / (domain[1] - domain[0]);
  return Math.floor(percent * (range[1] - range[0]) + range[0]);
}
