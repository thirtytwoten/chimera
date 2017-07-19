var WIDTH = 1000;
var HEIGHT = 600;
var socket = io.connect('localhost:8082');
var game = new Game('#pool', WIDTH, HEIGHT, socket);
var playerName = '';

socket.on('addPlayer', function(finger){
  game.addPlayer(finger.playerName, finger.isLocal);
});

socket.on('sync', function(gameServerData){
  game.receiveData(gameServerData);
});

socket.on('killTurtle', function(turtleData){
  game.killTurtle(turtleData);
});

socket.on('removeTurtle', function(turtleId){
  game.removeTurtle(turtleId);
});

$(document).ready( function(){

  $('#join').click( function(){
    playerName = $('#player-name').val();
    joinGame(playerName, socket);
  });

  $('#player-name').keyup( function(e){
    playerName = $('#player-name').val();
    var k = e.keyCode || e.which;
    if(k == 13){
      joinGame(playerName, socket);
    }
  });

  // $('ul.turtle-selection li').click( function(){
  //  $('.turtle-selection li').removeClass('selected')
  //  $(this).addClass('selected');
  //  selectedTurtle = $(this).data('turtle');
  // });

});

$(window).on('beforeunload', function(){
  socket.emit('leaveGame', playerName);
});

function joinGame(playerName, socket){
  if(playerName != ''){
    $('#prompt').hide();
    socket.emit('joinGame', {playerName});
  }
}
