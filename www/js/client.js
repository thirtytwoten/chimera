var WIDTH = 600;
var HEIGHT = 300;
var socket = io.connect('localhost:8082');
var game = new Game('#pool', 'main-turtle', WIDTH, HEIGHT, socket);
var playerName = '';

socket.on('addPlayer', function(finger){
  game.addPlayer(finger.playerName, finger.isLocal);
});

socket.on('removeFinger', function(finger){
  //TODO
})

socket.on('sync', function(gameServerData){
  game.receiveData(gameServerData);
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
