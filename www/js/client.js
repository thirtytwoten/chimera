var WIDTH = 1100;
var HEIGHT = 580;
// This IP is hardcoded to my server, replace with your own
var socket = io.connect('localhost:8082');
var game = new Game('#arena', WIDTH, HEIGHT, socket);
var selectedTurtle = 1;
var turtleName = '';

socket.on('addTurtle', function(turtle){
	game.addTurtle(turtle.id, turtle.type, turtle.isLocal, turtle.x, turtle.y);
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
		turtleName = $('#turtle-name').val();
		joinGame(turtleName, selectedTurtle, socket);
	});

	$('#turtle-name').keyup( function(e){
		turtleName = $('#turtle-name').val();
		var k = e.keyCode || e.which;
		if(k == 13){
			joinGame(turtleName, selectedTurtle, socket);
		}
	});

	$('ul.turtle-selection li').click( function(){
		$('.turtle-selection li').removeClass('selected')
		$(this).addClass('selected');
		selectedTurtle = $(this).data('turtle');
	});

});

$(window).on('beforeunload', function(){
	socket.emit('leaveGame', turtleName);
});

function joinGame(turtleName, turtleType, socket){
	if(turtleName != ''){
		$('#prompt').hide();
		socket.emit('joinGame', {id: turtleName, type: turtleType});
	}
}
