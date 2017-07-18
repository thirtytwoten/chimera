var WIDTH = 1000;
var HEIGHT = 600;
var socket = io.connect('localhost:8082');
var game = new Game('#pool', WIDTH, HEIGHT, socket);
var name = '';
var position = 1;
var angle = 0;
game.addTurtle(1,1,true,100,100);

socket.on('addFinger', function(finger){
	game.addFinger(finger.id, finger.type, finger.angle, finger.isLocal);
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
		name = $('#finger-name').val();
		joinGame(name, position, angle, socket);
	});

	$('#finger-name').keyup( function(e){
		name = $('#finger-name').val();
		var k = e.keyCode || e.which;
		if(k == 13){
			joinGame(name, position, angle, socket);
		}
	});

	// $('ul.turtle-selection li').click( function(){
	// 	$('.turtle-selection li').removeClass('selected')
	// 	$(this).addClass('selected');
	// 	selectedTurtle = $(this).data('turtle');
	// });

});

$(window).on('beforeunload', function(){
	socket.emit('leaveGame', turtleName);
});

function joinGame(name, position, angle, socket){
	if(name != ''){
		$('#prompt').hide();
		socket.emit('joinGame', {id: name, type: position, angle: angle});
	}
}
