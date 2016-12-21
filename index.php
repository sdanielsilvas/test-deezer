<!DOCTYPE html>
<html>
<head>
	<script src="dz.js"></script>
</head>

<body>
	<div id='dz-root'></div>
	<input type="button" onclick="DZ.player.playAlbum(6125830);" value="Play"/>
	<input type="button" onclick="login()" value="Login1"/>
	<input type="button" onclick="DZ.login()" value="Login2"/>
	<input type="button" onclick="DZ.logout()" value="logout"/>
	<script>

		DZ.init({
			appId  : '218204',
			channelUrl : 'http://immense-woodland-64988.herokuapp.com/',
			player: {
				onload: function (response) {
					console.log('estamos ready', response);
				}
			}
		});
		
		DZ.api('/user/me', function(response){
			console.log("My name", response);
		});

		function login(){
			DZ.login(function(response){
				console.log("el response del login");
				console.log(response);
			});
		}
	</script>
</body>
</html>