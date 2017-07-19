const DEBUG = true;
const INTERVAL = 50;
const ROTATION_SPEED = 5;
const ARENA_MARGIN = 30;
const TURTLE_INIT_HP = 100;
const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

let Fingers = [
  { playerName: '',
    position: 'top-left',
    angle: 0,
    $div: null, 
    occupied: false,
    isLocal: false },
  { playerName: '',
    position: 'top-right',
    angle: 0,
    $div: null,
    occupied: false,
    isLocal: false },
  { playerName: '',
    position: 'bottom-left',
    angle: 0,
    $div: null,
    occupied: false,
    isLocal: false },
  { playerName: '',
    position: 'bottom-right',
    angle: 0,
    $div: null,
    occupied: false,
    isLocal: false
  }
];

Fingers.getFingerAtPosition = function(strOrIndex){
  let index = Number.isInteger(strOrIndex) ? strOrIndex : POSITIONS.indexOf(strOrIndex);
  return (index >= 0 && index < POSITIONS.length) ? this[index] : null;
}
// Fingers.getLocalFinger = function() {
//   return this.find(function(finger){
//     return finger.isLocal;
//   });
// }
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
  position: 'big-fin',
  angle: 0,
  $div: $('#big-fin'),
  update: function() {

  }
}

function Game(arenaId, w, h, socket){
  this.update = true;
  this.width = w;
  this.height = h;
  this.mx = null;
  this.$arena = $(arenaId);
  this.$arena.css('width', w);
  this.$arena.css('height', h);
  this.localFinger = null;
  this.bigFinger = Fingers.bigFinger;
  this.turtle = new Turtle('main-turtle', this, w/2, h/2);
  this.socket = socket;
  this.localAngle = 0;

  this.setControls();

  var g = this;
  setInterval(function(){
    g.mainLoop();
  }, INTERVAL);
}

Game.prototype = {

  setControls: function(){
    var t = this;
    $(document).mousemove( function(e){ //Detect mouse for pointing finger
      t.mx = e.pageX - t.$arena.offset().left;
      t.setLocalAngle();
    });
  },

  setLocalAngle: function(){
    let domain = [0, this.width];
    let range = [-90, 90];
    if(this.localFinger){
      this.localAngle = scale(this.mx, domain, range);
      this.localFinger.angle = this.localAngle;
      this.bigFinger.angle = this.localAngle;
    }
  },

  addPlayer: function(playerName, isLocal){
    let newFinger = Object.assign(Fingers.getOpenFinger(), {playerName, isLocal, occupied: true});
    if(isLocal){
      this.localFinger = newFinger;
      this.bigFinger.$div.css('visibility', 'visible');
    }
    this.turtle.addFin(newFinger);
  },

  mainLoop: function(){
    if(this.update){
      //send data to server about local finger
      this.sendData();
      //move local tank
      this.turtle.move();
      this.refreshFingers();
    }
  },

  sendData: function(){
    //Send local data to server
    var gameData = {};
    gameData.finger = this.localFinger;
    this.socket.emit('sync', gameData);
  },

  receiveData: function(serverData){
    var game = this;
    serverData.fingers.forEach(function(serverFinger){
      //console.log(serverFinger);
      let clientFinger = Fingers.getFingerAtPosition(serverFinger.position);
      Object.assign(clientFinger, serverFinger);
      // redraw Client Finger if changed
    });
  },

  refreshFingers: function() {
    let drawnFingers = Fingers.occupied();
    drawnFingers.push(this.bigFinger);
    drawnFingers.forEach(function(fin){
      fin.$div = $(fin.$div.selector); //TODO fix $div selection bug @ addFin
      let deg = fin.angle;
      fin.$div.css('-webkit-transform', 'rotateZ(' + deg + 'deg)');
      fin.$div.css('-moz-transform', 'rotateZ(' + deg + 'deg)');
      fin.$div.css('-o-transform', 'rotateZ(' + deg + 'deg)');
      fin.$div.css('transform', 'rotateZ(' + deg + 'deg)');
    });
  }
}

function Turtle(id, game, x, y, hp){
  this.id = id;
  this.speed = 5;
  this.w = 60;
  this.h = 80;
  this.baseAngle = 0;//getRandomInt(0, 360);
  //Make multiple of rotation amount
  this.baseAngle -= (this.baseAngle % ROTATION_SPEED);
  this.x = x;
  this.y = y;
  this.game = game;
  this.hp = TURTLE_INIT_HP;
  this.dead = false;
  this.$body = null;
  this.$info = null;

  this.materialize();
}

Turtle.prototype = {

  materialize: function(){
    this.game.$arena.append('<div id="' + this.id + '" class="turtle turtle1"></div>');
    this.$body = $('#' + this.id);
    this.$body.css('width', this.w);
    this.$body.css('height', this.h);

    // already done in refresh
    // this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAngle + 'deg)');
    // this.$body.css('-moz-transform', 'rotateZ(' + this.baseAngle + 'deg)');
    // this.$body.css('-o-transform', 'rotateZ(' + this.baseAngle + 'deg)');
    // this.$body.css('transform', 'rotateZ(' + this.baseAngle + 'deg)');

    this.game.$arena.append('<div id="info-' + this.id + '" class="info"></div>');
    this.$info = $('#info-' + this.id);
    this.$info.append('<div class="label">' + this.id + '</div>');
    this.$info.append('<div class="hp-bar"></div>');

    this.refresh();
  },

  addFin: function(newFinger) {
    let id = `fin-${newFinger.position}`
    this.$body.append(`<div id="${id}" class="fin"></div>`);
    // TODO fix this bug
    newFinger.$div = $(`#${id}`);
  },

  refresh: function(){
    this.$body.css('left', this.x - 30 + 'px');
    this.$body.css('top', this.y - 40 + 'px');
    this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAngle + 'deg)');
    this.$body.css('-moz-transform', 'rotateZ(' + this.baseAngle + 'deg)');
    this.$body.css('-o-transform', 'rotateZ(' + this.baseAngle + 'deg)');
    this.$body.css('transform', 'rotateZ(' + this.baseAngle + 'deg)');

    this.$info.css('left', (this.x) + 'px');
    this.$info.css('top', (this.y) + 'px');

    this.$info.find('.hp-bar').css('width', this.hp + 'px');
    this.$info.find('.hp-bar').css('background-color', getGreenToRed(this.hp));
  },

  move: function(){
    if(this.dead){
      return;
    }
    //TODO: aggregate fin values to get base speed and rotation

    var moveX = 0;//Math.cos(radians(this.finAngle));
    var moveY = Math.sin(radians(this.finAngle));

    moveX = this.speed * moveX;
    moveY = this.speed * moveY;

    if(this.x + moveX > (0 + ARENA_MARGIN) && (this.x + moveX) < (this.game.$arena.width() - ARENA_MARGIN)){
      this.x += moveX;
    }
    if(this.y + moveY > (0 + ARENA_MARGIN) && (this.y + moveY) < (this.game.$arena.height() - ARENA_MARGIN)){
      this.y += moveY;
    }
    
    this.refresh();
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
