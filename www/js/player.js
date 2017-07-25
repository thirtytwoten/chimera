/* global $, socket */
'use strict';

let playerName = '';

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
  if(playerName !== ''){
    $('#prompt').hide();
    socket.emit('joinGame', {playerName});
  }
}
