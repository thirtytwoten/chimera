const DEBUG = true;
const INTERVAL = 50;
const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

function Finger({
  playerName = '',
  position = '',
  angle = 0,
  occupied = false,
  isLocal = false
}){
  this.playerName = playerName;
  this.position = position;
  this.angle = angle;
  this.occupied = occupied;
  this.isLocal = isLocal;
  this.id = 'fin-' + this.position;
  this.cssDegOffset = this.calcDegreeOffset();
}

Finger.prototype = {
  getDomElement: function(){
    return $(this.id);
  },
  calcDegreeOffset: function() {
    return this.position.includes('right') ? 180 : 0;
  },
  slim: function(){
    return {
      playerName: this.playerName,
      position: this.position,
      angle: this.angle
    };
  }
}

let Fingers = [];
Fingers.getFingerAtPosition = function(strOrIndex){
  let index = Number.isInteger(strOrIndex) ? strOrIndex : POSITIONS.indexOf(strOrIndex);
  return (index >= 0 && index < POSITIONS.length) ? this[index] : null;
}
Fingers.getOpenFinger = function() {
  return this.find(function(finger){
    return !finger.occupied;
  });
}
Fingers.occupied = function() {
  return this.filter(function(finger){
    return finger.occupied;
  });
}
Fingers.bigFinger = {
  angle: 0,
  id: 'big-fin',
  cssDegOffset: 0,
  show: function(){
    $('#'+this.id).css('visibility', 'visible');
  }
}

function Game(turtleId, socket){
  this.update = false;
  this.width = 0;
  this.height = 0;
  this.mx = 0;
  this.$arena = null;
  this.localFinger = null;
  this.bigFinger = Fingers.bigFinger;
  this.turtle = null;
  this.socket = socket;
  this.localAngle = 0;
}

Game.prototype = {

  init: function(serverData){
    for (i in POSITIONS){
      Fingers.push(new Finger({position: POSITIONS[i]}));
    }
    this.buildPool(serverData.arena);
    this.turtle = new Turtle(serverData.turtle);
    this.setControls();
    setInterval(function(){
      localGame.mainLoop();
    }, INTERVAL);
  },

  buildPool: function(arena) {
    this.width = arena.width;
    this.height = arena.height;
    this.$arena = $('#'+arena.id);
    this.$arena.css('width', arena.width);
    this.$arena.css('height', arena.height);
  },

  setControls: function(){
    var t = this;
    $(document).mousemove( function(e){ //Detect mouse for pointing finger
      t.mx = e.pageX - t.$arena.offset().left;
      t.setLocalAngle();
    });
  },

  setLocalAngle: function(){
    let domain = [0, this.width];
    let range = [-80, 80];
    if(this.localFinger){
      this.localAngle = scale(this.mx, domain, range);
      if(this.localAngle != this.localFinger.angle){
        this.localFinger.angle = this.localAngle;
        this.bigFinger.angle = this.localAngle;
        this.update = true;
      } else {
        this.update = false;
      }
    }
  },

  addPlayer: function(playerName, isLocal){
    //would I ever need to do anything if !local?
    if(isLocal){
      let newFinger = Object.assign(Fingers.getOpenFinger(), {playerName, isLocal, occupied: true});
      this.turtle.addFin(newFinger);
      this.localFinger = newFinger;
      this.bigFinger.show();
    }
  },

  mainLoop: function(){
    if(this.update){
      this.update = false;
      //send data to server about local finger
      this.sendData();
    }
    this.refresh();
  },

  sendData: function(){
    //Send local data to server
    var gameData = {};
    gameData.finger = this.localFinger.slim();
    //gameData.turtle = this.turtle;
    this.socket.emit('sync', gameData);
  },

  receiveData: function(serverData, init){
    if(init){
      this.init(serverData);
    }
    Object.assign(this.turtle, serverData.turtle);
    serverData.fingers.forEach(function(serverFinger){
      let clientFinger = Fingers.getFingerAtPosition(serverFinger.position);
      Object.assign(clientFinger, serverFinger);
      if(!clientFinger.occupied){
        clientFinger.occupied = true;
        localGame.turtle.addFin(clientFinger);
      }
    });
  },

  refresh: function() {
    this.turtle.refresh();
    this.refreshFingers();
  },

  refreshFingers: function() {
    let drawnFingers = Fingers.occupied();
    drawnFingers.push(this.bigFinger);
    drawnFingers.forEach(function(finger){
      $fin = $('#' + finger.id);
      if($fin.length > 0){
        let deg = finger.angle + finger.cssDegOffset;
        $fin.css('-webkit-transform', 'rotateZ(' + deg + 'deg)');
        $fin.css('-moz-transform', 'rotateZ(' + deg + 'deg)');
        $fin.css('-o-transform', 'rotateZ(' + deg + 'deg)');
        $fin.css('transform', 'rotateZ(' + deg + 'deg)');
      } else {
        console.log(finger);
      }
    });
  }
}

function Turtle({id, x, y, hp}){
  this.id = id;
  this.body = null;
  this.speed = 5;
  this.w = 60;
  this.h = 80;
  this.baseAngle = 90;
  this.x = x;
  this.y = y;
  this.hp = hp;
  this.dead = false;
  this.$info = null;
  this.materialize();
}

Turtle.prototype = {

  materialize: function(){
    localGame.$arena.append('<div id="' + this.id + '" class="turtle turtle1"></div>');
    this.$body = $('#' + this.id);
    // this.$body.css('width', this.w);
    // this.$body.css('height', this.h);

    localGame.$arena.append('<div id="info-' + this.id + '" class="info"></div>');
    this.$info = $('#info-' + this.id);
    this.$info.append('<div class="label">' + this.id + '</div>');
    this.$info.append('<div class="hp-bar"></div>');

    this.refresh();
  },

  addFin: function(finger) {
    this.$body.append(`<div id="${finger.id}" class="fin"></div>`);
  },

  removeFin: function(finger) {
    // TODO
  },

  refresh: function(){
    this.$body.css('left', this.x + 'px');
    this.$body.css('top', this.y + 'px');
    this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAngle + 'deg)');
    this.$body.css('-moz-transform', 'rotateZ(' + this.baseAngle + 'deg)');
    this.$body.css('-o-transform', 'rotateZ(' + this.baseAngle + 'deg)');
    this.$body.css('transform', 'rotateZ(' + this.baseAngle + 'deg)');

    // this.$info.css('left', (this.x) + 'px');
    // this.$info.css('top', (this.y) + 'px');

    // this.$info.find('.hp-bar').css('width', this.hp + 'px');
    // this.$info.find('.hp-bar').css('background-color', getGreenToRed(this.hp));
  }

}

function debug(msg){
  if(DEBUG){
    console.log(msg);
  }
}

function getGreenToRed(percent){
  r = percent<50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
  g = percent>50 ? 255 : Math.floor((percent*2)*255/100);
  return 'rgb('+r+','+g+',0)';
}

function scale(input, domain, range) {
  let clamped = input <= domain[0] ? domain[0] : input >= domain[1] ? domain[1] : input;
  let percent = (clamped - domain[0]) / (domain[1] - domain[0]);
  return Math.floor(percent * (range[1] - range[0]) + range[0]);
}
