const DEBUG = true;
const INTERVAL = 50;
const ROTATION_SPEED = 5;
const ARENA_MARGIN = 30;
var TURTLE_INIT_HP = 100;

function Game(arenaId, w, h, socket){
  this.fingers = []; //Fingers (other than the local finger)
  this.localFinger = null;
  this.bigFinger = null;
  this.width = w;
  this.height = h;
  this.mx = null;
  this.$arena = $(arenaId);
  this.$arena.css('width', w);
  this.$arena.css('height', h);
  this.turtle = new Turtle(1, 1, this, this.$arena, w/2, h/2, TURTLE_INIT_HP);
  this.socket = socket;

  var g = this;
  setInterval(function(){
    g.mainLoop();
  }, INTERVAL);
}

Game.prototype = {

  addFinger: function(name, position, angle, isLocal){
    var f = new Finger(name, position, angle, this, isLocal);
    if(isLocal){
      this.localFinger = f;
      this.bigFinger = new BigFinger(f, this);
    }else{
      this.fingers.push(f);
    }
  },

  mainLoop: function(){
    if(this.localFinger != undefined){
      //send data to server about local finger
      this.sendData();
      //move local tank
      this.turtle.move();
    }
  },

  sendData: function(){
    //Send local data to server
    var gameData = {};

    //Send finger data
    var f = {
      name: this.localFinger.name,
      position: this.localFinger.position,
      angle: this.localFinger.angle
    };
    gameData.finger = f;
    this.socket.emit('sync', gameData);
  },

  receiveData: function(serverData){
    var game = this;
    serverData.fingers.forEach( function(serverFinger){

      var found = false;
      game.fingers.forEach( function(clientFinger){
        //update foreign fingers
        if(clientFinger.name == serverFinger.name){
          clientFinger.position = serverFinger.position;
          clientFinger.angle = serverFinger.angle;
          clientFinger.refresh();
          found = true;
        }
      });
      if(!found &&
          (game.localFinger == undefined || serverFinger.name != game.localFinger.name)
        ){
        //create it
        game.addFinger(serverFinger.name, serverFinger.position, serverFinger.angle, false);
      }
    });
  }
}

function BigFinger(f, game){
  this.game = game;
  this.materialize();
}

BigFinger.prototype = {
  materialize: function() {
    this.game.$arena.append('<div id="big-fin-' + this.id + '" class="big-fin"></div>');
    this.game.$bigFin = $('#big-fin-' + this.id);
  },
  refresh: function() {
    this.game.$bigFin.css('-webkit-transform', 'rotateZ(' + this.game.localFinger.angle + 'deg)');
    this.game.$bigFin.css('-moz-transform', 'rotateZ(' + this.game.localFinger.angle + 'deg)');
    this.game.$bigFin.css('-o-transform', 'rotateZ(' + this.game.localFinger.angle + 'deg)');
    this.game.$bigFin.css('transform', 'rotateZ(' + this.game.localFinger.angle + 'deg)');
  }
}

function Turtle(id, type, game, $arena, x, y, hp){
  this.id = id;
  this.type = type;
  this.speed = 5;
  this.$arena = $arena;
  this.w = 60;
  this.h = 80;
  this.baseAngle = 0;//getRandomInt(0, 360);
  //Make multiple of rotation amount
  this.baseAngle -= (this.baseAngle % ROTATION_SPEED);
  this.finAngle = 0;
  this.x = x;
  this.y = y;
  this.game = game;
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

    // this.$body.append('<div id="fin-' + 'tl-' + this.id + '" class="fin fin-tl"></div>');
    // this.$finTL = $('#fin-' + 'tl-' + this.id);

    // this.$body.append('<div id="fin-' + 'tr-' + this.id + '" class="fin fin-tr"></div>');
    // this.$finTR = $('#fin-' + 'tr-' + this.id);

    // this.$body.append('<div id="fin-' + 'bl-' + this.id + '" class="fin fin-bl"></div>');
    // this.$finBL = $('#fin-' + 'bl-' + this.id);

    // this.$body.append('<div id="fin-' + 'br-' + this.id + '" class="fin fin-br"></div>');
    // this.$finBR = $('#fin-' + 'br-' + this.id);

    this.$arena.append('<div id="info-' + this.id + '" class="info"></div>');
    this.$info = $('#info-' + this.id);
    this.$info.append('<div class="label">' + this.id + '</div>');
    this.$info.append('<div class="hp-bar"></div>');

    this.refresh();

    if(this.isLocal){
      this.setControls();
    }
  },

  refresh: function(){
    this.game.localFinger && this.game.localFinger.refresh();
    this.game.bigFinger && this.game.bigFinger.refresh();

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

    if(this.x + moveX > (0 + ARENA_MARGIN) && (this.x + moveX) < (this.$arena.width() - ARENA_MARGIN)){
      this.x += moveX;
    }
    if(this.y + moveY > (0 + ARENA_MARGIN) && (this.y + moveY) < (this.$arena.height() - ARENA_MARGIN)){
      this.y += moveY;
    }
    
    this.refresh();
  }

}

function Finger(name, position, angle, game, isLocal) {
  this.name = name;
  this.position = position;
  this.angle = 0;
  this.game = game;
  this.turtle = game.turtle;
  this.$arena = game.$arena;
  this.isLocal = isLocal;

  this.materialize();
}

Finger.prototype = {

  materialize: function(){
    this.turtle.$body.append('<div id="fin-' + this.position + '-' + this.name + '" class="fin fin-' + this.position + '"></div>');
    this.$fin = $('#fin-' + this.position + '-' + this.name);
    this.refresh();
    if(this.isLocal){
      this.setControls();
    }
  },

  refresh: function(){
    this.$fin.css('-webkit-transform', 'rotateZ(' + this.angle + 'deg)');
    this.$fin.css('-moz-transform', 'rotateZ(' + this.angle + 'deg)');
    this.$fin.css('-o-transform', 'rotateZ(' + this.angle + 'deg)');
    this.$fin.css('transform', 'rotateZ(' + this.angle + 'deg)');
  },

  setControls: function(){
    var t = this;
    $(document).mousemove( function(e){ //Detect mouse for pointing finger
      t.game.mx = e.pageX - t.turtle.$arena.offset().left;
      t.setFinAngle();
    });

  },

  setFinAngle: function(){
    let domain = [0, this.game.width];
    let range = [-90, 90];
    this.angle = scale(this.game.mx, domain, range);
    this.turtle.finAngle = this.angle;
    this.turtle.refresh();
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
