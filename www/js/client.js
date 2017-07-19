var WIDTH = 600;
var HEIGHT = 300;
var socket = io.connect('localhost:8082');
var localGame = new Game('#pool', 'main-turtle', WIDTH, HEIGHT, socket);
var playerName = '';
var serverPing = false;

socket.on('addPlayer', function(finger){
  localGame.addPlayer(finger.playerName, finger.isLocal);
});

socket.on('removeFinger', function(finger){
  //TODO
})

socket.on('sync', function(gameServerData){
  localGame.receiveData(gameServerData, !serverPing);
  if(!serverPing){
    //first contact
    $('.btn#join').prop('disabled', false);
    serverPing = true;
  }
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
