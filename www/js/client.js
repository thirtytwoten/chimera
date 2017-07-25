/* global io, Game, $ */
'use strict';

let hostName = window.location.hostname;
let socket = io.connect(hostName);
let localGame = new Game('main-turtle', socket);
let serverPing = false;

socket.on('addPlayer', function(finger){
  localGame.addPlayer(finger.playerName, finger.isLocal);
});

socket.on('removeFinger', function(fingerName){
  localGame.removePlayer(fingerName);
});

socket.on('sync', function(gameServerData){
  localGame.receiveData(gameServerData, !serverPing);
  if(!serverPing){
    //first contact
    $('.btn#join').prop('disabled', false);
    serverPing = true;
  }
});
