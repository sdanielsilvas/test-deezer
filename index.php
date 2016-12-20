<!DOCTYPE html>
<html>
<head>
	<script src="http://cdn-files.deezer.com/js/min/dz.js"></script>
</head>

<body>
	<div id='dz-root'></div>
	<input type="button" onclick="DZ.player.playAlbum(6125830);" value="Play"/>
	<input type="button" onclick="DZ.login()" value="Login"/>
	<script>

		DZ.init({
			appId  : '218204',
			channelUrl : 'http://127.0.0.1',
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