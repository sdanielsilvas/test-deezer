<!DOCTYPE html>
<html>
<head>
	<script src="dz.js"></script>
</head>

<body>
	<div id='dz-root'></div>
	<input type="button" onclick="DZ.player.playAlbum(6125830);" value="Play"/>
	<input type="button" onclick="DZ.login()" value="Login"/>
	<script>

		DZ.init({
			appId  : '218204',
			channelUrl : 'https://immense-woodland-64988.herokuapp.com/',
			player: {
				onload: function (response) {
					console.log('estamos ready', response);
				}
			}
		});
		
		DZ.api('/user/me', function(response){
			console.log("My name", response);
		});
	</script>
</body>
</html>