<!DOCTYPE html>
<html>
<head>
	<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js"></script>
	<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/jquery-ui.min.js"></script>
	<script src="dz.js"></script>
	<style type="text/css">
		.progressbarplay {
			cursor:pointer;overflow: hidden;height: 8px;margin-bottom: 8px;background-color: #F7F7F7;background-image: -moz-linear-gradient(top,whiteSmoke,#F9F9F9);background-image: -ms-linear-gradient(top,whiteSmoke,#F9F9F9);background-image: -webkit-gradient(linear,0 0,0 100%,from(whiteSmoke),to(#F9F9F9));background-image: -webkit-linear-gradient(top,whiteSmoke,#F9F9F9);background-image: -o-linear-gradient(top,whiteSmoke,#F9F9F9);background-image: linear-gradient(top,whiteSmoke,#F9F9F9);background-repeat: repeat-x;filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#f5f5f5',endColorstr='#f9f9f9',GradientType=0);-webkit-box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);-moz-box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);-webkit-border-radius: 6px;-moz-border-radius: 6px;border-radius: 6px;
		}
		.progressbarplay .bar {
			cursor:pointer;background: red;width: 0;height: 8px;color: white;font-size: 12px;text-align: center;text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.25);-webkit-box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.15);-moz-box-shadow: inset 0 -1px 0 rgba(0,0,0,0.15);box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.15);-webkit-box-sizing: border-box;-moz-box-sizing: border-box;box-sizing: border-box;-webkit-transition: width .6s ease;-moz-transition: width .6s ease;-ms-transition: width .6s ease;-o-transition: width .6s ease;transition: width .6s ease;
		}

		.custom_player{
			width: 80%;
			margin: auto;
			text-align: center;
			background-color: black; 
		}
	</style>
</head>

<body>
	<div id='dz-root'></div>
	<input type="button" onclick="DZ.player.playAlbum(6125830);" value="Play"/>
	<input type="button" onclick="login()" value="Login1"/>
	<input type="button" onclick="getPlaylists()" value="playlist"/>
	<input type="button" onclick="getFavorites()" value="favoritas"/>
	<input type="button" onclick="DZ.logout()" value="logout"/>
	<hr>
	este es el custom player weon! <br><br>
	<div class="custom_player">

		<div id="slider_seek" class="progressbarplay" style="">
			<div class="bar" style="width: 0%;"></div>
		</div>
	</div>
	<hr>
	<div id="dashboard">
		
	</div>
	<hr>
	<div id="player" style="width:100%;" align="center"></div>
	<script>
		$(document).ready(function(){
			$("#controlers input").attr('disabled', true);
			$("#slider_seek").click(function(evt,arg){
				var left = evt.offsetX;
				DZ.player.seek((evt.offsetX/$(this).width()) * 100);
			});
		});

		DZ.init({
			appId  : '218204',
			channelUrl : 'https://immense-woodland-64988.herokuapp.com/',
			player: {
				container : 'player',
				playlist : true,
				width : 650,
				height : 300,
				onload : onPlayerLoaded
			}
		});
		function onPlayerLoaded() {
			$("#controlers input").attr('disabled', false);
			event_listener_append('player_loaded');
			DZ.Event.subscribe('current_track', function(arg){
				event_listener_append('current_track', arg.index, arg.track.title, arg.track.album.title);
			});
			DZ.Event.subscribe('player_position', function(arg){
				event_listener_append('position', arg[0], arg[1]);
				$("#slider_seek").find('.bar').css('width', (100*arg[0]/arg[1]) + '%');
			});
		}
		function event_listener_append() {
			var pre = document.getElementById('event_listener');
			var line = [];
			for (var i = 0; i < arguments.length; i++) {
				line.push(arguments[i]);
			}
			pre.innerHTML += line.join(' ') + "\n";
		}
		DZ.api('/user/me', function(response){
			console.log("My name", response);
		});

		function login(){
			DZ.login(function(response){
				console.log("el response del login");
				console.log(response);
			});
		}

		function getPlaylists(){
			DZ.api('/user/me/playlists',function(response){
				console.log("las play list");
				console.log(response);
				playlists = response.data;
				fillDashboard(playlists);

			})
		}
		function getFavorites(){
			DZ.api('/user/me/tracks',function(response){
				console.log("las favoritas");
				console.log(response);

			})
		}

		function fillDashboard(array){
			var dashboard = document.getElementById("dashboard"); 
			dashboard.innerHTML = "";
			for (var i = array.length - 1; i >= 0; i--) {
				console.log(array[i].picture);
				$("#dashboard").prepend("<img src="+array[i].picture_medium+" id="+array[i].id+" onclick='play_playlist(this)'>");
			}
		}
		function play_playlist(el){
			var playlist_id = el.getAttribute("id");
			console.log(playlist_id);
			DZ.player.playPlaylist(parseInt(playlist_id));
		}
	</script>
	<br/>
	event_listener : <br/>
	<pre id="event_listener" style="height:100px;overflow:auto;"></pre>
</body>
</html>