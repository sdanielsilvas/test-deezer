var DZ = {
	_version: '1.0.0',

	_context: {

	},

	SETTING_PROTOCOL: 'http:',
	SETTING_HOST_SITE: 'http://www.deezer.com',
	SETTING_HOST_CONNECT: 'https://connect.deezer.com',
	SETTING_HOST_API: 'https://api.deezer.com',
	SETTING_HOST_APP: null,

	SETTING_HTTPS: {
		SETTING_HOST_SITE: 'https://www.deezer.com',
		SETTING_HOST_CONNECT: 'https://connect.deezer.com',
		SETTING_HOST_API: 'https://api.deezer.com'
	},

	WIDGET_TYPE_PLAYER: 'dzplayer',
	DEBUG: false,
	dz_root: null,

	token: null,
	tokenExpire: null,
	tokenExpireTimeout: null,

	app_id: null,

	/**
	 * User id
	 * @deprecated Use user.id
	 * @type {Number}
	 */
	user_id: null,

	/**
	 * User information
	 * @type {Object}
	 */
	user: null,

	channelUrl: null,
	iframe_id: null,

	getLoginStatusRunning: false,

	fb_logged: false,

	initialized: false,
	has_player: false,

	is_inapp: false,
	is_player: false,
	is_plugin: false,

	override_https: function() {
		DZ.SETTING_PROTOCOL = 'https:';
		DZ.SETTING_HOST_SITE = DZ.SETTING_HTTPS.SETTING_HOST_SITE;
		DZ.SETTING_HOST_CONNECT = DZ.SETTING_HTTPS.SETTING_HOST_CONNECT;
		DZ.SETTING_HOST_API = DZ.SETTING_HTTPS.SETTING_HOST_API;
	},

	isHttps: function() {
		if (window.location.protocol === 'https:') {
			DZ.isHttps = function() {
				return true;
			};
			return true;
		}

		DZ.isHttps = function() {
			return false;
		};
		return false;
	},

	CONTEXT: {
		// context
		INAPP: 'inapp',
		PLAYER: 'player',

		// side
		APP: 'app',
		DEEZER: 'deezer',

		whereami: function() {
			var context;
			var side;
			if (typeof DZ.inapp === 'undefined') {

				if (typeof DZ_IS_PLUGINS !== 'undefined' && DZ_IS_PLUGINS) {
					DZ.is_plugin = true;
					delete window.DZ_IS_PLUGINS;
				}

				if (typeof DZ_IS_PLAYER !== 'undefined' && DZ_IS_PLAYER) {
					DZ.is_player = true;
					delete window.DZ_IS_PLAYER;
				}

				context = DZ.CONTEXT.PLAYER;
				if (DZ.is_player || DZ.is_plugin) {
					side = DZ.CONTEXT.DEEZER;
				} else {
					side = DZ.CONTEXT.APP;
				}

			} else {
				context = DZ.CONTEXT.INAPP;
				if (DZ.is_inapp) {
					side = DZ.CONTEXT.DEEZER;
				} else {
					side = DZ.CONTEXT.APP;
				}
			}
			return {
				context: context,
				side: side
			};
		}
	},

	clearDeezer: function() {
		try {
			Events.unsubscribeAll('DZ');
			DZ.SETTING_HOST_APP = null;
			DZ.fb_logged = false;
			DZ.initialized = false;
			DZ.has_player = false;
			DZ.app_id = null;
			DZ.channelUrl = null;
			DZ.user_id = null;
			DZ.user = null;
			DZ.token = null;
			DZ.tokenExpire = null;
			DZ.tokenExpireTimeout = null;
			DZ.dz_root = null;

			DZ.inapploadedCount = 0;

		} catch (e) {
			DZ.catchException(e);
		}
	},

	_override_pp: function() {
		DZ.SETTING_HOST_SITE = (DZ.isHttps() ? 'https' : 'http') + '://preprod.deezer.com';
		DZ.SETTING_HOST_CONNECT = 'https://preprod-connect.deezer.com';
		DZ.SETTING_HOST_API = 'https://preprod-api.deezer.com';
	},

	setChannelUrl: function(channel_url) {
		var url = DZ.util.parseUrl(channel_url);
		DZ.channelUrl = channel_url;
		DZ.SETTING_HOST_APP = url.protocol + '://' + url.host;
	},

	/**
	 *
	 * @param {Object} settings - Options passed along when calling DZ.init
	 */
	onDeezerLoaded: function(settings) {
		if (typeof settings === 'object' && typeof settings.user === 'object') {
			DZ.user_id = settings.user.id;
			DZ.user = settings.user;
		}
		if (typeof settings.framework !== 'undefined') {
			DZ.framework.onLoad(settings.framework);
		}
		if (typeof settings.player !== 'undefined') {
			DZ.player.onLoad(settings.player);
		}

	},

	inapploadedCount: 0,

	inapploaded: function(data) {
		if (typeof data === 'undefined') {
			data = {};
		}

		if (!dzPlayer.playerLoaded) {
			Events.addEvent('DZ', Events.player.playerLoaded, function() {
				DZ.inapploaded(data);
			});
			return true;
		}

		if (typeof data.page !== 'undefined' && DZ.inapploadedCount > 0) {
			app.loadPageMode = 'basic';
			app.setPage(data.page);
		}

		if (typeof data.ajax_mode === 'boolean' && data.ajax_mode) {
			app.loadPageMode = 'ajax';
		}

		app.scrollTop();

		if (DZ.inapploadedCount === 0) {
			// ONLY THE FIRST TIME !
			DZ.player_controler.subscribeEvents();
			DZ.deezer.subscribeEvents();
			DZ.notification.deezer.subscribeEvents();
		}

		var player_options = DZ.player_controler.onPlayerLoaded();

		var load_options = {
			player: player_options,
			framework: {
				text: {
					add: gettext('Ajouter à Ma musique'),
					remove: gettext('Retirer de Ma musique'),
					add_playlist: gettext('Ajouter à Ma musique'),
					buy: gettext('Acheter'),
					share: gettext('Partager'),
					follow: gettext('Suivre'),
					unfollow: gettext('Ne plus suivre'),
					download: gettext('Télécharger')
				}
			},
			user: {
				id: USER.USER_ID,
				options: {
					mobile_offline: USER.OPTIONS.mobile_offline
				}
			}
		};

		DZ.communication.callAppMethod('DZ.onDeezerLoaded', load_options);

		DZ.inapploadedCount++;

	},

	onReady: function(callback) {
		if (typeof callback !== 'function') {
			return false;
		}
		DZ.Event.ready(DZ.Event.SDK_READY, callback);
	},
	ready: function(callback) {
		if (typeof callback !== 'function') {
			return false;
		}
		DZ.Event.ready(DZ.Event.SDK_READY, callback);
	},

	setParams: function(param_name, param_value) {
		switch (param_name) {
			case 'app_id':
			case 'appId':
				DZ.app_id = Number(param_value);
				break;

			case 'channelUrl':
				DZ.setChannelUrl(decodeURIComponent(param_value));
				break;

			case 'iframe_id':
				DZ.iframe_id = param_value;
				break;

			default:
				break;
		}
		return true;
	},

	init: function(options) {
		try {

			DZ.initException();
			if (typeof options !== 'undefined' && typeof options.initChannel !== 'undefined' && options.initChannel) {
				return DZ.initChannel(options);
			}

			DZ.dz_root = document.getElementById('dz-root');

			if (DZ.dz_root === null) {
				throw DZ.Exception('dz-root');
			}

			// This mean we are in DEEZER WEBSITE, not widget !
			if (typeof options.inapp !== 'undefined') {
				DZ.inapp = true; // because in the app side, DZ.inapp is an object from file dzapp.js !!
				DZ.is_inapp = true;
			}

			DZ.communication.init();

			if (typeof options.token !== 'undefined' && options.token !== null) {
				if (typeof options.token.accessToken !== 'undefined' && typeof options.token.expire !== 'undefined') {
					DZ.token = options.token.accessToken;
					DZ.tokenExpire = options.token.expire;
				}
			}

			/** dz-root css * */
			DZ.dz_root.style.height = '0px';
			DZ.dz_root.style.width = '0px';

			if (typeof options === 'undefined' || typeof options.channelUrl === 'undefined') {
				if (DZ.channelUrl !== null) {
					options.channelUrl = DZ.channelUrl;
				} else {
					throw DZ.Exception('channelUrl');
				}
			}

			DZ.setChannelUrl(options.channelUrl);

			DZ.initialized = true;

			// INIT FROM THE LIGHT PLAYER
			if (options.initPlayer) {
				return DZ.player_controler.init(options);
			}

			if (typeof options.appId !== 'undefined') {
				DZ.app_id = options.appId;
			}
			// in case of app_id defined anywhere else
			if (DZ.app_id !== null) {
				options.appId = DZ.app_id;
			}

			if (typeof options.player !== 'undefined' && (options.player === true || typeof options.player === 'object')) {
				DZ.has_player = true;
				DZ.player.loadPlayer(options);
			}
		} catch (e) {
			DZ.catchException(e);
		}
	},

	dispatchReconnect: function() {
		DZ.framework.dispatchReconnect();
	},

	init_framework: function() {
		try {
			var CONTEXT = DZ.CONTEXT.whereami();

			if (CONTEXT.side === DZ.CONTEXT.APP) {
				if (CONTEXT.context === DZ.CONTEXT.PLAYER) {
					DZ.framework.override_standalone();
				}
				DZ.framework.parse();
			} else if (CONTEXT.context === DZ.CONTEXT.PLAYER) {
				DZ.framework.override_standalone();
			}
		} catch (e) {
			DZ.catchException(e);
		}
	},

	login_mobile: false,

	loginMobile: function(opts) {
		var src = DZ.SETTING_HOST_SITE + '/app/launcher.php?';

		if (typeof opts !== 'object') {
			opts = {};
		}

		if (typeof opts.perms !== 'string' || DZ.sid === null) {
			return false;
		}

		var arg = [];

		arg.push('app_id=' + DZ.app_id);
		arg.push('app_url=' + encodeURIComponent(window.location.href));

		arg.push('perms=' + opts.perms);

		src = src + arg.join('&');

		window.location.href = src;
		return true;
	},

	login: function(callback, opts) {
		try {
			if (!DZ.initialized) {
				throw DZ.Exception('init');
			}

			if (typeof callback !== 'function') {
				callback = null;
			}

			opts = opts || {};

			if (DZ.login_mobile) {
				return DZ.loginMobile(opts);
			}

			/** MANAGE EVENT * */
			DZ.Event.subscribe('login', DZ.loginCommonCallback, true);
			if (typeof callback === 'function') {
				DZ.Event.subscribe('login', callback, true);
			}

			var screen_x = typeof window.screenX !== 'undefined' ? window.screenX : window.screenLeft;
			var screen_y = typeof window.screenY !== 'undefined' ? window.screenY : window.screenTop;
			var screen_w = typeof window.outerWidth !== 'undefined' ? window.outerWidth : document.documentElement.clientWidth;
			var screen_h = typeof window.outerHeight !== 'undefined' ? window.outerHeight : (document.documentElement.clientHeight - 22);

			var popup_w = 800;
			var popup_h = 430;

			var popup_left = screen_x + (screen_w / 2) - (popup_w / 2);
			var popup_top = screen_y + (screen_h / 2) - (popup_h / 2);

			var src = DZ.SETTING_HOST_CONNECT + '/oauth/auth.php?';
			var arg = [];

			arg.push('app_id=' + DZ.app_id);
			arg.push('format=popup');

			arg.push('redirect_uri=' + this.channelUrl);

			if (typeof opts.response_type !== 'undefined' && opts.response_type === 'connect') {
				arg.push('response_type=connect');
			} else {
				arg.push('response_type=' + (DZ.app_id === null ? 'connect' : 'token'));
			}

			if (typeof opts.perms !== 'undefined' && opts.perms !== '') {
				arg.push('perms=' + opts.perms);
			}
			if (typeof opts.scope !== 'undefined' && opts.scope !== '') {
				arg.push('scope=' + opts.scope);
			}

			if (opts.fb_login) {
				arg.push('fblogin=true');
			}

			src = src + arg.join('&');

			DZ.login_popup.popup = window.open(src, 'login', 'top=' + popup_top + ',left=' + popup_left + ',width=' + popup_w + ',height=' + popup_h + ',location=yes', true);
			DZ.login_popup.watch_close();

		} catch (e) {
			DZ.catchException(e);
		}
	},

	login_popup: {
		popup_intervall_time: 300,
		popup: null,
		popup_intervall: null,

		clear_close: function() {
			if (DZ.login_popup.popup_intervall !== null) {
				window.clearInterval(DZ.login_popup.popup_intervall);
			}
			if (DZ.login_popup.popup !== null) {
				DZ.login_popup.popup = null;
			}
		},

		watch_close: function() {
			if (DZ.login_popup.popup_intervall !== null) {
				window.clearInterval(DZ.login_popup.popup_intervall);
			}

			if (DZ.login_popup.popup === null) {
				return false;
			}

			DZ.login_popup.popup_intervall = window.setInterval(function() {
				if (DZ.login_popup.popup.closed) {

					DZ.login_popup.clear_close();

					DZ.Event.triggerEvent({
						evt: 'login',
						args: {
							// #token|null|null
							authResponse: {
								accessToken: null,
								expire: null
							},
							status: null,
							userID: null
						}
					});
				}
			}, DZ.login_popup.popup_intervall_time);

			return true;
		}
	},

	getLoginStatus: function(callback) {
		try {
			if (!DZ.initialized) {
				throw DZ.Exception('init');
			}

			/** MANAGE EVENT * */
			DZ.Event.subscribe('login', DZ.loginCommonCallback, true);
			if (typeof callback === 'function') {
				DZ.Event.subscribe('login', callback, true);
			}

			if (DZ.getLoginStatusRunning) {
				return false;
			}

			DZ.getLoginStatusRunning = true;

			// retrieve cookie
			var currentAuthResponse = DZ.util.getCookie('currentAuthResponse');
			var cookieIsValid = false;

			if (currentAuthResponse !== '') {
				currentAuthResponse = JSON.parse(currentAuthResponse);
				if (currentAuthResponse.authResponse) {
					cookieIsValid = (currentAuthResponse.authInitDate + (currentAuthResponse.authResponse.expire * 1000)) > Date.now();
				}
			}

			if (!cookieIsValid) {
				var connect_frame = document.createElement('iframe');
				connect_frame.style.display = 'none';
				var src = DZ.SETTING_HOST_CONNECT + '/oauth/auth.php?';
				var arg = [];

				arg.push('app_id=' + DZ.app_id);
				arg.push('format=channel');
				arg.push('redirect_uri=' + this.channelUrl);
				arg.push('response_type=token');

				src = src + arg.join('&');

				connect_frame.onload = function() {
					document.getElementById('dz-root').removeChild(connect_frame);
				};
				connect_frame.src = src;
				document.getElementById('dz-root').appendChild(connect_frame);

				return true;

			}

			currentAuthResponse.fromCookie = true;
			currentAuthResponse.authResponse.expire = ((currentAuthResponse.authResponse.expire * 1000) - (Date.now() - currentAuthResponse.authInitDate)) / 1000;

			window.setTimeout(function() {

				DZ.Event.triggerEvent({
					evt: 'login',
					args: currentAuthResponse
				});

			}, 0);

		} catch (e) {
			DZ.catchException(e);
		}
	},

	loginCommonCallback: function(response) {
		try {

			if (response.error) {
				setTimeout(function() {
					throw DZ.Exception();
				}, 0);
				return;
			}

			if (typeof response.reconnect !== 'undefined') {
				DZ.communication.callAppMethod('DZ.dispatchReconnect', true);
				return;
			}

			if (typeof response.authResponse !== 'undefined' && response.authResponse !== null) {
				// init variables
				DZ.token = response.authResponse.accessToken;
				DZ.tokenExpire = response.authResponse.expire;
				DZ.user_id = response.userID;
				DZ.user = {
					id: response.userID
				};

				if (typeof response.fromCookie === 'undefined') {
					response.authInitDate = Date.now();
					DZ.util.setCookie('currentAuthResponse', JSON.stringify(response), null);
				}

				if (DZ.tokenExpire > 0) {

					window.clearTimeout(DZ.tokenExpireTimeout);
					DZ.tokenExpireTimeout = window.setTimeout(function() {

						DZ.getLoginStatus();

					}, (DZ.tokenExpire) * 1000);
				}
				if (DZ.has_player) {
					DZ.player.onLogin();
				}
			}

			DZ.getLoginStatusRunning = false;

		} catch (e) {
			DZ.catchException(e);
		}
	},

	logout: function(callback) {
		try {
			if (!DZ.initialized) {
				throw DZ.Exception('init');
			}

			DZ.Event.subscribe('logout', DZ.logoutCommonCallback);

			if (typeof callback === 'function') {
				DZ.Event.subscribe('logout', callback, true);
			}

			var logout_frame = document.createElement('iframe');
			logout_frame.style.display = 'none';
			var src = DZ.SETTING_HOST_CONNECT + '/logout.php?';

			var arg = [];

			arg.push('app_id=' + DZ.app_id);
			arg.push('format=channel');
			arg.push('redirect_uri=' + this.channelUrl);
			arg.push('response_type=token');

			src += arg.join('&');

			logout_frame.onload = function() {
				document.getElementById('dz-root').removeChild(logout_frame);
			};
			logout_frame.src = src;
			document.getElementById('dz-root').appendChild(logout_frame);

		} catch (e) {
			DZ.catchException(e);
		}
	},

	logoutCommonCallback: function() {
		try {
			// reset variables
			DZ.tokenExpireTimeout = null;
			DZ.token = null;
			DZ.tokenExpire = null;
			DZ.user_id = null;
			DZ.user = null;

			// reset cookie
			DZ.util.setCookie('currentAuthResponse', '', -1);

			if (DZ.has_player) {
				DZ.player.onLogout();
			}
		} catch (e) {
			DZ.catchException(e);
		}
	},

	initChannel: function() {
		try {
			return DZ.communication.initChannel();
		} catch (e) {
			DZ.catchException(e);
		}
	}
};
DZ.api = function() {
	try {
		// if(!DZ.initialized) throw DZ.Exception('init');
		var path = null, request_method = 'get', args = null, callback = false;
		switch (arguments.length) {
			case 1:
				path = arguments[0];
				break;
			case 2:
				path = arguments[0];
				callback = arguments[1];
				break;
			case 3:
				path = arguments[0];
				if (typeof arguments[1] === 'string') {
					request_method = arguments[1];
				} else {
					args = arguments[1];
				}
				callback = arguments[2];
				break;
			case 4:
				path = arguments[0];
				request_method = arguments[1];
				args = arguments[2];
				callback = arguments[3];
				break;
			default:
				break;
		}
		callback = callback || function() {
		};
		if (path === null || path === '') {
			callback({
				error: 'no path defined'
			});
			return false;
		}
		DZ.SIMPLE_API.apiCall(path, request_method, args, callback);
	} catch (e) {
		DZ.catchException(e);
	}
};
DZ.SIMPLE_API = {
	callbacks: {},
	apiCall: function(path, request_method, args, callback) {
		try {
			if (path[0] !== '/')
				path = '/' + path;
			var path_splitted = path.split('?');
			var path_args = [];
			if (path_splitted.length > 1) {
				path = path_splitted[0];
				path_args = path_splitted[1].split('&');
			}
			path = DZ.SETTING_HOST_API + path;
			if (request_method !== 'get') {
				path_args.push('request_method=' + request_method);
			}

			if (args !== null) {
				for (var property in args) {
					path_args.push(property + '=' + encodeURIComponent(args[property]));
				}
			}
			path_args.push('output=jsonp');
			if (DZ.token !== null)
				path_args.push('access_token=' + DZ.token);

			path_args.push('version=js-v' + DZ._version);

			DZ.request._send({
				path: path,
				path_args: path_args,
				callback: callback,
				callback_name: 'callback'
			});

		} catch (e) {
			DZ.catchException(e);
		}
	}
};DZ.css = {
	init: function() {
		var css = [];
		for (var key in DZ.css.rules) {
			css.push(key + '{' + DZ.css.rules[key] + '}');
		}
		DZ.query('head').append('<style type=\'text/css\'>' + css.join('') + '</style>');
	},

	rules: {

		'.dz-widget': 'display:inline-block;position:relative;',
		'.dz-reset':
			'background: none;' +
			'border-spacing: 0;' +
			'border: 0;' +
			'color: black;' +
			'cursor: auto;' +
			'direction: ltr;' +
			'font-family: "lucida grande", tahoma, verdana, arial, sans-serif;' +
			'font-size: 11px;' +
			'font-style: normal;' +
			'font-variant: normal;' +
			'font-weight: normal;' +
			'letter-spacing: normal;' +
			'line-height: 1;' +
			'margin: 0;' +
			'overflow: visible;' +
			'padding: 0;' +
			'text-align: left;' +
			'text-decoration: none;' +
			'text-indent: 0;' +
			'text-shadow: none;' +
			'text-transform: none;' +
			'visibility: visible;' +
			'white-space: normal;' +
			'word-spacing: normal;',

		'.dz-widget.dz-follow': ''
	}
};DZ.error = {

	getError: function(error_type) {
		var error = {
			type: 'COMMON',
			message: DZ.error.errors.COMMON
		};
		if (typeof error_type === 'string' && typeof DZ.error.errors[error_type] !== 'undefined') {
			error.type = error_type;
			error.message = DZ.error.errors[error_type];
		}
		return error;
	},

	errors: {
		COMMON: 'An error has occured',

		PLAYER_DATA_ALBUM_ID: 'Album id doesn\'t exists !',
		PLAYER_DATA_PLAYLIST_ID: 'Playlist id doesn\'t exists !',
		PLAYER_DATA_TRACK_LIST: 'An error has occured with the track list you tried to load',
		PLAYER_DATA_PODCAST_ID: 'Podcast id doesn\'t exists !'
	}
};
var follow = {

	plugin_type: 'follow',

	user_id: null,

	init: function(options) {

		if (typeof options === 'undefined' || typeof options.uid === 'undefined') {
			return false;
		}

		var user_id = parseInt(options.uid, 10);

		if (user_id <= 0) {
			return false;
		}

		var width = 300;
		if (typeof options.width !== 'undefined') {
			width = parseInt(options.width, 10);
		}

		$('.dz-global').css({
			width: width + 'px'
		});

		follow.user_id = user_id;

		Events.ready(Events.user.userReady, function() {
			Events.subscribe(Events.user.addFavorite, follow.onAddFavorite);
			Events.subscribe(Events.user.deleteFavorite, follow.onDeleteFavorite);

			if (userData.isFavorite('user', options.uid)) {
				follow.setButtonStatus('unfollow');
			} else {
				follow.setButtonStatus('follow');
			}
		});

		follow.sendResize($('.dz-follow').outerWidth(true));
		return true;
	},

	setButtonStatus: function(status) {
		var text = '';
		var action = {};
		if (status === 'follow') {
			text = gettext('Suivre');
			action = follow.action_follow;
		} else if (status === 'unfollow') {
			text = gettext('Ne plus suivre');
			action = follow.action_unfollow;
		} else {
			return false;
		}

		$('.dz-follow .dz-btn-follow a.dz-btn').unbind('click').bind('click', action).find('.dz-label').html(text);

		follow.sendResize($('.dz-follow').outerWidth(true));
	},

	onAddFavorite: function(evt, data) {

		if (typeof evt.from_iframe !== 'undefined') {
			data = evt;
		}

		if (typeof data.type === 'undefined' || data.type !== 'user') {
			return false;
		}

		if (typeof data.id === 'undefined' || data.id !== follow.user_id) {
			return false;
		}

		if (typeof data.from_iframe === 'undefined') {

			DZ.communication.callAppMethod('DZ.framework.dispatchIframesEvent', {
				plugin_type: follow.plugin_type,
				iframe_id: DZ.iframe_id,
				method: 'follow.onAddFavorite',
				method_data: {
					type: 'user',
					USER_ID: data.id,
					from_iframe: true
				},
				event_data: {
					uid: data.id
				}
			});

		}

		follow.setButtonStatus('unfollow');

	},

	onDeleteFavorite: function(evt, data) {

		if (typeof evt.from_iframe !== 'undefined') {
			data = evt;
		}

		if (typeof data.type === 'undefined' || data.type !== 'user') {
			return false;
		}

		if (typeof data.id === 'undefined' || data.id !== follow.user_id) {
			return false;
		}

		if (typeof data.from_iframe === 'undefined') {

			DZ.communication.callAppMethod('DZ.framework.dispatchIframesEvent', {
				plugin_type: follow.plugin_type,
				iframe_id: DZ.iframe_id,
				method: 'follow.onDeleteFavorite',
				method_data: {
					type: 'user',
					USER_ID: data.id,
					from_iframe: true
				},
				event_data: {
					uid: data.id
				}
			});

		}

		follow.setButtonStatus('follow');

	},

	action_before: function() {
		if (USER.USER_ID > 0) {
			return true;
		}
		DZ.login(function() {
		}, {
			response_type: 'connect'
		});
		return false;
	},

	action_unfollow: function() {
		if (!follow.action_before()) {
			return false;
		}
		favorite.remove({
			id: follow.user_id,
			type: 'user'
		});
	},

	action_follow: function() {
		if (!follow.action_before()) {
			return false;
		}
		favorite.add({
			id: follow.user_id,
			type: 'user'
		});
	},

	sendResize: function(width, height) {
		if (typeof height === 'undefined') {
			height = null;
		}
		DZ.communication.callAppMethod('DZ.framework.resizeIframe', {
			plugin_type: follow.plugin_type,
			iframe_id: DZ.iframe_id,
			width: width,
			height: height
		});
	}
};
DZ.Event = {

	SDK_READY: 'ready',

	MUSIC_END: 'music.end',
	MUSIC_START: 'music.start',
	PLAYER_LOADED: 'player.loaded',

	// Namespaces :
	common: {
		ERROR: 'on_error'
	},
	player: {
		LOADED: 'player_loaded',

		PLAY: 'player_play',
		PAUSED: 'player_paused',
		POSITION_CHANGED: 'player_position',

		TRACK_END: 'track_end',

		VOLUME_CHANGED: 'volume_changed',
		SHUFFLE_CHANGED: 'shuffle_changed',
		REPEAT_CHANGED: 'repeat_changed',
		MUTE_CHANGED: 'mute_changed',

		BUFFERING_CHANGED: 'player_buffering',
		CURRENT_TRACK: 'current_track',

		TRACKS_ORDER_CHANGED: 'tracklist_changed',

		TRACKS_LOADED: 'player_track_loaded', /* not public ! */

		_TRACKS_LOADED: 'player_track_loaded', /* just in case */
		_PRELOAD_TRACKS_END: 'preload_tracks_end' /* not public ! */

	},

	ui: {
		APPREQUEST_CLOSED: 'dz_ui_apprequest_closed'
	},

	notification: {
		ON_NEW: 'new_notification'
	},

	navigation: {
		PAGE_CHANGED: 'page_changed'
	},

	canvas: {
		SCROLL_BOTTOM: 'scroll_bottom'
	},

	framework: {
		'follow.onDeleteFavorite': 'plugin_on_unfollow',
		'follow.onAddFavorite': 'plugin_on_follow'
	},

	callbacks: {
		'music.end': [],
		'music.start': [],
		'player.loaded': []
	},

	/** * Deferred Objects * */
	deferredObjects: {},
	ready: function(evt, callback) {
		try {
			if (typeof evt !== 'string') {
				return false;
			}
			if (typeof callback !== 'function') {
				return false;
			}
			if (typeof DZ.Event.deferredObjects[evt] === 'undefined') {
				DZ.Event.deferredObjects[evt] = {

					evt: evt,
					callbacks: [],
					resolved: false,
					resolved_params: null
				};
			}
			if (DZ.Event.deferredObjects[evt].resolved) {
				callback(DZ.Event.deferredObjects[evt].resolved_params, DZ.Event.deferredObjects[evt].evt);
			} else {
				DZ.Event.deferredObjects[evt].callbacks.push(callback);
			}
		} catch (e) {
			DZ.catchException(e);
		}
	},
	resolve: function(evt, args) {
		try {
			if (typeof evt !== 'string') {
				return false;
			}
			if (typeof DZ.Event.deferredObjects[evt] === 'undefined') {
				DZ.Event.deferredObjects[evt] = {
					evt: evt,
					resolved_params: args,
					resolved: true,
					callbacks: []
				};
			}
			DZ.Event.deferredObjects[evt].resolved = true;
			DZ.Event.deferredObjects[evt].resolved_params = args;
			if (DZ.Event.deferredObjects[evt].callbacks.length > 0) {
				for (var i = 0; i < DZ.Event.deferredObjects[evt].callbacks.length; i++) {
					var callback = DZ.Event.deferredObjects[evt].callbacks[i];
					callback(DZ.Event.deferredObjects[evt].resolved_params, DZ.Event.deferredObjects[evt].evt);
				}
			}
			DZ.Event.deferredObjects[evt].callbacks = null;
			return true;
		} catch (e) {
			DZ.catchException(e);
		}
	},

	/** * once = execute once; By default, callbacks suscribing to an event are executed whenever the event is triggered ** */
	subscribe: function(evt, callback, once) {
		try {
			if (!DZ.initialized && evt !== DZ.Event.SDK_READY) {
				throw DZ.Exception('init');
			} else if (typeof callback === 'object') {
				return DZ.Event.subscribeList(evt, callback, once);
			}

			if (once) {
				callback.once = true;
			}

			switch (evt) {
				case DZ.Event.MUSIC_END:
				case DZ.Event.MUSIC_START:
					DZ.Event.callbacks[evt].push(callback);
					break;
				default:
					if (typeof DZ.Event.callbacks[evt] === 'undefined') {
						DZ.Event.callbacks[evt] = [];
					}

					DZ.Event.callbacks[evt].push(callback);
					break;
			}
		} catch (e) {
			DZ.catchException(e);
		}
	},

	subscribeList: function(evt, callbacks, once) {
		try {
			for (var i = 0; i < callbacks.length; i++) {
				DZ.Event.subscribe(evt, callbacks[i], once);
			}
		} catch (e) {
			DZ.catchException(e);
		}
	},

	unsubscribe: function(evt) {
		try {
			if (!DZ.initialized) {
				throw DZ.Exception('init');
			}

			if (!evt || typeof DZ.Event.callbacks[evt] === 'undefined') {
				return false;
			}

			DZ.Event.callbacks[evt] = [];
		} catch (e) {
			DZ.catchException(e);
		}
	},

	eventTriggered: function(response) {
		try {
			return DZ.EVENT.triggerEvent(response);
		} catch (e) {
			DZ.catchException(e);
		}
	},

	trigger: function(evt, args) {
		if (typeof evt !== 'string') {
			return false;
		}
		if (typeof args === 'undefined') {
			args = null;
		}
		var response = {
			evt: evt,
			args: args
		};
		DZ.Event.triggerEvent(response);
	},
	triggerEvent: function(response) {
		try {
			var args = (typeof response.args === 'undefined') ? null : response.args;
			if (response.evt && DZ.Event.callbacks[response.evt]) {
				var nbToExecute = DZ.Event.callbacks[response.evt].length;
				for (var i = 0; i < nbToExecute; i++) {
					DZ.Event.callbacks[response.evt][i](args, response.evt);
					DZ.Event.callbacks[response.evt][i].executed = true;
				}
				var cleanedCallbacks = [];
				for (var i = 0; i < DZ.Event.callbacks[response.evt].length; i++) {
					if (!DZ.Event.callbacks[response.evt][i].executed || !DZ.Event.callbacks[response.evt][i].once) {
						cleanedCallbacks.push(DZ.Event.callbacks[response.evt][i]);
					}
				}
				DZ.Event.callbacks[response.evt] = cleanedCallbacks;
			}
		} catch (e) {
			DZ.catchException(e);
		}
	},

	/* Maintain these function names ... */
	suscribe: function(evt, callback, once) {
		DZ.Event.subscribe(evt, callback, once);
	},
	suscribeList: function(evt, callbacks, once) {
		DZ.Event.subscribeList(evt, callbacks, once);
	},
	unsuscribe: function(evt) {
		DZ.Event.unsubscribe(evt);
	}

};
DZ.Events = DZ.Event;DZ.displayException = function(e) {
	if (typeof console === 'undefined' || typeof console.error === 'undefined') {
		return;
	}
	if (typeof e !== 'object') {
		console.error(e);
	} else {
		console.error(document.location.href);
		console.error(e.message);
		console.error(e.stack);
	}
};

DZ.log = function() {
};

DZ.catchException = function(e) {
	DZ.displayException(e);
};

DZ.initException = function() {
	if (typeof console === 'undefined' || typeof console.log === 'undefined' || typeof console.error === 'undefined') {
		window.console = {
			log: function() {
				return;
			},
			error: function() {
				return;
			}
		};
	}
};

DZ.Exception = function(type) {
	var message;
	if (typeof type !== 'undefined') {
		message = typeof DZ.Exceptions[type] === 'undefined' ? type : DZ.Exceptions[type];
	} else {
		message = DZ.Exceptions.common;
	}

	if (DZ.DEBUG) {
		var exception = new Error(message);
		if (typeof exception.stack !== 'undefined') {
			exception.stack = exception.stack.replace('Error:', DZ.Exceptions.type + ':');
		}
		return exception; // exception.name + " : "+ exception.message;
	}

	return message;
};

DZ.Exceptions = {
	type: 'DzError',
	common: 'An error has occured, please retry your action',
	init: 'DZ has not been initialized, you must call DZ.init(options) first !',
	channelUrl: 'You must define a channelUrl !',

	'dz-root': 'dz-root is not defined',

	XD_ERROR: 'Cannot access to top window, Your channel domain, protocol and port must match with your top frame.',

	PLAYER_NOT_LOADED: 'You must load a player first !',

	COMMUNICATION_SECURITY: 'SECURITY EXCEPTION, you are not supposed to use this function !'
};
DZ.deezer = {

	loadbox: function(page) {
		loadBox(page);
	},

	subscribeEvents: function() {

		Events.addEvent('DZ', Events.user.addFavorite, function(evt, params) {

			DZ.communication.callAppMethod('DZ.framework.onFavorite', {
				type: params.type,
				id: params.id,
				value: true
			});
		});

		Events.addEvent('DZ', Events.user.deleteFavorite, function(evt, params) {

			DZ.communication.callAppMethod('DZ.framework.onFavorite', {
				type: params.type,
				id: params.id,
				value: false
			});
		});
	},

	addToPlaylist: function(arg) {
		var song_ids = arg.tracks;

		for (var i = 0; i < song_ids.length; i++) {
			song_ids[i] = [song_ids[i], 0];
		}

		var frame_position = $(app.iframe).offset();

		var position = {
			x: arg.position.x + frame_position.left,
			y: arg.position.y + frame_position.top
		};

		api.call({
			method: 'song.getListAllData',

			data: {
				sng_ids: song_ids,
				user_id: USER.USER_ID
			},

			success: function(result, position) {
				musicbox.open(null, result.data, {
					position: 'mouse',
					x: position.x,
					y: position.y
				});
			},

			callback_parameters: position
		});

	},

	triggerBodyClick: function(val) {
		$('body').trigger('mouse' + val, true);
	},

	startDrag: function(param) {
		app.startDragElement(param.type, param.id);
	},

	setPage: function(pageObject) {
		var pathName = trim(pageObject.url, '/');
		var splitted = pathName.split('?');
		if (splitted.length > 1) {
			pageObject.location.search = '?' + splitted[1];
		}
		pageObject.location.pathname = '/' + splitted[0];
		app.setPage(pageObject.location);
	},

	setAddressValue: function(value) {
		var page = 'app/' + app.app_id + '/' + value;
		www.setCurrentPage(page);
	},

	share: function(obj) {
		if (typeof obj.type === 'undefined' || typeof obj.id === 'undefined') {
			return false;
		}
		var types = {
			track: 0,
			album: 1,
			artist: 2,
			playlist: 3
		};
		if (typeof types[obj.type] === 'undefined') {
			return false;
		}

		sharebox.load(types[obj.type], obj.id);
	},

	buy: function(obj) {
		if (typeof obj.type === 'undefined' || typeof obj.id === 'undefined') {
			return false;
		}
		var types = {
			track: true,
			album: true,
			playlist: true
		};
		if (typeof types[obj.type] === 'undefined') {
			return false;
		}

		loadFacebox('store/index.php?product_type=' + obj.type + '&product_id=' + obj.id);
	},

	follow: function(favorite_element) {
		var type = favorite_element.type;
		var id = favorite_element.id;

		api.call({
			method: 'user.getData',

			data: {
				user_id: id,
				array_default: ['USER_ID', 'DISPLAY_NAME', 'USER_PICTURE']
			},

			success: function(result, callback_parameters) {
				favorite.add({
					id: callback_parameters.id,
					type: 'user'
				});
			},

			callback_parameters: {
				type: type,
				id: id
			}
		});

		return true;
	},

	unfollow: function(favorite_element) {
		var type = favorite_element.type;
		var id = favorite_element.id;

		api.call({
			method: 'user.getData',

			data: {
				user_id: id,
				array_default: ['USER_ID', 'DISPLAY_NAME', 'USER_PICTURE']
			},

			success: function(result, callback_parameters) {
				favorite.remove({
					id: callback_parameters.id,
					type: 'user'
				});
			},

			callback_parameters: {
				type: type,
				id: id
			}
		});

		return true;
	},

	addFavorite: function(favorite_element) {
		favorite.add(favorite_element);

		return true;
	},

	removeFavorite: function(favorite_element) {
		favorite.remove(favorite_element);
	},

	askFavorites: function(send_queue) {
		var callback_values = {};
		for (var type in send_queue) {
			// album / playlist / artist / radio / user
			callback_values[type] = [];
			for (var i = 0; i < send_queue[type].length; i++) {
				callback_values[type][i] = {
					id: send_queue[type][i],
					value: userData.isFavorite(type, send_queue[type][i])
				};
			}
		}

		DZ.communication.callAppMethod('DZ.framework.callbackQueue', callback_values);
	},

	ui: {
		register: function(options) {
			if (typeof USER !== 'undefined' && typeof USER.USER_ID !== 'undefined' && parseInt(USER.USER_ID, 10) > 0) {
				return false;
			}
			var url_id = app.app_id;
			if (app.app_data.INAPP_ALIAS !== '') {
				url_id = app.app_data.INAPP_ALIAS;
			}
			var redirect_link = 'app/' + url_id;

			if (typeof options !== 'undefined' && typeof options.redirect_uri === 'string') {
				redirect_link += '/' + ltrim(options.redirect_uri, ' /');
			}

			modal.open('/lightbox/register.php?redirect_type=page&redirect_link=' + encodeURIComponent(redirect_link) + '&app_id=' + app.app_id);
			return true;
		},

		appRequest_opened: false,

		appRequest: function(options) {
			var error = false;

			if (DZ.deezer.ui.appRequest_opened) {
				error = true;
			}
			if (typeof options.to === 'undefined') {
				error = true;
			}
			if (typeof options.id_request === 'undefined') {
				error = true;
			}

			if (error) {
				DZ.communication.callAppMethod('DZ.Event.triggerEvent', {
					evt: DZ.Event.ui.APPREQUEST_CLOSED + '_' + options.id_request,
					args: {
						status: false,
						error: true
					}
				});
				return false;
			}

			var message = typeof options.message !== 'undefined' ? options.message : '';

			var id_modal = modal.open('/lightbox/apprequest.php?to=' + options.to.join(',') + '&app_id=' + DZ.app_id + '&message=' + encodeURIComponent(message));

			DZ.deezer.ui.appRequest_opened = true;

			Events.subscribeOnce(Events.lightbox.close + '_' + id_modal, function(evt, args) {
				DZ.deezer.ui.appRequest_opened = false;
				DZ.communication.callAppMethod('DZ.Event.triggerEvent', {
					evt: DZ.Event.ui.APPREQUEST_CLOSED + '_' + options.id_request,
					args: {
						status: args
					}
				});

			});

			return true;
		}
	}

};
DZ.notification = {
	deezer: {
		subscribeEvents: function() {
			Events.addEvent('DZ', Events.live.newNotif, function(evt, notif) {
				if (typeof notif.ACTION !== 'undefined' && notif.ACTION === 'APPLICATION_NOTIFICATION' && typeof notif.APP_ID !== 'undefined' && notif.APP_ID === app.app_id) {
					var app_notif = {
						action_label: notif.ACTION_OPTIONS.LABEL,
						action_uri: notif.ACTION_OPTIONS.URI,
						message: notif.MESSAGE
					};

					notifications.read([notif.NOTIFICATION_ID]);

					DZ.communication.callAppMethod('DZ.notification.receiveNotif', app_notif);
				}
			});
		}
	},

	receiveNotif: function(notif) {
		DZ.Events.trigger(DZ.Events.notification.ON_NEW, notif);
	}
};DZ.communication = {
	postMessage: false,

	testPostMessage: function() {
		return Boolean(window.postMessage);
	},

	test: function() {
	},

	initialized: false,
	init: function() {
		try {
			if (DZ.communication.initialized) {
				return true;
			}
			if (DZ.communication.testPostMessage()) {
				DZ.communication.postMessage = true;
				if (window.addEventListener) {
					window.addEventListener('message', DZ.communication.receive, false);
				} else {
					window.attachEvent('onmessage', DZ.communication.receive);
				}
			}
			DZ.communication.initialized = true;
			return true;
		} catch (e) {
			DZ.catchException(e);
		}
	},

	initChannel: function() {
		try {
			var return_value = false;
			var hashSplitted = unescape(window.document.location.hash).substr(1).split('|');

			if (hashSplitted.length > 0) {
				var type = hashSplitted[0];
				if (type === 'channel') {
					// WE ARE IN A CHANNEL, WE COMMUNICATE VIA PROXY
					DZ.communication.proxy_channel(hashSplitted);
					return_value = true;

				} else if (type === 'token') {

					var windowroot = window.opener || window.parent;
					var access_token = hashSplitted[1];
					var authResponse = {
						authResponse: {
							accessToken: null,
							expire: null
						},
						status: 'notconnected',
						userID: null
					};

					var trigger_event = 'login';

					if (access_token === 'logout') {

						trigger_event = 'logout';
						access_token = 'null';

					} else if (access_token !== 'null' && access_token !== 'exception') {

						var token = access_token.split('&');
						var expire = token[1].split('=')[1] * 1;
						token = token[0].split('=')[1];
						authResponse.authResponse.accessToken = token;
						authResponse.authResponse.expire = expire;
						authResponse.status = 'connected';
						authResponse.userID = hashSplitted[2];

					} else {

						authResponse.status = hashSplitted[2];
						if (access_token === 'exception') {
							authResponse.error = true;
						}
						authResponse.authResponse = null;

					}

					if (typeof windowroot.DZ === 'undefined') {
						throw DZ.Exception('XD_ERROR');
					}

					windowroot.DZ.Event.triggerEvent({
						evt: trigger_event,
						args: authResponse
					});
					return_value = true;
					window.close();
				} else if (type === 'connect') {
					// EXEMPLE : follow.js:147
					window.opener.DZ.Event.triggerEvent({
						evt: 'login',
						args: {
							reconnect: true
						}
					});
					window.close();
				} else if (type === 'widget_play_popup') {
					if (DZ.communication._canAccessOpener()) {
						window.opener.location.href += '&autoplay=true';
					}
					window.close();
				}
			}
			return return_value;
		} catch (e) {
			DZ.catchException(e);
		}
	},

	_canAccessOpener: function() {
		try {
			return Boolean(window.opener !== null && window.opener.document);
		} catch (e) {
			return false;
		}
	},

	proxy_send: function(message, domain) {
		try {
			var channelUrl = DZ.channelUrl;

			if (domain === 'deezer') {
				channelUrl = (DZ.SETTING_HOST_SITE) + '/plugins/channel.php';
			}

			var channel_message = String(JSON.stringify(message));
			channel_message = channel_message.replace(/\|/g, '{pipe}');

			channelUrl = channelUrl + '#channel|' + channel_message;

			var iframeChannel = window.document.createElement('iframe');
			iframeChannel.id = 'DZ_channel';
			iframeChannel.src = channelUrl;
			iframeChannel.style.display = "none";
			iframeChannel.onload = function() {
				window.document.getElementById('dz-root').removeChild(iframeChannel);
			};
			window.document.getElementById('dz-root').appendChild(iframeChannel);
			/*
			 * Then in the iframe DZ.initChannel(); => hashSplitted = window.document.location.hash.substr(1).split('|'); => DZ.communication.proxy_channel(hashSplitted);
			 */
		} catch (e) {
			DZ.catchException(e);
		}
	},
	proxy_channel: function(hashSplitted) {
		try {
			var message = hashSplitted[1];
			message = message.replace(/{pipe}/g, '|');

			try {
				message = eval('(' + message + ')');
			} catch (e) {
				return false;
			}

			if (typeof message === 'undefined') {
				return false;
			}

			var target = eval('window.parent.' + message.framePath);
			target.DZ.communication.receive(message);
		} catch (e) {
			DZ.catchException(e);
		}
	},

	/**
	 * Calls an app method. This function should be used from the *deezer main frame*.
	 *
	 * @param {String} method - The app method name to invoke
	 * @param {Object} args - The arguments for the method call
	 */
	callAppMethod: function(method, args) {
		var framePath = '';
		if (typeof DZ.inapp !== 'undefined') {
			framePath = 'frames.dzapp';
		} else {
			framePath = 'parent';
		}
		DZ.communication.send(framePath, method, args, 'app');
	},

	/**
	 * Calls a Deezer method. This function should be used from the *app main frame*
	 *
	 * @param {String} method - The deezer method name to invoke
	 * @param {Object} args - The arguments for the method call
	 */
	callDeezerMethod: function(method, args) {
		var framePath = '';
		if (typeof DZ.inapp !== 'undefined') {
			framePath = 'parent';
		} else {
			framePath = 'frames.dzplayer';
		}
		DZ.communication.send(framePath, method, args, 'deezer');
	},

	/**
	 * Calls a Plugin method. This function should be used from the *app main frame*
	 *
	 * @param {String} iframe_id - The iframe ID
	 * @param {String} method - The plugin method name to invoke
	 * @param {Object} args - The arguments for the method call
	 */
	callPluginMethod: function(iframe_id, method, args) {

		if (typeof DZ.inapp !== 'undefined') {
			return false;
		}

		var framePath = 'frames.' + iframe_id;

		DZ.communication.send(framePath, method, args, 'deezer', true);
	},

	/**
	 * Sends a message to an iframe
	 *
	 * @param {String} framePath - The iframe to send the message to.
	 *     Acceptable values are 'parent', 'parent.parent', 'top', 'opener', 'parent.opener', 'frames.dzapp'
	 * @param {String} method - The remote method name.
	 * @param {Object} args - The arguments for the remote method
	 * @param {String} domain - 'deezer', 'app'
	 * @param {Boolean} plugin
	 */
	send: function(framePath, method, args, domain, plugin) {
		try {
			domain = typeof domain === 'undefined' ? 'app' : domain;

			if (typeof plugin !== 'boolean') {
				plugin = false;
			}

			if (domain === 'deezer') {
				if (typeof DZ.inapp !== 'undefined') {
					framePath = 'parent';
				} else if (!plugin) {
					framePath = 'frames.dzplayer';
				}
			} else if (typeof DZ.inapp !== 'undefined') {
				framePath = 'frames.dzapp' + app.nbIframes;
			} else {
				framePath = 'parent';
			}

			var message = {
				method: method,
				args: args
			};

			if (DZ.communication.postMessage) {
				var iframeToSend = null;
				if (typeof DZ.inapp !== 'undefined' && framePath === 'frames.dzplayer') {
					framePath = 'parent';
				}
				if (typeof DZ.inapp !== 'undefined' && framePath === 'parent' && domain === 'app') {
					framePath = 'frames.dzapp';
				}

				if (framePath === 'frames.dzplayer') {
					iframeToSend = DZ.player.player_iframe.contentWindow;
				} else {
					iframeToSend = eval('window.' + framePath);
				}
				if (iframeToSend) {
					iframeToSend.postMessage(JSON.stringify(message), '*');
				}
			} else {
				message.framePath = framePath;
				DZ.communication.proxy_send(message, domain);
			}
		} catch (e) {
			DZ.catchException(e);
		}
	},

	/**
	 * Processes a remote message event.
	 *
	 * The remote data in `evt` is expected to be a JSON object containing two properties:
	 * - {String} method - A method name starting with the DZ namespace
	 * - {Object} args - The method arguments
	 *
	 * @param {MessageEvent} evt - The remote message.
	 * @returns {Boolean} False if an error was found
	 */
	receive: function(evt) {
		try {

			var data = evt;

			if (typeof evt.data !== 'undefined') {
				data = evt.data;
			}

			if (typeof data === 'string') {
				try {
					data = eval('(' + data + ')');
				} catch (e) {
					return false;
				}
			}

			if (typeof data.method === 'undefined') {
				return false;
			}

			var fct = data.method.split('.');
			var fctToCall;
			if (fct.length > 0 && fct[0] === 'DZ') {
				fctToCall = window;
				for (var i = 0; i < fct.length; i++) {
					if (typeof fctToCall[fct[i]] !== 'undefined') {
						fctToCall = fctToCall[fct[i]];
					} else {
						throw DZ.Exception('COMMUNICATION_SECURITY');
					}
				}
				if (typeof fctToCall !== 'function') {
					throw DZ.Exception('COMMUNICATION_SECURITY');
				}
			} else {
				// What is called here does not interest us...
				return false;
			}
			fctToCall(data.args);
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	}
};
DZ.notify = {
	layer_container: null,
	messages: {
		'logged30': true,
		'notLogged30': true,
		'simultaneousAccess': true,
		'flashUpdate': true
	},
	already_displayed: [],
	display: function(message) {
		try {
			/** OBFUSCATE CODE * */
			var DZ_notify_messages = DZ.notify.messages;
			var DZ_request = DZ.request;
			var DZ_notify_already_displayed = DZ.notify.already_displayed;
			var DZ_notify_display_callback = DZ.notify.display_callback;
			/** OBFUSCATE CODE * */

			if (typeof DZ_notify_messages[message] === 'undefined') {
				throw DZ.Exception('common');
			}
			if (message === 'logged30' || message === 'notLogged30') {
				// ONCE
				if (typeof DZ_notify_already_displayed[message] !== 'undefined' && DZ_notify_already_displayed[message]) {
					return false;
				}
				DZ_notify_already_displayed[message] = true;
			}
			var layer_url = DZ.SETTING_HOST_SITE + '/plugins/layer.php';
			DZ_request._send({
				path: layer_url,
				path_args: ['message=' + message, 'display=app', 'output=jsonp'],
				callback: DZ_notify_display_callback
			});
		} catch (e) {
			DZ.catchException(e);
		}
	},

	display_callback: function(json) {
		try {
			var html = (typeof json) !== 'undefined' && typeof (json.html !== 'undefined') ? json.html : null;
			if (html === null) {
				throw DZ.Exception('common');
			}
			if (DZ.notify.layer_container === null) {
				DZ.notify.layer_container = document.createElement('div');
				document.getElementById('dz-root').appendChild(DZ.notify.layer_container);
			}

			DZ.notify.layer_container.innerHTML = html;

		} catch (e) {
			DZ.catchException(e);
		}
	},

	close_layer: function() {
		try {
			if (DZ.notify.layer_container === null) {
				return false;
			}
			DZ.notify.layer_container.innerHTML = '';
		} catch (e) {
			DZ.catchException(e);
		}
	}
};DZ.player = {
	loaded: false,
	player_iframe: null,
	player_type: null,

	/**
	 * Init methods
	 */
	onLoad: function(settings) {
		DZ.player.loaded = true;
		if (typeof settings === 'string') {
			try {
				settings = eval('(' + settings + ')');
			} catch (e) {
				settings = {
					shuffle: false,
					volume: 1,
					repeat: 0,
					mute: false
				};
			}
		}

		DZ.player._core.volume = settings.volume;
		DZ.player._core.repeat = settings.repeat;
		DZ.player._core.shuffle = settings.shuffle;
		DZ.player._core.mute = settings.muted;

		if (typeof settings.current_track !== 'undefined' && typeof settings.current_track.id !== 'undefined') {
			DZ.player._core.onCurrentSong(settings.current_track.id);
		}

		DZ.Event.triggerEvent({
			evt: DZ.Event.player.LOADED,
			args: settings
		});
	},

	loadPlayer: function(options) {
		try {

			if (typeof options.player === 'undefined' || typeof options.appId === 'undefined') {
				throw 'An error has occured ! options.player undefined or options.appId undefined';
			}
			var appId = options.appId;
			options = options.player;

			var default_options = {
				playlist: false,
				cover: false
			};
			options = typeof options !== 'object' ? {} : options;

			DZ.util.extend(default_options, options);

			options.drawPlayer = false;
			if (typeof options !== 'undefined' && typeof options.container !== 'undefined') {
				options.drawPlayer = true;
			}

			if (options.drawPlayer && document.getElementById(options.container) === null) {
				throw 'id container does not exist !';
			}

			DZ.player.attachEvents();

			DZ.Event.subscribe(DZ.Event.player.LOADED, function(args, evt) {
				if (typeof args.inapp !== 'undefined') {
					delete (args.inapp);
				}
				DZ.Event.resolve(DZ.Event.SDK_READY, {
					token: {
						accessToken: DZ.token,
						expire: DZ.tokenExpire
					},
					player: args
				});

				if (typeof options.onload === 'function') {
					options.onload(args, evt);
				}
			});

			DZ.player.player_type = 'light';

			if (typeof DZ.inapp !== 'undefined') {
				DZ.player_iframe = window.parent;
				DZ.player._core.type = 'inapp_first_list';
				return true;
			}

			DZ.player.player_iframe = document.createElement('iframe');
			DZ.player.player_iframe.id = 'dzplayer';
			DZ.player.player_iframe.name = 'dzplayer';

			var src = DZ.SETTING_HOST_SITE + '/plugins/player.php?';
			var arg = [];

			var channelUrl = DZ.channelUrl;
			if (channelUrl === null) {
				channelUrl = document.location.href;
			}

			arg.push('channel=' + channelUrl);
			arg.push('app_id=' + appId);

			var iframeId = 'dz-root';
			if (options.drawPlayer) {
				if (typeof options.playlist !== 'undefined') {
					arg.push('playlist=' + (options.playlist ? 'true' : 'false'));
				}
				if (typeof options.width !== 'undefined') {
					arg.push('width=' + options.width);
				}
				if (typeof options.height !== 'undefined') {
					arg.push('height=' + options.height);
				}
				if (typeof options.format !== 'undefined') {
					arg.push('format=' + options.format);
				}
				if (typeof options.layout !== 'undefined') {
					arg.push('layout=' + options.layout);
				}
				if (typeof options.size !== 'undefined') {
					arg.push('size=' + options.size);
				}
				if (typeof options.color !== 'undefined') {
					arg.push('color=' + options.color);
				}
				if (typeof options.layout !== 'undefined') {
					arg.push('layout=' + options.layout);
				}
				if (typeof options.color !== 'undefined') {
					arg.push('color=' + options.color);
				}

				iframeId = options.container;

				DZ.player.player_iframe.style.display = 'block';
				DZ.player.player_iframe.style.height = (typeof options.height !== 'undefined') ? (options.height + 'px')
					: '100%';
				DZ.player.player_iframe.style.width = (typeof options.width !== 'undefined') ? (options.width + 'px')
					: '100%';
				DZ.player.player_iframe.style.border = '0px solid black';
				DZ.player.player_iframe.frameBorder = 'no';
				DZ.player.player_iframe.scrolling = 'no';
			} else {
				DZ.player.player_iframe.style.position = 'absolute';
				DZ.player.player_iframe.style.width = '10px';
				DZ.player.player_iframe.style.height = '20px';
				DZ.player.player_iframe.allowTransparency = 'true';
				DZ.player.player_iframe.style.backgroundColor = 'transparent';
				DZ.player.player_iframe.style.border = '0px solid black';
				DZ.player.player_iframe.frameBorder = 'no';
				DZ.player.player_iframe.scrolling = 'no';

				arg.push('emptyPlayer=true');
			}

			src += arg.join('&');

			DZ.player.player_iframe.src = src;

			document.getElementById(iframeId).appendChild(DZ.player.player_iframe);
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	/**
	 * Events methods
	 */
	receiveEvent: function(args) {
		try {
			if (typeof args === 'string') {
				try {
					args = eval('(' + args + ')');
				} catch (e) {
					console.log(e.stack);
					return false;
				}
			}

			var event = args.evt;
			var value = typeof args.val === 'undefined' ? null : args.val;
			if (typeof DZ.Event.player[event] !== 'undefined') {

				if (event === 'TRACKS_LOADED') {
					DZ.player._core.onLoadedInPlayer(value);
					var songs = value.tracks;
					args = {};
					if (typeof value.tracks !== 'undefined') {
						args = {
							tracks: songs
						};
					} else {
						if (typeof value.error !== 'string') {
							value.error = '';
						}
						args = {
							error: DZ.error.getError(value.error)
						};
					}
					DZ.Event.triggerEvent({
						evt: DZ.Event.player[event] + '_' + value.type + '_' + value.id,
						args: args
					});

				} else if (event === 'TRACKS_ORDER_CHANGED') {
					if (typeof value.type !== 'undefined' && value.type === 'order' && typeof value.order !== 'undefined' && value.order.length > 0) {
						DZ.player._core.changeOrder(value.order);
					}
					DZ.Event.triggerEvent({
						evt: DZ.Event.player[event],
						args: value
					});
				} else if (event === 'CURRENT_TRACK') {
					DZ.player._core.onCurrentSong(value);
					var track = DZ.player._core.getCurrentSong();
					DZ.Event.triggerEvent({
						evt: DZ.Event.player[event],
						args: {
							track: track,
							index: DZ.player._core.index
						}
					});
				} else if (event === 'NOTIFY') {
					DZ.notify.display(value);
				} else if (event === 'FB_LOGGED') {
					DZ.fb_logged = true;
				} else if (event === 'PLAY' || event === 'PAUSED') {
					DZ.Event.triggerEvent({
						evt: DZ.Event.player[event],
						args: DZ.Event.player[event]
					});
				} else {
					DZ.Event.triggerEvent({
						evt: DZ.Event.player[event],
						args: value
					});
				}
			}
		} catch (e) {
			DZ.catchException(e);
		}
	},

	attachEvents: function() {
		DZ.Event.subscribe(DZ.Event.player.LOADED, function() {
		}, true);

		// CORE METHODS
		var core_events = ['LOADED', 'PLAY', 'PAUSED', 'VOLUME_CHANGED', 'SHUFFLE_CHANGED', 'REPEAT_CHANGED',
				'MUTE_CHANGED'];
		for (var i = 0; i < core_events.length; i++) {
			DZ.Event.subscribe(DZ.Event.player[core_events[i]],
				DZ.player._core['on_' + DZ.Event.player[core_events[i]]]);
		}
	},

	/**
	 * Connection methods
	 */
	reconnect: function() {
		DZ.util.reload();
	},

	onLogin: function() {
		DZ.communication.send('frames.dzplayer', 'DZ.player_controler.onLogin', null, 'deezer');
	},

	onLogout: function() {
		DZ.communication.callDeezerMethod('DZ.player_controler.onLogout', null);
	},

	/**
	 * Control methods
	 */
	play: function() {
		try {
			if (!DZ.player.loaded) {
				throw DZ.Exception('PLAYER_NOT_LOADED');
			}
			if (!DZ.player._core.isRunning() || DZ.player.isPlaying()) {
				return false;
			}
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.doAction', {
				command: 'play'
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	pause: function() {
		try {
			if (!DZ.player.loaded) {
				throw DZ.Exception('PLAYER_NOT_LOADED');
			}
			if (!DZ.player._core.isRunning() || !DZ.player.isPlaying()) {
				return false;
			}
			DZ.communication.callDeezerMethod('DZ.player_controler.doAction', {
				command: 'pause'
			});
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	next: function() {
		try {
			if (!DZ.player.loaded) {
				throw DZ.Exception('PLAYER_NOT_LOADED');
			}
			if (!DZ.player._core.isRunning()) {
				return false;
			}
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.doAction', {
				command: 'nextSong'
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	prev: function() {
		try {
			if (!DZ.player.loaded) {
				throw DZ.Exception('PLAYER_NOT_LOADED');
			}
			if (!DZ.player._core.isRunning()) {
				return false;
			}
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.doAction', {
				command: 'prevSong'
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	seek: function(value) {
		try {
			if (!DZ.player.loaded) {
				throw DZ.Exception('PLAYER_NOT_LOADED');
			}
			if (!DZ.player._core.isRunning()) {
				return false;
			}
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.doAction', {
				command: 'seek',
				value: (value / 100)
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	/**
	 * Handle methods
	 */
	beforePlay: function() {
		if (DZ.fb_logged && DZ.token === null) {
			DZ.login(function() {
			}, {
				fb_login: true
			});
			DZ.fb_logged = false;
		}
	},

	getPlayArguments: function(args) {
		try {
			var return_args = {
				id: 0,
				index: 0,
				autoplay: true,
				callback: function() {
				},
				offset: 0
			};

			var types_index = {
				callbackFunction: 0,
				number: 0,
				bool: 0
			};

			for (var i = 1; i < args.length; i++) {
				var type = typeof args[i];
				switch (type) {
					case 'function':
						if (types_index.callbackFunction === 0) {
							return_args.callback = args[i];
						}
						types_index.callbackFunction++;
						break;
					case 'number':
						if (types_index.number === 0) {
							return_args.index = Math.max(0, parseInt(args[i], 0));
						}
						if (types_index.number === 1) {
							return_args.offset = args[i];
						}
						types_index.number++;
						break;
					case 'boolean':
						if (types_index.bool === 0) {
							return_args.autoplay = args[i];
						}
						types_index.bool++;
						break;
					default:
						break;
				}
			}

			return return_args;
		} catch (e) {

		}
	},

	commonPlay: function() {
		try {
			if (!DZ.player.loaded) {
				throw DZ.Exception('PLAYER_NOT_LOADED');
			}

			DZ.player.beforePlay();
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	/**
	 * Preloading
	 */
	isPreloadingTrack: false,

	preloadCallback: function() {
	},

	preloadTrackEnd: function(data) {
		try {
			if (typeof data.track_id === 'undefined') {
				return false;
			}
			DZ.player.isPreloadingTrack = false;

			DZ.player.preloadCallback(data);
		} catch (e) {
			DZ.catchException(e);
		}
	},

	preloadTrack: function(sng_id, callback) {
		try {
			if (typeof callback !== 'function') {
				callback = function() {
				};
			}

			if (DZ.player.isPreloadingTrack) {
				callback({
					track_id: sng_id,
					error: true,
					status: 'preloading'
				});
				return false;
			}

			DZ.player.isPreloadingTrack = true;
			DZ.player.preloadCallback = callback;

			DZ.communication.callDeezerMethod('DZ.player_controler.preloadTrack', sng_id);
			return true;
		} catch (e) {
			DZ.catchException(e);
		}
	},

	/**
	 * Play methods
	 */
	tracks_queuing: {},
	addToQueue: function(track_ids, callback) {
		try {
			if (DZ.player._core.type === 'playEpisodes') {
				return false;
			}

			var tracks = [];
			for (var i = 0; i < track_ids.length; i++) {
				var id = track_ids[i];
				if (!DZ.player._core.trackIdExists(id) && typeof DZ.player.tracks_queuing['id_' + id] === 'undefined') {
					tracks.push(id);
					DZ.player.tracks_queuing['id_' + id] = true;
				}
			}
			if (tracks.length === 0) {
				return false;
			}
			callback = typeof callback === 'undefined' ? function() {
			} : callback;
			var trackList = tracks.join('|');
			DZ.Event.subscribe(DZ.Event.player.TRACKS_LOADED + '_playTracks_' + trackList, [function(data) {
				if (typeof data.tracks !== 'undefined') {
					for (var i = 0; i < data.tracks.length; i++) {
						var track_id = data.tracks[i].id;
						if (typeof DZ.player.tracks_queuing['id_' + track_id] !== 'undefined') {
							delete DZ.player.tracks_queuing['id_' + track_id];
						}
					}
				}
				callback(data);
			}], true);
			DZ.player._core.setType('playTracks', trackList);
			DZ.communication.callDeezerMethod('DZ.player_controler.playTracks', {
				trackList: trackList,
				index: 0,
				autoplay: true,
				offset: 0,
				queue: true
			});
		} catch (e) {
			DZ.catchException(e);
		}
	},

	playTracks: function() {
		try {

			DZ.player.commonPlay();

			if (arguments.length === 0 || (typeof arguments[0] !== 'object')) {
				return false;
			}

			var playArguments = DZ.player.getPlayArguments(arguments);
			playArguments.tracks = arguments[0];

			var trackList = playArguments.tracks.join('|');

			DZ.Event.subscribe(DZ.Event.player.TRACKS_LOADED + '_playTracks_' + trackList, [function(data) {
				playArguments.callback(data);
			}], true);
			DZ.player._core.setType('playTracks', trackList);
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.playTracks', {
				trackList: trackList,
				index: playArguments.index,
				autoplay: playArguments.autoplay,
				offset: playArguments.offset
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
		}
	},

	playPlaylist: function() {
		try {
			DZ.player.commonPlay();
			if (arguments.length === 0 || (typeof arguments[0] !== 'number')) {
				return false;
			}

			var playArguments = DZ.player.getPlayArguments(arguments);
			playArguments.playlist_id = arguments[0];
			var playlistId = playArguments.playlist_id;

			DZ.Event.subscribe(DZ.Event.player.TRACKS_LOADED + '_playPlaylist_' + playlistId, [function(data) {
				playArguments.callback(data);
			}], true);
			DZ.player._core.setType('playPlaylist', playlistId);
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.playPlaylist', {
				playlist_id: playlistId,
				index: playArguments.index,
				autoplay: playArguments.autoplay,
				offset: playArguments.offset
			}, 'deezer');
			return true;
		} catch (e) {
			DZ.catchException(e);
		}
	},

	playAlbum: function() {
		try {

			DZ.player.commonPlay();
			if (arguments.length === 0 || (typeof arguments[0] !== 'string' && typeof arguments[0] !== 'number')) {
				return false;
			}

			var albumId = arguments[0].toString();
			var playArguments = DZ.player.getPlayArguments(arguments);

			DZ.Event.subscribe(DZ.Event.player.TRACKS_LOADED + '_playAlbum_' + albumId, [function(data) {
				playArguments.callback(data);
			}], true);
			DZ.player._core.setType('playAlbum', albumId);
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.playAlbum', {
				album_id: albumId,
				index: playArguments.index,
				autoplay: playArguments.autoplay,
				offset: playArguments.offset
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
		}
	},

	playEpisodes: function(episodeIds) {

		try {

			DZ.player.commonPlay();
			if (arguments.length === 0 || (typeof episodeIds !== 'object')) {
				return false;
			}

			var playArguments = DZ.player.getPlayArguments(arguments);
			playArguments.episodes = episodeIds;

			var episodeList = playArguments.episodes.join('|');

			DZ.Event.subscribe(DZ.Event.player.TRACKS_LOADED + '_playEpisodes_' + episodeList, [function(data) {
				playArguments.callback(data);
			}], true);
			DZ.player._core.setType('playEpisodes', episodeList);
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.playEpisodes', {
				episodeList: episodeList,
				index: playArguments.index,
				autoplay: playArguments.autoplay,
				offset: playArguments.offset
			}, 'deezer');

		} catch (e) {
			DZ.catchException(e);
		}
	},

	playPodcast: function(podcastId) {

		try {

			DZ.player.commonPlay();
			if (arguments.length === 0 || (typeof podcastId !== 'string' && typeof podcastId !== 'number')) {
				return false;
			}
			podcastId = podcastId.toString();
			var playArguments = DZ.player.getPlayArguments(arguments);

			DZ.Event.subscribe(DZ.Event.player.TRACKS_LOADED + '_playPodcast_' + podcastId, [function(data) {
				playArguments.callback(data);
			}], true);
			DZ.player._core.setType('playPodcast', podcastId);

			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.playPodcast', {
				podcast_id: podcastId,
				index: playArguments.index,
				autoplay: playArguments.autoplay,
				offset: playArguments.offset
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
		}
	},

	playRadio: function() {
		try {
			DZ.player.commonPlay();

			if (arguments.length === 0 || (typeof arguments[0] !== 'string' && typeof arguments[0] !== 'number')) {
				return false;
			}

			var radioId = arguments[0];

			// Checks if we have a radio type in the args
			var radioType = 'radio';
			if (typeof arguments[1] !== 'undefined' && (arguments[1] === 'user' || arguments[1] === 'artist')) {
				radioType = arguments[1];
			}

			var eventTriggeredType;
			if (radioType === 'user') {
				eventTriggeredType = 'playUserRadio';
			} else if (radioType === 'radio') {
				eventTriggeredType = 'playRadio';
			} else {
				eventTriggeredType = 'playSmartRadio';
			}

			var playArguments = DZ.player.getPlayArguments(arguments);

			DZ.Event.subscribe(DZ.Event.player.TRACKS_LOADED + '_' + eventTriggeredType + '_' + radioId, [function(data) {
				playArguments.callback(data);
			}], true);

			DZ.player._core.setType(eventTriggeredType, radioId);
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.playRadio', {
				radio_id: radioId,
				radio_type: radioType,
				index: 0,
				autoplay: playArguments.autoplay
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
		}
	},

	/**
	 * Deprecated, uses playRadio instead
	 */
	playSmartRadio: function() {
		if (arguments.length === 0) {
			return false;
		}

		// Builds the new args in order to implement the radio type
		var args = Array.prototype.slice.call(arguments);
		args.unshift('artist');
		args[0] = args[1];
		args[1] = 'artist';

		return DZ.player.playRadio.apply(this, args);
	},

	playExternalTracks: function() {
		try {
			DZ.player.commonPlay();
			if (arguments.length === 0 || typeof arguments[0] !== 'object') {
				return false;
			}
			var trackList = arguments[0];
			var playArguments = DZ.player.getPlayArguments(arguments);

			DZ.player._core.setType('playExternalTracks', 'playExternalTracks');

			DZ.communication.callDeezerMethod('DZ.player_controler.playExternalTracks', {
				trackList: trackList,
				index: playArguments.index,
				autoplay: playArguments.autoplay,
				offset: playArguments.offset
			});
		} catch (e) {
			DZ.catchException(e);
		}
	},

	playLiveStreaming: function() {
		try {
			DZ.player.commonPlay();
			if (arguments.length === 0 || typeof arguments[0] !== 'object') {
				return false;
			}

			var liveStreaming = arguments[0];
			var playArguments = DZ.player.getPlayArguments(arguments);

			DZ.player._core.setType('playLiveStreaming', 'playLiveStreaming');

			DZ.communication.callDeezerMethod('DZ.player_controler.playLiveStreaming', {
				liveStreaming: liveStreaming,
				index: playArguments.index,
				autoplay: playArguments.autoplay,
				offset: playArguments.offset
			});
		} catch (e) {
			DZ.catchException(e);
		}
	},

	/**
	 * Setters & Getters
	 */
	setTrackList: function() {
		DZ.displayException('This method is deprecated, please use instead one of the followings : DZ.player.playPlaylist, DZ.player.playAlbum, ...');
	},

	setBlindTestMode: function(active, options) {
		if (typeof active !== 'boolean') {
			active = true;
		}

		if (typeof options !== 'object') {
			options = {};
		}

		DZ.communication.callDeezerMethod('DZ.player_controler.setBlindTestMode', {
			activ: active,
			options: options
		});
	},

	getTrackList: function() {
		return DZ.player._core.getTrackList();
	},
	getCurrentSong: function() {
		return DZ.player._core.getCurrentSong();
	},
	getCurrentTrack: function() {
		return DZ.player._core.getCurrentSong();
	},

	getCurrentIndex: function() {
		return DZ.player._core.index;
	},

	setVolume: function(value) { /* value range [0, 100] */
		try {
			if (!DZ.player.loaded) {
				throw DZ.Exception('PLAYER_NOT_LOADED');
			}
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.doAction', {
				command: 'setVolume',
				value: (value)
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	setMute: function(mute) {
		try {
			if (!DZ.player.loaded) {
				throw DZ.Exception('PLAYER_NOT_LOADED');
			}

			mute = (typeof mute === 'boolean') ? mute : !DZ.player.getMute();

			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.doAction', {
				command: 'mute',
				value: (mute)
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	setShuffle: function(value) { /* value boolean */
		try {
			if (!DZ.player.loaded) {
				throw DZ.Exception('PLAYER_NOT_LOADED');
			}
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.doAction', {
				command: 'setShuffle',
				value: (value)
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	setRepeat: function(value) { /* value enum {0,1,2} */
		try {
			if (!DZ.player.loaded) {
				throw DZ.Exception('PLAYER_NOT_LOADED');
			}
			value = Math.max(0, Math.min(2, value * 1));
			DZ.communication.send('frames.dzplayer', 'DZ.player_controler.doAction', {
				command: 'setRepeat',
				value: (value)
			}, 'deezer');
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	getVolume: function() {
		return DZ.player._core.volume;
	},

	getShuffle: function() {
		return DZ.player._core.shuffle;
	},

	getRepeat: function() {
		return DZ.player._core.repeat;
	},

	getMute: function() {
		return DZ.player._core.mute;
	},

	isPlaying: function() {
		return DZ.player._core.playing;
	},

	changeTrackOrder: function(new_order) {
		try {
			if (!DZ.player.loaded) {
				throw DZ.Exception('PLAYER_NOT_LOADED');
			}
			if (DZ.player.getTrackList().length === 0) {
				return false;
			}
			DZ.communication.callDeezerMethod('DZ.player_controler.doAction', {
				command: 'orderTracks',
				value: new_order
			});
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	},

	_core: {
		playing: false,
		tracks: [],
		idToIndex: [],
		index: null,
		type: null,
		id: null,

		volume: 0,
		shuffle: false,
		repeat: 0,
		mute: false,

		on_player_loaded: function(settings) {
			DZ.player._core.playing = settings.playing;
		},

		on_player_play: function() {
			DZ.player._core.playing = true;
		},

		on_player_paused: function() {
			DZ.player._core.playing = false;
		},

		on_volume_changed: function(value) {
			DZ.player._core.volume = value;
		},

		on_shuffle_changed: function(value) {
			DZ.player._core.shuffle = value;
		},

		on_repeat_changed: function(value) {
			DZ.player._core.repeat = value;
		},

		on_mute_changed: function(value) {
			DZ.player._core.mute = value;
		},

		changeOrder: function(new_order) {
			var core = DZ.player._core;
			var new_tracks = [];
			var new_idToIndex = [];
			var index = 0;
			var current_track_id = core.getCurrentSong().id;
			for (var i = 0; i < new_order.length; i++) {
				var id = new_order[i];
				if (typeof core.idToIndex['id_' + id] !== 'undefined') {
					var track = core.tracks[core.idToIndex['id_' + id]];
					new_tracks.push(track);
					new_idToIndex['id_' + id] = index;
					if (id === current_track_id) {
						core.index = index;
					}
					index++;
				}
			}
			DZ.player._core.tracks = new_tracks;
			DZ.player._core.idToIndex = new_idToIndex;
		},

		trackIdExists: function(track_id) {
			return typeof DZ.player._core.idToIndex['id_' + track_id] !== 'undefined';
		},

		isRunning: function() {
			return (DZ.player._core.tracks !== null && DZ.player._core.index !== null && DZ.player._core.type !== null);
		},
		setType: function(type, id) {
			DZ.player._core.type = type;
			DZ.player._core.id = id;
		},

		filterReadableTracks: function(tracks) {
			var readable_tracks = [];
			for (var i = 0; i < tracks.length; i++) {
				if (typeof tracks[i].readable !== 'boolean' || tracks[i].readable) {
					readable_tracks.push(tracks[i]);
				}
			}
			return readable_tracks;
		},

		onLoadedInPlayer: function(data) {
			// MULTIPLE LOAD CHECK, THE LAST LOADED IS THE LAST ACTIVE ! exemple : DZ.playSongs(); DZ.playPlaylist()//just after => playSongs wont be callbacked

			if (typeof data.tracks === 'undefined') {
				data.tracks = [];
			}

			if (typeof data.id === 'undefined') {
				data.id = null;
			}
			if (typeof data.error !== 'undefined' || data.type !== DZ.player._core.type
				|| data.id !== DZ.player._core.id) {
				return false;
			}
			DZ.player._core.tracks = DZ.player._core.filterReadableTracks(data.tracks);
			DZ.player._core.idToIndex = [];
			// return;
			for (var i = 0; i < DZ.player._core.tracks.length; i++) {
				DZ.player._core.idToIndex['id_' + DZ.player._core.tracks[i].id] = i;
			}
			var index = 0;
			if (typeof data.index !== 'undefined') {
				index = Math.max(0, Math.min(data.index, DZ.player._core.tracks.length - 1));
			}
			DZ.player._core.index = index;
		},

		onCurrentSong: function(sng_id) {
			if (typeof DZ.player._core.idToIndex['id_' + sng_id] !== 'undefined') {
				DZ.player._core.index = DZ.player._core.idToIndex['id_' + sng_id];
			}
		},

		getTrackList: function() {
			if (!DZ.player._core.isRunning()) {
				return [];
			}
			return DZ.player._core.tracks;
		},

		getCurrentSong: function() {
			if (!DZ.player._core.isRunning()) {
				return null;
			}
			var core = DZ.player._core;
			if (!core.isRunning() || core.index < 0 || core.index >= core.tracks.length) {
				return null;
			}
			return core.tracks[core.index];
		},

		next: function() {

		},

		prev: function() {

		}
	}
};
DZ.player_controler = {
	// INIT PLAYER IN THE PLAYER IFRAME
	/***************************************************************************************************************************************************************************************************
	 * /***********************************************************************
	 */
	abstract_methods: ['onPlayerLoaded', 'onLogin', 'onLogout', 'subscribeEvents', 'doAction', 'playTracks', 'playAlbum', 'playEpisodes', 'playPodcast', 'playRadio', 'playSmartRadio'],

	parent: {
		subscribeEvents: null,
		convertData: null,
		doAction: null
	},

	init: function(options) {
		try {
			DZ.player_controler.subscribeEvents();
			options.widgetOptions.drawPlayer = typeof options.widgetOptions.emptyPlayer === 'undefined' || options.widgetOptions.emptyPlayer === false;
			widget.init(options);
			return true;
		} catch (e) {
			DZ.catchException(e);
		}
	},

	initMethods: function() {
		var lambda_function = function() {
		};
		for (var i = 0; i < DZ.player_controler.abstract_methods.length; i++) {
			var method_name = DZ.player_controler.abstract_methods[i];
			if (typeof DZ.player_controler[method_name] === 'undefined') {
				DZ.player_controler[method_name] = lambda_function;
			}
		}

		for (var method in DZ.player_controler.parent) {
			if (typeof DZ.player_controler[method] !== 'undefined') {
				DZ.player_controler.parent[method] = DZ.player_controler[method];
			}
		}
	},

	doAction: function(args) {
		try {
			var command = args.command;
			var value = typeof args.value === 'undefined' ? null : args.value;

			switch (command) {
				case 'play' :
				case 'pause' :
				case 'nextSong' :
				case 'prevSong' :
				case 'seek' :
				case 'mute' :
				case 'setVolume' :
				case 'setShuffle' :
				case 'setRepeat' :
				case 'orderTracks' :
					// In case of sepcific playercontrol such as for the plugin.
					if (typeof playercontrol === 'object' && typeof playercontrol.doAction === 'function') {
						playercontrol.doAction(command, [value]);
						return true;
					} else if (typeof dzPlayer.control[command] === 'function') {
						// Used in the inApp
						if (command === 'setVolume') {
							value = Math.min(value, 100);
							value = Math.max(value, 0);
							value /= 100;
						}
						dzPlayer.control[command](value);
						return true;
					} else if (typeof dzPlayer[command] === 'function') {
						// specific to changeTrackOrder
						dzPlayer[command](value);
						return true;
					}
					return false;
				default :
					return false;
			}
		} catch (e) {
			DZ.catchException(e);
		}
	},

	subscribeEvents: function() {
		try {

			Events.addEvent('DZ', Events.player_widget.loaded, DZ.player_controler.onPlayerLoaded);

			Events.addEvent('DZ', Events.player.playing, function(evt, val) {
				if (val) {
					DZ.communication.send('parent', 'DZ.player.receiveEvent', {
						evt: 'PLAY'
					});
				} else {
					DZ.communication.send('parent', 'DZ.player.receiveEvent', {
						evt: 'PAUSED'
					});
				}
			});

			Events.addEvent('DZ', Events.player.position, function(evt, val) {
				if (val === null) {
					val = 0;
				}
				DZ.communication.send('parent', 'DZ.player.receiveEvent', {
					evt: 'POSITION_CHANGED',
					val: [val, dzPlayer.duration]
				});
			});

			Events.addEvent('DZ', Events.player.track_end, function(evt, val) {
				DZ.communication.send('parent', 'DZ.player.receiveEvent', {
					evt: 'TRACK_END',
					val: val
				});
			});

			Events.addEvent('DZ', Events.player.volume_changed, function(evt, val) {
				if (val === null) {
					val = 0;
				}
				DZ.communication.send('parent', 'DZ.player.receiveEvent', {
					evt: 'VOLUME_CHANGED',
					val: val
				});
			});
			Events.addEvent('DZ', Events.player.shuffle_changed, function(evt, val) {
				if (val === null) {
					val = 0;
				}
				DZ.communication.send('parent', 'DZ.player.receiveEvent', {
					evt: 'SHUFFLE_CHANGED',
					val: val
				});
			});
			Events.addEvent('DZ', Events.player.repeat_changed, function(evt, val) {
				if (val === null) {
					val = 0;
				}
				DZ.communication.send('parent', 'DZ.player.receiveEvent', {
					evt: 'REPEAT_CHANGED',
					val: val
				});
			});
			Events.addEvent('DZ', Events.player.mute_changed, function(evt, val) {
				if (val === null) {
					val = 0;
				}
				DZ.communication.send('parent', 'DZ.player.receiveEvent', {
					evt: 'MUTE_CHANGED',
					val: val
				});
			});
			Events.addEvent('DZ', Events.player.pourcentLoaded, function(evt, val) {
				DZ.communication.send('parent', 'DZ.player.receiveEvent', {
					evt: 'BUFFERING_CHANGED',
					val: val
				});
			});
			Events.addEvent('DZ', Events.player.displayCurrentSong, function(evt, val) {
				if (val === null) {
					val = 0;
				}
				DZ.communication.send('parent', 'DZ.player.receiveEvent', {
					evt: 'CURRENT_TRACK',
					val: dzPlayer.getCurrentSong('SNG_ID')
				});
			});
			Events.addEvent('DZ', Events.player.tracklist_changed, function(evt, val) {
				if (val === null) {
					val = 0;
				}
				DZ.communication.send('parent', 'DZ.player.receiveEvent', {
					evt: 'TRACKS_ORDER_CHANGED',
					val: val
				});
			});
			Events.addEvent('DZ', 'player_track_loaded', function(evt, data) {
				// in case of error appends !
				if (typeof data.tracks !== 'undefined') {
					var widgetLines = data.tracks;
					var tracks = [];
					for (var i = 0; i < widgetLines.length; i++) {
						var track = DZ.player_controler.convertData(widgetLines[i]);
						tracks.push(track);
					}
					data.tracks = tracks;
				}
				DZ.communication.callAppMethod('DZ.player.receiveEvent', {
					evt: 'TRACKS_LOADED',
					val: data
				});
			});
			Events.addEvent('DZ', Events.player_widget.displayLayer, function(evt, data) {
				DZ.communication.send('parent', 'DZ.player.receiveEvent', {
					evt: 'NOTIFY',
					val: data
				});
			});
			Events.addEvent('DZ', Events.player.preloadComplete, function(evt, data) {
				DZ.player_controler.preloadTrackEnd('completed', data);
			});
			Events.addEvent('DZ', Events.player.preloadAborted, function(evt, data) {
				DZ.player_controler.preloadTrackEnd('aborted', data);
			});
			return true;
		} catch (e) {
			DZ.catchException(e);
		}
	},

	preloadCurrentId: null,
	isPreloadingTrack: false,

	preloadTrackEnd: function(status, sng_id) {
		try {
			if (sng_id !== DZ.player_controler.preloadCurrentId) {
				return false;
			}

			var returnData = {};
			returnData.track_id = DZ.player_controler.preloadCurrentId;
			returnData.status = status;

			switch (status) {
				case 'completed':
					break;
				case 'aborted':
					returnData.error = true;
					break;
				case 'preloading':
					returnData.error = true;
					break;
				default:
					returnData.error = true;
					returnData.status = 'unknown';
					break;
			}

			DZ.communication.callAppMethod('DZ.player.preloadTrackEnd', returnData);

			DZ.player_controler.isPreloadingTrack = false;
			DZ.player_controler.preloadCurrentId = null;
		} catch (e) {
			DZ.catchException(e);
		}
	},
	preloadTrack: function(sng_id) {

		if (DZ.player_controler.isPreloadingTrack) {
			DZ.player_controler.preloadTrackEnd('preloading');
			return false;
		}

		DZ.player_controler.isPreloadingTrack = true;
		DZ.player_controler.preloadCurrentId = sng_id;

		api.call({
			method: 'song.getListData',
			data: {
				sng_ids: [sng_id],
				start: 0,
				nb: 500,
				tags: false,
				lang: SETTING_LANG
			},
			success: function(result) {
				dzPlayer.trigger('audioPlayer_preloadTrack', [[result.data[0]]]);
			},
			error: function() {
				DZ.player_controler.preloadTrackEnd('unknown');
				return true;
			}
		});
	},

	preloadTest: function() {
		var sng_id = 3138820;
		api.call({
			method: 'song.getListData',

			data: {
				sng_ids: [sng_id],
				start: 0,
				nb: 500,
				tags: false,
				lang: SETTING_LANG
			},

			success: function(result) {
				var trackDatas = result.data;
				if (trackDatas.length > 0) {
					dzPlayer.trigger('audioPlayer_preloadTrack', [[trackDatas[0]]]);
				}
			},

			callback_parameters: {}
		});
	},

	testException: function() {
		try {
			throw DZ.Exception('PLAYER_NOT_LOADED');
		} catch (e) {
			DZ.catchException(e);
		}
	},

	filterTracks: function(tracks) {
		var filteredTracks = [];
		for (var i = 0; i < tracks.length; i++) {
			if (tracks[i].TYPE === 'JINGLE') {
				tracks[i].SNG_ID = 'JINGLE_' + i;
			}
			filteredTracks.push(tracks[i]);
		}
		return filteredTracks;
	},

	convertData: function(data) {
		try {
			var track = {};
			track.id = data.SNG_ID;
			track.duration = data.DURATION;
			track.title = data.SNG_TITLE;
			track.artist = {
				id: data.ART_ID,
				name: data.ART_NAME
			};
			track.album = {
				id: data.ALB_ID,
				title: data.ALB_TITLE
			};
			return track;
		} catch (e) {
			DZ.catchException(e);
		}
	},

	setBlindTestMode: function(arg) {
		try {
			if (typeof playercontrol.setBlindTestMode === 'undefined') {
				return false;
			}

			if (typeof arg !== 'object') {
				arg = {};
			}
			var options = $.extend({
				activ: true,
				options: {}
			}, arg);

			playercontrol.setBlindTestMode(options.activ, options.options);
		} catch (e) {
			DZ.catchException(e);
		}
	}

};
DZ.player_controler.initMethods();
DZ.player_controler.onPlayerLoaded = function() {
	try {
		DZ.player_controler.playerLoaded = true;
		DZ.communication.send('parent', 'DZ.onDeezerLoaded', {
			player: {
				volume: dzPlayer.getVolume() * 100,
				shuffle: dzPlayer.isShuffle(),
				repeat: dzPlayer.getRepeat(),
				muted: dzPlayer.isMuted()
			}
		});

	} catch (e) {
		DZ.catchException(e);
	}
};

DZ.player_controler.onLogin = function() {
	Events.trigger(Events.user.login);

	sendRequest('/ajax/action.php', 'text', 'type=user_data&request=login', true, function(user) {

		try {

			user = user.responseText;

			if (user !== false && user !== 'error' && user !== '') {

				notificationBar.hide();

				user = JSON.parse(user);

				// Add USER values
				window.USER.USER_ID = user.USER_ID;
				window.USER.FB_USER_ID = user.FB_USER_ID;
				window.USER.BLOG_NAME = user.BLOG_NAME;
				window.USER.FIRSTNAME = user.FIRSTNAME;
				window.USER.LASTNAME = user.LASTNAME;
				window.USER.USER_PICTURE = user.USER_PICTURE;
				window.USER.USER_GENDER = user.SEX;
				window.USER.USER_AGE = user.AGE;
				window.USER.PARTNERS = user.PARTNERS;
				window.USER.TRY_AND_BUY = user.TRY_AND_BUY;
				window.USER.OPTIONS = user.OPTIONS;
				window.USER.SETTING = user.SETTING;
				window.USER.TOOLBAR = user.TOOLBAR;
				window.USER.TWITTER = user.TWITTER;
				window.USER.GOOGLEPLUS = user.GOOGLEPLUS;
				window.USER.FACEBOOK = user.FACEBOOK;
				window.USER.LASTFM = user.LASTFM;
				window.USER.FAVORITE_TAG = user.FAVORITE_TAG;
				window.USER.INSCRIPTION_DATE = user.INSCRIPTION_DATE;

				window.NEW_SESSION_ID = user.SESSION_ID;
				window.PLAYER_TOKEN = user.PLAYER_TOKEN;
				window.DZPS = user.DZPS;
				window.OFFER_ID = user.OFFER_ID;
				window.COUNTRY = user.COUNTRY;

				window.SESSION_ID = user.SESSION_ID;

				dzPlayer.setUserLogged(window.USER.USER_ID, window.USER.USER_PICTURE, window.USER.BLOG_NAME,
					window.NEW_SESSION_ID, window.USER.USER_GENDER, window.USER.USER_AGE, window.PLAYER_TOKEN);

				if (typeof naboo !== 'undefined') {
					naboo.last_page = null;
				}

				Events.resolve(Events.user.loaded);

				// Facebook
				if (facebook.isLinking) {
					window.LOG_TYPE = 'facebook';
					facebook.isLinking = false;
				}

				restrict.init();

			} else {

				return false;
			}

			return true;
		} catch (e) {
			error.log(e);
		}

	});

	return true;
};

DZ.player_controler.onLogout = function() {
	user.logout();
	dzPlayer.setUserUnlogged();
};

DZ.player_controler.playTracks = function(arg) {
	try {
		var offset = null;
		if (typeof (arg.offset) === 'number' && arg.index < arg.trackList.length) {
			offset = arg.offset;
		}
		var queue = false;
		if (typeof (arg.queue) === 'boolean') {
			queue = arg.queue;
		}

		widget.loadSongs(arg.trackList.split('|'), function(tracks) {
			Events.trigger('player_track_loaded', {
				tracks: tracks,
				type: 'playTracks',
				id: arg.trackList
			});
		}, arg.autoplay, arg.index, offset, queue);
	} catch (e) {
		DZ.catchException(e);
	}
};

DZ.player_controler.playPlaylist = function(arg) {
	try {
		widget.loadPlaylist(arg.playlist_id, function(tracks) {
			Events.trigger('player_track_loaded', {
				tracks: tracks,
				type: 'playPlaylist',
				id: arg.playlist_id
			});

		}, arg.autoplay, arg.index, arg.offset);
	} catch (e) {
		DZ.catchException(e);
	}
};

DZ.player_controler.playAlbum = function(arg) {
	try {
		widget.loadAlbum(arg.album_id, function(tracks) {
			Events.trigger('player_track_loaded', {
				tracks: tracks,
				type: 'playAlbum',
				id: arg.album_id
			});

		}, arg.autoplay, arg.index, arg.offset);
	} catch (e) {
		DZ.catchException(e);
	}
};

DZ.player_controler.playEpisodes = function(arg) {

	if (gatekeeper.isAllowed('talk') === false) {
		return DZ.catchException('Country not Allowed');
	}

	try {
		var queue = false;
		if (typeof (arg.queue) === 'boolean') {
			queue = arg.queue;
		}

		widget.loadEpisodes(arg.episodeList.split('|'), function(episodes) {
			Events.trigger('player_track_loaded', {
				episodes: episodes,
				type: 'playEpisodes',
				id: arg.episodeList
			});
		}, arg.autoplay, arg.index, arg.offset, queue);
	} catch (e) {
		DZ.catchException(e);
	}
};

DZ.player_controler.playPodcast = function(arg) {

	if (gatekeeper.isAllowed('talk') === false) {
		return DZ.catchException('Country not Allowed');
	}

	try {
		widget.loadPodcast(arg.podcast_id, function(tracks) {
			Events.trigger('player_track_loaded', {
				tracks: tracks,
				type: 'playPodcast',
				id: arg.podcast_id
			});
		}, arg.autoplay, arg.index, arg.offset);
	} catch (e) {
		DZ.catchException(e);
	}
};

DZ.player_controler.playRadio = function(arg) {
	try {
		// No user radio for disconnected users
		if (arg.radio_type === 'user' && USER.USER_ID <= 0) {
			return false;
		}

		var eventTriggeredType;
		if (arg.radio_type === 'user') {
			eventTriggeredType = 'playUserRadio';
		} else if (arg.radio_type === 'radio') {
			eventTriggeredType = 'playRadio';
		} else {
			eventTriggeredType = 'playSmartRadio';
		}

		widget.loadRadio(arg.radio_type + '-' + arg.radio_id, function(tracks) {
			Events.trigger('player_track_loaded', {
				tracks: tracks,
				type: eventTriggeredType,
				id: arg.radio_id
			});
		}, arg.autoplay, 0);
	} catch (e) {
		DZ.catchException(e);
	}
};

DZ.player_controler.playSmartRadio = function(arg) {
	DZ.player_controler.playRadio(arg);
};

DZ.player_controler.playExternalTracks = function(arg) {
	try {
		var offset = null;
		if (typeof (arg.offset) === 'number' && arg.index < arg.trackList.length) {
			offset = arg.offset;
		}
		var queue = false;
		if (typeof (arg.queue) === 'boolean') {
			queue = arg.queue;
		}
		widget.loadExternalTracks(arg.trackList, function(tracks) {
			Events.trigger('player_track_loaded', {
				tracks: tracks,
				type: 'playExternalTracks',
				id: 'playExternalTracks'
			});
		}, arg.autoplay, arg.index, offset, queue);
	} catch (e) {
		DZ.catchException(e);
	}
};
DZ.request = {
	callbacks: {},

	_send: function(options) {
		try {
			options = (typeof options === 'undefined') ? {} : options;
			options = DZ.util.extend({
				path: null,
				path_args: [],
				callback_name: 'callback',
				callback: function() {
				}
			}, options);
			var callback_uniq_name = DZ.request.getUniqFctName();
			DZ.request.callbacks[callback_uniq_name] = options.callback;

			options.path_args.push(options.callback_name + '=DZ.request.callbacks.' + callback_uniq_name);

			var script = document.createElement('script');
			script.onload = function() {
				document.getElementById('dz-root').removeChild(script);
				DZ.request.callbacks[callback_uniq_name] = null;
				delete DZ.request.callbacks[callback_uniq_name];
			};

			script.src = options.path + '?' + options.path_args.join('&');

			document.getElementById('dz-root').appendChild(script);
		} catch (e) {
			DZ.catchException(e);
		}
	},

	getUniqFctName: function() { // http://phpjs.org/functions/uniqid:750
		try {
			var prefix = 'dzcb_';
			var retId;
			var formatSeed = function(seed, reqWidth) {
				seed = parseInt(seed, 10).toString(16); // to hex str
				if (reqWidth < seed.length) { // so long we split
					return seed.slice(seed.length - reqWidth);
				}
				if (reqWidth > seed.length) { // so short we pad
					return Array(1 + (reqWidth - seed.length)).join('0') + seed;
				}
				return seed;
			};

			// BEGIN REDUNDANT
			if (!this.php_js) {
				this.php_js = {};
			}
			// END REDUNDANT
			if (!this.php_js.uniqidSeed) { // init seed with big random int
				this.php_js.uniqidSeed = Math.floor(Math.random() * 0x75bcd15);
			}
			this.php_js.uniqidSeed += 3;

			retId = prefix; // start with prefix, add current milliseconds hex string
			retId += formatSeed(parseInt(new Date().getTime() / 1000, 10), 10);
			retId += formatSeed(this.php_js.uniqidSeed, 7); // add seed hex string
			// for more entropy we add a float lower to 10
			retId += '_' + Math.floor((Math.random() * 10).toFixed(7) * 100000000).toString();

			return retId;
		} catch (e) {
			DZ.catchException(e);
		}
	}
};DZ.util = {
	extend: function() {
		try {
			var args = arguments;
			if (args.length === 0 || typeof args[0] !== 'object') {
				throw DZ.Exception('extend arguments[0] is not an object');
			}
			var object = args[0];
			for (var i = 1; i < args.length; i++) {
				if (typeof args[i] !== 'object') {
					continue;
				}
				for (var key in args[i]) {
					object[key] = args[i][key];
				}
			}
			return object;
		} catch (e) {
			DZ.catchException(e);
		}
	},

	reload: function() {
		window.location.reload();
	},

	uniqid: function() {
		try {
			var retId;

			var formatSeed = function(seed, reqWidth) {
				seed = parseInt(seed, 10).toString(16); // to hex str
				if (reqWidth < seed.length) { // so long we split
					return seed.slice(seed.length - reqWidth);
				}
				if (reqWidth > seed.length) { // so short we pad
					return Array(1 + (reqWidth - seed.length)).join('0') + seed;
				}
				return seed;
			};

			// BEGIN REDUNDANT
			if (!this.php_js) {
				this.php_js = {};
			}
			// END REDUNDANT
			if (!this.php_js.uniqidSeed) { // init seed with big random int
				this.php_js.uniqidSeed = Math.floor(Math.random() * 0x75bcd15);
			}
			this.php_js.uniqidSeed += 3;

			retId = formatSeed(parseInt(new Date().getTime() / 1000, 10), 10);
			retId += formatSeed(this.php_js.uniqidSeed, 7); // add seed hex string

			return retId;
		} catch (e) {
			DZ.catchException(e);
		}
	},

	parseUrl: function(str) {
		var o = {
			strictMode: false,
			key: ['source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'],
			q: {
				name: 'queryKey',
				parser: /(?:^|&)([^&=]*)=?([^&]*)/g
			},
			parser: {
				strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
				loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
			}
		};
		var m = o.parser[o.strictMode ? 'strict' : 'loose'].exec(str);
		var uri = {};
		var i = 14;

		while (i--) {
			uri[o.key[i]] = m[i] || '';
		}

		uri[o.q.name] = {};
		uri[o.key[12]].replace(o.q.parser, function($0, $1, $2) {
			if ($1) {
				uri[o.q.name][$1] = $2;
			}
		});

		return uri;
	},

	setCookie: function(name, value, expiredays) {
		var exdate = new Date();
		exdate.setDate(exdate.getDate() + expiredays);
		document.cookie = name + '=' + escape(value) + '; path=/' + ((expiredays === null) ? '' : ';expires=' + exdate.toGMTString());
	},

	getCookie: function(name) {
		if (document.cookie.length > 0) {
			var c_start = document.cookie.indexOf(name + '=');
			if (c_start !== -1) {
				c_start = c_start + name.length + 1;

				var c_end = document.cookie.indexOf(';', c_start);
				if (c_end === -1) {
					c_end = document.cookie.length;
				}

				return unescape(document.cookie.substring(c_start, c_end));
			}
		}
		return '';
	},

	trim: function(myString, trimChar) {

		if (typeof trimChar === 'string' && trimChar !== '') {
			var regexpLeft = new RegExp('^[' + trimChar + '][' + trimChar + ']*');
			var regexpRight = new RegExp('[' + trimChar + '][' + trimChar + ']*$');
		} else {
			var regexpLeft = new RegExp('^\\s\\s*');
			var regexpRight = new RegExp('\\s\\s*$');
		}

		return myString.replace(regexpLeft, '').replace(regexpRight, '');
	},

	getPlatform: function() {
		var matches = navigator.userAgent.match(/(Deezer|DeezerSDK)\/([0-9\.]+)/i);

		var platform = {
			family: 'desktop',
			app_version: ''
		};

		if (matches !== null) {
			platform.family = 'mobile';

			if (matches.length >= 3) {
				platform.app_version = matches[2];
			}
		}

		return platform;
	},

	versionCompare: function(left, right) {

		if (typeof left !== 'string' || typeof right !== 'string') {
			return false;
		}

		left = left.split('.');
		right = right.split('.');

		var index = 0;
		var length = Math.max(left.length, right.length);

		for (; index < length; index++) {
			if ((left[index] && !right[index] && parseInt(left[index]) > 0) || (parseInt(left[index]) > parseInt(right[index]))) {
				return 1;
			} else if ((right[index] && !left[index] && parseInt(right[index]) > 0) || (parseInt(left[index]) < parseInt(right[index]))) {
				return -1;
			}
		}

		return 0;
	}
};
if (typeof DZ !== 'undefined') {

	DZ.inapp = {

		override_dz: function() {
			DZ.init_override = {
				old_init: DZ.init,
				init_options: {},
				initialized: false,

				/**
				 * Initializes the SDK on the inapp
				 *
				 * @param {Object} options - Options to pass on
				 * @returns {Boolean}
				 */
				init: function(options) {

					if (typeof options === 'undefined') {
						options = {};
					}

					if (DZ.init_override.initialized) {
						return false;
					}
					if (typeof options.ready === 'function') {
						DZ.ready(options.ready);
					}

					DZ.query(document).ready(function() {
						var init_options = DZ.query.extend({
							ajax: false,
							player: {}
						}, options, DZ.init_override.init_options);

						DZ.inapp.initdom();
						DZ.init_override.old_init(init_options);
						DZ.inapp.loaded(init_options);
					});
					DZ.init_override.initialized = true;
				}
			};
			DZ.init = DZ.init_override.init;
		},

		is_inappmobile: function() {
			return false;
		},

		is_inapp: function() {
			try {
				// First, checks the location
				var source_hash = window.document.location.hash;
				var hash = unescape(source_hash).substr(1).split('|');

				// Then, try the cookie if needed
				var hasCookie = false;
				if (hash.length <= 2 || (hash[0].substr(0, 5) != 'inapp')) {
					source_hash = DZ.util.getCookie('deezer_inapp_hash');
					hash = unescape(source_hash).substr(1).split('|');
					hasCookie = true;
				}

				if (hash.length > 2 && (hash[0].substr(0, 5) === 'inapp')) {
					DZ.inapp.hash = source_hash;

					// If window != window.top, we have an iframe so maybe an inapp. On the host site, iframes are created with the name 'dzapp'
					// If we are in inapp mobile, we always have window == window.top, so checks from the cookie
					var dzappRe = new RegExp('(dzapp)(\\d+)', 'g');
					var is_inapp = false;
					if (hash[0].substr(0, 11) === 'inappmobile' || (window != window.top && dzappRe.test(window.name))) {
						is_inapp = true;
					}
					DZ.inapp.is_inapp = function() {
						return is_inapp;
					};

					// If there is a cookie but there is no inapp, deletes it
					if (hasCookie && is_inapp == false && window == window.top) {
						DZ.util.setCookie('deezer_inapp_hash', DZ.inapp.hash, -1);
					}

					return is_inapp;
				}

				return false;
			} catch (e) {
				DZ.catchException(e);
			}
		},

		init: function() {
			try {
				var hashSplitted = unescape(DZ.inapp.hash).substr(1).split('|');
				DZ.util.setCookie('deezer_inapp_hash', DZ.inapp.hash, 1);

				if (hashSplitted !== '' && hashSplitted.length > 2 && (hashSplitted[0].substr(0, 5) === 'inapp')) {

					if (hashSplitted[0].substr(0, 11) === 'inappmobile') {
						var platform = hashSplitted[0].split('_');
						if (platform.length === 2) {
							platform = platform[1];
						} else {
							platform = null;
						}
						DZ.mobile.override(platform);

						DZ.inapp.is_inappmobile = function() {
							return true;
						};
					}

					var token = null;
					if (typeof hashSplitted[3] !== 'undefined') {
						var hashToken = hashSplitted[3].split('&');
						if (hashToken.length === 2) {
							token = {
								accessToken: hashToken[0].split('=')[1],
								expire: hashToken[1].split('=')[1] * 1
							};
						}
					}

					DZ.init_override.init_options = {
						appId: hashSplitted[1],
						channelUrl: hashSplitted[2],
						token: token
					};

					// SID
					if (typeof hashSplitted[4] !== 'undefined') {
						DZ.init_override.init_options.sid = hashSplitted[4];
					}
				}
			} catch (e) {
				DZ.catchException(e);
			}
		},

		loaded: function(init_options) {
			var options = {};
			if (typeof init_options.ajax !== 'boolean' || !init_options.ajax) {
				options.page = document.location;
			} else {
				/*
				 * var hash = document.location.hash + ""; var patt =
				 * /\|dzhash=(.*)=dzhash\|/; var results = patt.exec(hash);
				 *
				 * if (results != null && results.length > 1) {
				 * DZ.navigation.first_page = results[1]; }
				 */
				options.ajax_mode = true;
			}

			if (init_options.token !== null) {
				options.user_id = true;
			}

			DZ.communication.callDeezerMethod('DZ.inapploaded', options);
			DZ.canvas.setSize(DZ.query(document.body).outerHeight(true));
		},

		initdom: function() {
			var $body = DZ.query('body');
			if (DZ.query('#dz-root').length === 0) {
				$body.append('<div id="dz-root"></div>');
			}
			$body.bind('mouseup', function() {
				DZ.communication.callDeezerMethod('DZ.deezer.triggerBodyClick', 'up');
			}).bind('mousedown', function() {
				DZ.communication.callDeezerMethod('DZ.deezer.triggerBodyClick', 'down');
			});
			DZ.canvas.init();
			if (DZ.inapp.is_inappmobile()) {
				$body.click(function(e) {
					if (e.target.tagName.toLowerCase() === 'a') {
						if (typeof e.target.target !== 'undefined' && e.target.target === '_blank') {
							e.preventDefault(); DZ.communication.callDeezerMethod('DZ.deezer.externalLink', {url: e.target.href});
						}
					}
				});
			}
		}
	};
}
DZ.canvas = {

	receiveEvent: function(arg) {
		try {
			if (typeof args == 'string') {
				try {
					args = eval('(' + args + ')');
				} catch (e) {
					return false;
				}
			}
			if (typeof arg != 'undefined' && typeof arg.evt != 'undefined') {
				switch (arg.evt) {
					case 'SCROLL_BOTTOM' :
						var percent = arg.val * 1;
						for (var i = 90; i <= percent && i < 100; i++) {
							DZ.Event.triggerEvent({evt: DZ.Event.canvas['SCROLL_BOTTOM'] + '_' + i, args: null});
						}
						if (percent == 100) {
							DZ.Event.triggerEvent({evt: DZ.Event.canvas['SCROLL_BOTTOM'], args: null});
						}
						break;
					default :
						break;
				}
			}
		} catch (e) {
			DZ.catchException(e);
		}
	},

	init: function() {
		if (typeof DZ.inapp == 'undefined') {
			return false;
		}
		DZ.query(window).on('scroll', DZ.canvas.onScroll);
	},

	onScroll: function(evt) {
		var $ = DZ.query;
		var max_scroll = $(document).height() - $(window).height();
		var scroll_top = $(document).scrollTop();

		var percent_scroll = Math.floor(scroll_top * 100 / max_scroll, 10);

		if (percent_scroll >= 90) {
			DZ.canvas.receiveEvent({evt: 'SCROLL_BOTTOM', val: percent_scroll});
		}
	},

	scrollTop: function(y) {
		if (typeof DZ.inapp == 'undefined') {
			return false;
		}
		DZ.query(document).scrollTop(parseInt(y, 10));
	},

	setSize: function(size) {
		if (typeof DZ.inapp == 'undefined') {
			return false;
		}
		return true;
	}
};DZ.addToPlaylist = function(trackIds) {
	if (typeof trackIds === 'undefined' || typeof trackIds.length === 'undefined') {
		return false;
	}
	DZ.communication.send('frames.dzplayer', 'DZ.deezer.addToPlaylist', {
		trackList: trackIds.join('|')
	}, 'deezer');
};

DZ.startDrag = function(type, id) {
	DZ.communication.send('frames.dzplayer', 'DZ.deezer.startDrag', {
		type: type,
		id: id
	}, 'deezer');
};

DZ.framework_standalone = {
	onLoad: function() {
		// NEVER CALLED
	},

	override_standalone: function() {

	},

	classes: ['dz-follow', 'dz-widget-player'],

	dispatchReconnect: function() {
		var uniqid = DZ.util.uniqid(9);

		for (var key in DZ.framework.iframes) {
			for (var id in DZ.framework.iframes[key]) {
				var base_src = DZ.framework.iframes[key][id].base_src;
				DZ.framework.iframes[key][id].src = base_src + '&dzuniq=' + uniqid;
			}
		}
		return true;
	},

	parse: function(selector) {

		if (typeof selector !== 'string') {
			selector = document;
		}

		var $container = DZ.query(selector);
		if ($container.length > 0) {
			for (var i = 0; i < DZ.framework.classes.length; i++) {
				$container.find('.' + DZ.framework.classes[i]).each(function() {
					var $this = DZ.query(this);
					if (!$this.hasClass('dz-parsed')) {

						if (DZ.framework.parseFunctions[DZ.framework.classes[i]]($this)) {
							$this.addClass('dz-parsed dz-reset dz-widget');// .removeClass(DZ.framework.classes[i]);
						} else {
							$this.addClass('dz-parsed');
						}

					}
				});
			}
		}

	},

	parseFunctions: {
		'dz-follow': function($el) {
			var params = {
				width: 200
			};

			if (typeof $el.attr('data-uid') !== 'undefined' && $el.attr('data-uid') !== null) {
				params.uid = $el.attr('data-uid');
			} else {
				return false;
			}

			if (typeof $el.attr('data-width') !== 'undefined' && $el.attr('data-width') !== null) {
				params.width = $el.attr('data-width');
			}

			$el.css({
				width: params.width + 'px'
			});

			var args = [];
			args.push('width=' + params.width);
			args.push('uid=' + params.uid);

			var iframe = DZ.framework.createIframe('follow', args);

			if (iframe === null) {
				return false;
			}

			iframe.style.width = params.width + 'px';

			DZ.framework.registerIframe('follow', iframe);

			$el.append(iframe);

			return true;
		},
		'dz-widget-player': function($el) {

			// Creates an iframe from the params
			var args = [];
			if (typeof $el.attr('data-args') !== 'undefined' && $el.attr('data-args') !== null) {
				args = $el.attr('data-args').split('&');
			}
			var iframe = DZ.framework.createIframe('player', args);

			// Customizes it because default does not fit
			if (typeof $el.attr('data-width') !== 'undefined' && $el.attr('data-width') !== null) {
				$el.css({
					width: $el.attr('data-width') + 'px'
				});
				iframe.style.width = $el.attr('data-width') + 'px';
			}
			if (typeof $el.attr('data-height') !== 'undefined' && $el.attr('data-height') !== null) {
				$el.css({
					height: $el.attr('data-height') + 'px'
				});
				iframe.style.height = $el.attr('data-height') + 'px';
			}

			iframe.setAttribute('allowtransparency', true);

			DZ.framework.registerIframe('player', iframe);

			$el.append(iframe);

			return true;
		}
	},

	resizeIframe: function(args) {
		if (typeof args === 'undefined' || typeof args.plugin_type === 'undefined' || typeof args.iframe_id === 'undefined' || typeof args.width === 'undefined') {
			return false;
		}

		var iframe = DZ.framework.getIframe(args.plugin_type, args.iframe_id);
		if (iframe === null) {
			return false;
		}

		iframe.style.width = args.width + 'px';

		if (typeof args.height !== 'undefined' && args.height !== null) {
			iframe.style.height = args.height + 'px';
		}

		return true;
	},

	dispatchIframesEvent: function(data) {

		if (typeof data === 'undefined') {
			return false;
		}
		if (typeof data.plugin_type === 'undefined' || typeof DZ.framework.iframeTypes[data.plugin_type] === 'undefined') {
			return false;
		}

		if (typeof data.iframe_id === 'undefined' || typeof DZ.framework.iframes[data.plugin_type] === 'undefined' || typeof DZ.framework.iframes[data.plugin_type][data.iframe_id] === 'undefined') {
			return false;
		}

		var iframes_to_dispatch = [];
		for (var key in DZ.framework.iframes[data.plugin_type]) {
			if (key !== data.iframe_id) {
				iframes_to_dispatch.push(key);
				DZ.communication.callPluginMethod(key, 'DZ.framework.dispatchReceive', data);
			}
		}

		if (typeof data.event_data !== 'undefined' && typeof data.method !== 'undefined' && typeof DZ.Event.framework[data.method] !== 'undefined') {
			DZ.Event.trigger(DZ.Event.framework[data.method], data.event_data);
		}

		// CALL RECEIVE DISPACT
	},

	dispatchReceive: function(data) {

		if (typeof data === 'undefined') {
			return false;
		}

		if (typeof data.method === 'undefined' || typeof data.method_data === 'undefined') {
			return false;
		}

		if (typeof data.plugin_type === 'undefined' || typeof DZ.framework.iframeTypes[data.plugin_type] === 'undefined') {
			return false;
		}

		var method = data.method.split('.');
		if (method.length <= 1) {
			return false;
		}

		var object_name = method[0];

		if (object_name !== DZ.framework.iframeTypes[data.plugin_type].init_object) {
			return false;
		}

		var allowed_methods = DZ.framework.iframeTypes[data.plugin_type].allowed_methods;
		var method_name = data.method.substr(object_name.length + 1);

		if (typeof allowed_methods[method_name] === 'undefined') {
			return false;
		}

		if (typeof window[object_name] === 'undefined' || typeof window[object_name][method_name] !== 'function') {
			return false;
		}

		method = window[object_name][method_name];

		method(data.method_data);

	},

	iframeTypes: {
		follow: {
			path: '/plugins/follow.php',
			height: 30,
			init_object: 'follow',
			allowed_methods: {
				onAddFavorite: true,
				onDeleteFavorite: true
			}
		},
		player: {
			path: '/plugins/player.php',
			height: 80
		}
	},

	iframes: {},

	getIframe: function(type, iframe_id) {
		try {
			if (typeof type === 'undefined' || typeof DZ.framework.iframeTypes[type] === 'undefined') {
				return null;
			}

			if (typeof iframe_id === 'undefined' || typeof DZ.framework.iframes[type] === 'undefined' || typeof DZ.framework.iframes[type][iframe_id] === 'undefined') {
				return null;
			}

			return DZ.framework.iframes[type][iframe_id];

		} catch (e) {
			DZ.catchException(e);
		}
	},

	registerIframe: function(type, iframe) {
		try {
			if (typeof type === 'undefined' || typeof DZ.framework.iframeTypes[type] === 'undefined') {
				return false;
			}
			if (typeof iframe === 'undefined' || typeof iframe.id === 'undefined') {
				return false;
			}

			if (typeof DZ.framework.iframes[type] === 'undefined') {
				DZ.framework.iframes[type] = {};
			}

			DZ.framework.iframes[type][iframe.id] = iframe;

			return true;

		} catch (e) {
			DZ.catchException(e);
		}
	},

	createIframe: function(type, args) {
		try {

			if (typeof type === 'undefined' || typeof DZ.framework.iframeTypes[type] === 'undefined') {
				return null;
			}

			if (typeof args === 'undefined') {
				args = [];
			}

			var iframe = document.createElement('iframe');
			var uniqid = 'd' + DZ.util.uniqid(9);

			iframe.id = uniqid;
			iframe.name = uniqid;

			// CSS
			iframe.style.display = 'block';
			iframe.style.border = '0px solid black';
			iframe.frameBorder = 'no';
			iframe.scrolling = 'no';
			iframe.style.height = DZ.framework.iframeTypes[type].height + 'px';
			// CSS

			var channelUrl = DZ.channelUrl;
			if (channelUrl === null) {
				channelUrl = document.location.href;
			}
			if (channelUrl !== '') {
				args.push('channel=' + encodeURIComponent(channelUrl));
			}
			args.push('app_id=' + DZ.app_id);
			args.push('iframe_id=' + uniqid);

			iframe.base_src = DZ.SETTING_HOST_SITE + DZ.framework.iframeTypes[type].path + '?' + args.join('&');

			iframe.src = iframe.base_src;

			return iframe;
		} catch (e) {
			DZ.catchException(e);
		}
	}
};

DZ.framework = {

	classes: [
		'dz-library',
		'dz-addtoplaylist',
		'dz-share',
		'dz-buy',
		'dz-link',
		'dz-follow',
		'dz-widget-player',
		'dz-download'
	],

	text: {
		add: '',
		remove: '',
		follow: '',
		unfollow: ''
	},

	override_standalone: function() {
		DZ.framework = DZ.framework_standalone;
	},

	dispatchReconnect: function() {

	},

	/**
	 * Checks if it's currently possible to download the track for offline use.
	 * Currently it's only possible on mobile for premium users.
	 */
	downloadIsAvailable: function() {
		return (
			DZ.inapp.is_inappmobile()
			&& DZ.user
			&& DZ.user.options
			&& DZ.user.options.mobile_offline
		);
	},

	/**
	 * Initializes the framework
	 *
	 * @param {Object} settings
	 */
	onLoad: function(settings) {
		var self = this;
		self.text = settings.text;

		if (!self.downloadIsAvailable()) {
			// deactivate parsing of download buttons
			delete self.classes[self.classes.indexOf('dz-download')];
		}

		self.parseWaiting();
	},

	waitingParse: [],

	parseWaiting_running: false,

	parseWaiting: function() {
		var self = this;

		self.parseWaiting_running = true;
		for (var i = 0; i < self.waitingParse.length; i++) {
			self.parse(self.waitingParse[i], true);
		}
		self.waitingParse = [];
		self.askQueue();
		self.parseWaiting_running = false;
	},

	forbidParse: true,

	/**
	 * Replaces SDK element placeholders in the document with their implementation
	 *
	 * @param {String} selector - [optional] A selector for the root item from which to search for SDK placeholders
	 * @param {Boolean} force - [optional] If true, force parsing
	 * @returns {Boolean}
	 */
	parse: function(selector, force) {
		var self = this;

		force = typeof force === 'boolean' ? force : false;
		if (typeof selector !== 'string') {
			selector = document;
		}
		if (self.forbidParse && !force) {
			self.waitingParse.push(selector);
			return false;
		}
		var $container = DZ.query(selector);
		if ($container.length > 0) {
			for (var i = 0; i < self.classes.length; i++) {
				$container.find('.' + self.classes[i]).each(function() {
					var $this = DZ.query(this);
					if (!$this.hasClass('dz-parsed')) {
						if (self.parseFunctions[self.classes[i]]($this)) {
							$this.addClass('dz-parsed dz-inapp dz-widget');
						}
					}
				});
			}
		}

		if (!self.parseWaiting_running) {
			self.askQueue();
		}
	},

	asking_queue: {
		album: {},
		playlist: {},
		artist: {},
		radio: {},
		friend: {}
	},

	favoriteElements: {
		album: [],
		playlist: [],
		artist: [],
		radio: [],
		friend: []
	},

	addFavoriteElement: function(type, id, $el) {
		var self = this;

		if (typeof self.favoriteElements[type] === 'undefined') {
			return false;
		}
		id = 'id_' + id;
		if (typeof self.favoriteElements[type][id] === 'undefined') {
			self.favoriteElements[type][id] = [];
		}

		self.favoriteElements[type][id].push($el);

		if (typeof self.asking_queue[type] !== 'undefined') {
			self.asking_queue[type][id] = true;
		}
	},

	onFavoriteTriggers: {
		friend: {
			event_add: 'follow.onAddFavorite',
			event_remove: 'follow.onDeleteFavorite',
			event_data_id_attribute: 'uid'
		}
	},

	onFavorite: function(favorite_element) {
		if (typeof favorite_element.type === 'undefined' || typeof favorite_element.id === 'undefined' || typeof favorite_element.value === 'undefined') {
			return false;
		}
		DZ.framework.dispatchFavoriteState(favorite_element.type, favorite_element.id, favorite_element.value);

		if (typeof DZ.framework.onFavoriteTriggers[favorite_element.type] !== 'undefined') {

			var event_options = DZ.framework.onFavoriteTriggers[favorite_element.type];
			var event_data = {};
			event_data[event_options.event_data_id_attribute] = favorite_element.id;

			var evt = DZ.Event.framework[event_options.event_add];
			if (!favorite_element.value) {
				evt = DZ.Event.framework[event_options.event_remove];
			}

			DZ.Event.trigger(evt, event_data);
		}
	},

	dispatchFavoriteState: function(type, id, value) {
		var self = this;

		if (typeof self.favoriteElements[type] === 'undefined') {
			return false;
		}
		id = 'id_' + id;
		if (typeof self.favoriteElements[type][id] === 'undefined') {
			return false;
		}
		for (var i = 0; i < self.favoriteElements[type][id].length; i++) {
			self.changeButtonState(self.favoriteElements[type][id][i], value, type);
		}
	},

	changeButtonState: function($el, is_favorite, type) {
		var self = this;
		var textRemove = self.text.remove;
		var textAdd = self.text.add;
		var actionAdd = 'add';
		var actionRemove = 'remove';

		if (type === 'friend') {
			textRemove = self.text.unfollow;
			textAdd = self.text.follow;
			actionAdd = 'follow';
			actionRemove = 'unfollow';
		}

		if (is_favorite) {
			$el.attr('dz-action', actionRemove);
			$el.removeClass(actionAdd).addClass(actionRemove);
			$el.find('.text').html(textRemove);
		} else {
			$el.attr('dz-action', actionAdd);
			$el.removeClass(actionRemove).addClass(actionAdd);
			$el.find('.text').html(textAdd);
		}
		$el.removeAttr('disabled');
	},

	askQueue: function() {
		var self = this;
		var send_queue = {};
		var send_request = false;

		self.forbidParse = true;

		for (var type in self.asking_queue) {
			send_queue[type] = [];
			for (var id in self.asking_queue[type]) {
				send_queue[type].push(id.substr(3));
				send_request = true;
			}
			self.asking_queue[type] = {};
		}
		if (send_request) {
			DZ.communication.callDeezerMethod('DZ.deezer.askFavorites', send_queue);
		} else {
			self.forbidParse = false;
		}
	},

	callbackQueue: function(callback_values) {
		var self = DZ.framework;
		for (var type in callback_values) {
			for (var i = 0; i < callback_values[type].length; i++) {
				self.dispatchFavoriteState(type, callback_values[type][i].id, callback_values[type][i].value);
			}
		}

		self.forbidParse = false;
		self.parseWaiting();
	},

	actions: {
		clickAddLibrary: function() {

			var type = null;
			var id = null;
			var action = '';

			var $el = DZ.query(this);

			if (typeof $el.attr('dz-type') !== 'undefined' && typeof $el.attr('dz-id') !== 'undefined') {
				type = $el.attr('dz-type');
				id = $el.attr('dz-id');
				action = $el.attr('dz-action');
			}

			if (typeof $el.attr('data-type') !== 'undefined' && typeof $el.attr('data-id') !== 'undefined') {
				type = $el.attr('data-type');
				id = $el.attr('data-id');
				action = $el.attr('dz-action');
			}

			var method = 'DZ.deezer.' + action + 'Favorite';
			var favorite_element = {
				type: type,
				id: id
			};
			DZ.communication.callDeezerMethod(method, favorite_element);
		},

		clickFollow: function() {
			var method = 'DZ.deezer.' + DZ.query(this).attr('dz-action');
			var favorite_element = {
				type: 'friend',
				id: DZ.query(this).attr('data-uid')
			};
			DZ.communication.callDeezerMethod(method, favorite_element);
		},

		clickAddToPlaylist: function(e) {
			var $el = DZ.query(this);
			var ids = null;

			if (typeof $el.attr('dz-id') !== 'undefined') {
				ids = $el.attr('dz-id');
			}

			if (typeof $el.attr('data-id') !== 'undefined') {
				ids = $el.attr('data-id');
			}

			DZ.communication.callDeezerMethod('DZ.deezer.addToPlaylist', {
				tracks: ids.split(','),
				position: {
					x: e.pageX,
					y: e.pageY
				}
			});
		},

		clickShare: function() {
			var type = null;
			var id = null;

			var $el = DZ.query(this);

			if (typeof $el.attr('dz-type') !== 'undefined' && typeof $el.attr('dz-id') !== 'undefined') {
				type = $el.attr('dz-type');
				id = $el.attr('dz-id');
			}

			if (typeof $el.attr('data-type') !== 'undefined' && typeof $el.attr('data-id') !== 'undefined') {
				type = $el.attr('data-type');
				id = $el.attr('data-id');
			}

			DZ.communication.callDeezerMethod('DZ.deezer.share', {
				type: type,
				id: id
			});
		},

		clickBuy: function() {
			var type = null;
			var id = null;

			var $el = DZ.query(this);

			if (typeof $el.attr('dz-type') !== 'undefined' && typeof $el.attr('dz-id') !== 'undefined') {
				type = $el.attr('dz-type');
				id = $el.attr('dz-id');
			}

			if (typeof $el.attr('data-type') !== 'undefined' && typeof $el.attr('data-id') !== 'undefined') {
				type = $el.attr('data-type');
				id = $el.attr('data-id');
			}

			DZ.communication.callDeezerMethod('DZ.deezer.buy', {
				type: type,
				id: id
			});
		},

		clickDownload: function(e) {
			var type = null;
			var id = null;

			var $el = DZ.query(this);

			if (typeof $el.attr('dz-type') !== 'undefined' && typeof $el.attr('dz-id') !== 'undefined') {
				type = $el.attr('dz-type');
				id = $el.attr('dz-id');
			}

			if (typeof $el.attr('data-type') !== 'undefined' && typeof $el.attr('data-id') !== 'undefined') {
				type = $el.attr('data-type');
				id = $el.attr('data-id');
			}

			DZ.communication.callDeezerMethod('DZ.deezer.download', {
				type: type,
				id: id
			});
		}
	},

	parseFunctions: {

		'dz-link': function($el) {
			$el.click(function() {
				DZ.navigation.goTo($el.attr('href'));
				return false;
			});

			return true;
		},

		'dz-library': function($el) {
			var type = null;
			var id = null;

			if (typeof $el.attr('dz-type') !== 'undefined' && typeof $el.attr('dz-id') !== 'undefined') {
				type = $el.attr('dz-type');
				id = $el.attr('dz-id');
			}

			if (typeof $el.attr('data-type') !== 'undefined' && typeof $el.attr('data-id') !== 'undefined') {
				type = $el.attr('data-type');
				id = $el.attr('data-id');
			}

			if (type === null || id === null) {
				return false;
			}

			if (type !== 'album' && type !== 'playlist' && type !== 'artist' && type !== 'radio') {
				return false;
			}
			var $content = '<button class="dz-btn"> <span class="dz-icn"></span> <span class="text"></span></button>';
			$el.append($content);
			$el.click(DZ.framework.actions.clickAddLibrary).attr('disabled', true);// .removeAttr('disabled');
			DZ.framework.addFavoriteElement(type, id, $el);

			return true;
		},

		'dz-follow': function($el) {
			if (typeof $el.attr('data-uid') === 'undefined') {
				return false;
			}
			var id = $el.attr('data-uid');
			var $content = '<button class="dz-btn"> <span class="dz-icn"></span> <span class="text"></span></button>';
			$el.append($content);
			$el.click(DZ.framework.actions.clickFollow).attr('disabled', true);
			DZ.framework.addFavoriteElement('friend', id, $el);

			return true;
		},

		'dz-addtoplaylist': function($el, id) {
			var id = null;

			if (typeof $el.attr('dz-id') !== 'undefined') {
				id = $el.attr('dz-id');
			}

			if (typeof $el.attr('data-id') !== 'undefined') {
				id = $el.attr('data-id');
			}

			if (id === null) {
				return false;
			}

			var $content = '<button class="dz-btn"><span class="text">' + DZ.framework.text.add_playlist + '</span></button>';
			$el.append($content);
			$el.click(DZ.framework.actions.clickAddToPlaylist);

			return true;
		},

		'dz-share': function($el, id) {

			var type = null;
			id = null;

			if (typeof $el.attr('dz-type') !== 'undefined' && typeof $el.attr('dz-id') !== 'undefined') {
				type = $el.attr('dz-type');
				id = $el.attr('dz-id');
			}
			// console.log('EL DATA', $el.data());
			if (typeof $el.attr('data-type') !== 'undefined' && typeof $el.attr('data-id') !== 'undefined') {
				type = $el.attr('data-type');
				id = $el.attr('data-id');
			}

			if (type === null || id === null) {
				return false;
			}

			var $content = '<button class="dz-btn"> <span class="dz-icn"></span> <span class="text">' + DZ.framework.text.share + '</span></button>';
			$el.addClass('dz-btn').append($content);
			$el.click(DZ.framework.actions.clickShare);

			return true;
		},

		'dz-buy': function($el, id) {
			var type = null;
			id = null;

			if (typeof $el.attr('dz-type') !== 'undefined' && typeof $el.attr('dz-id') !== 'undefined') {
				type = $el.attr('dz-type');
				id = $el.attr('dz-id');
			}

			if (typeof $el.attr('data-type') !== 'undefined' && typeof $el.attr('data-id') !== 'undefined') {
				type = $el.attr('data-type');
				id = $el.attr('data-id');
			}

			if (type === null || id === null) {
				return false;
			}

			var $content = '<button class="dz-btn"> <span class="dz-icn"></span> <span class="text">' + DZ.framework.text.buy + '</span></button>';
			$el.append($content);
			$el.click(DZ.framework.actions.clickBuy);

			return true;
		},

		'dz-download': function($el, id) {
			var type = null;
			var id = null;

			if (typeof $el.attr('dz-type') !== 'undefined' && typeof $el.attr('dz-id') !== 'undefined') {
				type = $el.attr('dz-type');
				id = $el.attr('dz-id');
			}

			if (typeof $el.attr('data-type') !== 'undefined' && typeof $el.attr('data-id') !== 'undefined') {
				type = $el.attr('data-type');
				id = $el.attr('data-id');
			}

			if (type === null || id === null) {
				return false;
			}

			if (type !== 'album' && type !== 'playlist') {
				return false;
			}
			var $content = '<button class="dz-btn"> <span class="dz-icn"></span> <span class="text">' + DZ.framework.text.download + '</span></button>';
			$el.append($content);
			$el.click(DZ.framework.actions.clickDownload);

			return true;
		}

	}
};DZ.user = {

	onLoad: function(params) {

	}

};/*! jQuery v1.7.2 jquery.com | jquery.org/license */
(function(a,b){function cy(a){return f.isWindow(a)?a:a.nodeType===9?a.defaultView||a.parentWindow:!1}function cu(a){if(!cj[a]){var b=c.body,d=f("<"+a+">").appendTo(b),e=d.css("display");d.remove();if(e==="none"||e===""){ck||(ck=c.createElement("iframe"),ck.frameBorder=ck.width=ck.height=0),b.appendChild(ck);if(!cl||!ck.createElement)cl=(ck.contentWindow||ck.contentDocument).document,cl.write((f.support.boxModel?"<!doctype html>":"")+"<html><body>"),cl.close();d=cl.createElement(a),cl.body.appendChild(d),e=f.css(d,"display"),b.removeChild(ck)}cj[a]=e}return cj[a]}function ct(a,b){var c={};f.each(cp.concat.apply([],cp.slice(0,b)),function(){c[this]=a});return c}function cs(){cq=b}function cr(){setTimeout(cs,0);return cq=f.now()}function ci(){try{return new a.ActiveXObject("Microsoft.XMLHTTP")}catch(b){}}function ch(){try{return new a.XMLHttpRequest}catch(b){}}function cb(a,c){a.dataFilter&&(c=a.dataFilter(c,a.dataType));var d=a.dataTypes,e={},g,h,i=d.length,j,k=d[0],l,m,n,o,p;for(g=1;g<i;g++){if(g===1)for(h in a.converters)typeof h=="string"&&(e[h.toLowerCase()]=a.converters[h]);l=k,k=d[g];if(k==="*")k=l;else if(l!=="*"&&l!==k){m=l+" "+k,n=e[m]||e["* "+k];if(!n){p=b;for(o in e){j=o.split(" ");if(j[0]===l||j[0]==="*"){p=e[j[1]+" "+k];if(p){o=e[o],o===!0?n=p:p===!0&&(n=o);break}}}}!n&&!p&&f.error("No conversion from "+m.replace(" "," to ")),n!==!0&&(c=n?n(c):p(o(c)))}}return c}function ca(a,c,d){var e=a.contents,f=a.dataTypes,g=a.responseFields,h,i,j,k;for(i in g)i in d&&(c[g[i]]=d[i]);while(f[0]==="*")f.shift(),h===b&&(h=a.mimeType||c.getResponseHeader("content-type"));if(h)for(i in e)if(e[i]&&e[i].test(h)){f.unshift(i);break}if(f[0]in d)j=f[0];else{for(i in d){if(!f[0]||a.converters[i+" "+f[0]]){j=i;break}k||(k=i)}j=j||k}if(j){j!==f[0]&&f.unshift(j);return d[j]}}function b_(a,b,c,d){if(f.isArray(b))f.each(b,function(b,e){c||bD.test(a)?d(a,e):b_(a+"["+(typeof e=="object"?b:"")+"]",e,c,d)});else if(!c&&f.type(b)==="object")for(var e in b)b_(a+"["+e+"]",b[e],c,d);else d(a,b)}function b$(a,c){var d,e,g=f.ajaxSettings.flatOptions||{};for(d in c)c[d]!==b&&((g[d]?a:e||(e={}))[d]=c[d]);e&&f.extend(!0,a,e)}function bZ(a,c,d,e,f,g){f=f||c.dataTypes[0],g=g||{},g[f]=!0;var h=a[f],i=0,j=h?h.length:0,k=a===bS,l;for(;i<j&&(k||!l);i++)l=h[i](c,d,e),typeof l=="string"&&(!k||g[l]?l=b:(c.dataTypes.unshift(l),l=bZ(a,c,d,e,l,g)));(k||!l)&&!g["*"]&&(l=bZ(a,c,d,e,"*",g));return l}function bY(a){return function(b,c){typeof b!="string"&&(c=b,b="*");if(f.isFunction(c)){var d=b.toLowerCase().split(bO),e=0,g=d.length,h,i,j;for(;e<g;e++)h=d[e],j=/^\+/.test(h),j&&(h=h.substr(1)||"*"),i=a[h]=a[h]||[],i[j?"unshift":"push"](c)}}}function bB(a,b,c){var d=b==="width"?a.offsetWidth:a.offsetHeight,e=b==="width"?1:0,g=4;if(d>0){if(c!=="border")for(;e<g;e+=2)c||(d-=parseFloat(f.css(a,"padding"+bx[e]))||0),c==="margin"?d+=parseFloat(f.css(a,c+bx[e]))||0:d-=parseFloat(f.css(a,"border"+bx[e]+"Width"))||0;return d+"px"}d=by(a,b);if(d<0||d==null)d=a.style[b];if(bt.test(d))return d;d=parseFloat(d)||0;if(c)for(;e<g;e+=2)d+=parseFloat(f.css(a,"padding"+bx[e]))||0,c!=="padding"&&(d+=parseFloat(f.css(a,"border"+bx[e]+"Width"))||0),c==="margin"&&(d+=parseFloat(f.css(a,c+bx[e]))||0);return d+"px"}function bo(a){var b=c.createElement("div");bh.appendChild(b),b.innerHTML=a.outerHTML;return b.firstChild}function bn(a){var b=(a.nodeName||"").toLowerCase();b==="input"?bm(a):b!=="script"&&typeof a.getElementsByTagName!="undefined"&&f.grep(a.getElementsByTagName("input"),bm)}function bm(a){if(a.type==="checkbox"||a.type==="radio")a.defaultChecked=a.checked}function bl(a){return typeof a.getElementsByTagName!="undefined"?a.getElementsByTagName("*"):typeof a.querySelectorAll!="undefined"?a.querySelectorAll("*"):[]}function bk(a,b){var c;b.nodeType===1&&(b.clearAttributes&&b.clearAttributes(),b.mergeAttributes&&b.mergeAttributes(a),c=b.nodeName.toLowerCase(),c==="object"?b.outerHTML=a.outerHTML:c!=="input"||a.type!=="checkbox"&&a.type!=="radio"?c==="option"?b.selected=a.defaultSelected:c==="input"||c==="textarea"?b.defaultValue=a.defaultValue:c==="script"&&b.text!==a.text&&(b.text=a.text):(a.checked&&(b.defaultChecked=b.checked=a.checked),b.value!==a.value&&(b.value=a.value)),b.removeAttribute(f.expando),b.removeAttribute("_submit_attached"),b.removeAttribute("_change_attached"))}function bj(a,b){if(b.nodeType===1&&!!f.hasData(a)){var c,d,e,g=f._data(a),h=f._data(b,g),i=g.events;if(i){delete h.handle,h.events={};for(c in i)for(d=0,e=i[c].length;d<e;d++)f.event.add(b,c,i[c][d])}h.data&&(h.data=f.extend({},h.data))}}function bi(a,b){return f.nodeName(a,"table")?a.getElementsByTagName("tbody")[0]||a.appendChild(a.ownerDocument.createElement("tbody")):a}function U(a){var b=V.split("|"),c=a.createDocumentFragment();if(c.createElement)while(b.length)c.createElement(b.pop());return c}function T(a,b,c){b=b||0;if(f.isFunction(b))return f.grep(a,function(a,d){var e=!!b.call(a,d,a);return e===c});if(b.nodeType)return f.grep(a,function(a,d){return a===b===c});if(typeof b=="string"){var d=f.grep(a,function(a){return a.nodeType===1});if(O.test(b))return f.filter(b,d,!c);b=f.filter(b,d)}return f.grep(a,function(a,d){return f.inArray(a,b)>=0===c})}function S(a){return!a||!a.parentNode||a.parentNode.nodeType===11}function K(){return!0}function J(){return!1}function n(a,b,c){var d=b+"defer",e=b+"queue",g=b+"mark",h=f._data(a,d);h&&(c==="queue"||!f._data(a,e))&&(c==="mark"||!f._data(a,g))&&setTimeout(function(){!f._data(a,e)&&!f._data(a,g)&&(f.removeData(a,d,!0),h.fire())},0)}function m(a){for(var b in a){if(b==="data"&&f.isEmptyObject(a[b]))continue;if(b!=="toJSON")return!1}return!0}function l(a,c,d){if(d===b&&a.nodeType===1){var e="data-"+c.replace(k,"-$1").toLowerCase();d=a.getAttribute(e);if(typeof d=="string"){try{d=d==="true"?!0:d==="false"?!1:d==="null"?null:f.isNumeric(d)?+d:j.test(d)?f.parseJSON(d):d}catch(g){}f.data(a,c,d)}else d=b}return d}function h(a){var b=g[a]={},c,d;a=a.split(/\s+/);for(c=0,d=a.length;c<d;c++)b[a[c]]=!0;return b}var c=a.document,d=a.navigator,e=a.location,f=function(){function J(){if(!e.isReady){try{c.documentElement.doScroll("left")}catch(a){setTimeout(J,1);return}e.ready()}}var e=function(a,b){return new e.fn.init(a,b,h)},f=a.jQuery,g=a.$,h,i=/^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,j=/\S/,k=/^\s+/,l=/\s+$/,m=/^<(\w+)\s*\/?>(?:<\/\1>)?$/,n=/^[\],:{}\s]*$/,o=/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,p=/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,q=/(?:^|:|,)(?:\s*\[)+/g,r=/(webkit)[ \/]([\w.]+)/,s=/(opera)(?:.*version)?[ \/]([\w.]+)/,t=/(msie) ([\w.]+)/,u=/(mozilla)(?:.*? rv:([\w.]+))?/,v=/-([a-z]|[0-9])/ig,w=/^-ms-/,x=function(a,b){return(b+"").toUpperCase()},y=d.userAgent,z,A,B,C=Object.prototype.toString,D=Object.prototype.hasOwnProperty,E=Array.prototype.push,F=Array.prototype.slice,G=String.prototype.trim,H=Array.prototype.indexOf,I={};e.fn=e.prototype={constructor:e,init:function(a,d,f){var g,h,j,k;if(!a)return this;if(a.nodeType){this.context=this[0]=a,this.length=1;return this}if(a==="body"&&!d&&c.body){this.context=c,this[0]=c.body,this.selector=a,this.length=1;return this}if(typeof a=="string"){a.charAt(0)!=="<"||a.charAt(a.length-1)!==">"||a.length<3?g=i.exec(a):g=[null,a,null];if(g&&(g[1]||!d)){if(g[1]){d=d instanceof e?d[0]:d,k=d?d.ownerDocument||d:c,j=m.exec(a),j?e.isPlainObject(d)?(a=[c.createElement(j[1])],e.fn.attr.call(a,d,!0)):a=[k.createElement(j[1])]:(j=e.buildFragment([g[1]],[k]),a=(j.cacheable?e.clone(j.fragment):j.fragment).childNodes);return e.merge(this,a)}h=c.getElementById(g[2]);if(h&&h.parentNode){if(h.id!==g[2])return f.find(a);this.length=1,this[0]=h}this.context=c,this.selector=a;return this}return!d||d.jquery?(d||f).find(a):this.constructor(d).find(a)}if(e.isFunction(a))return f.ready(a);a.selector!==b&&(this.selector=a.selector,this.context=a.context);return e.makeArray(a,this)},selector:"",jquery:"1.7.2",length:0,size:function(){return this.length},toArray:function(){return F.call(this,0)},get:function(a){return a==null?this.toArray():a<0?this[this.length+a]:this[a]},pushStack:function(a,b,c){var d=this.constructor();e.isArray(a)?E.apply(d,a):e.merge(d,a),d.prevObject=this,d.context=this.context,b==="find"?d.selector=this.selector+(this.selector?" ":"")+c:b&&(d.selector=this.selector+"."+b+"("+c+")");return d},each:function(a,b){return e.each(this,a,b)},ready:function(a){e.bindReady(),A.add(a);return this},eq:function(a){a=+a;return a===-1?this.slice(a):this.slice(a,a+1)},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},slice:function(){return this.pushStack(F.apply(this,arguments),"slice",F.call(arguments).join(","))},map:function(a){return this.pushStack(e.map(this,function(b,c){return a.call(b,c,b)}))},end:function(){return this.prevObject||this.constructor(null)},push:E,sort:[].sort,splice:[].splice},e.fn.init.prototype=e.fn,e.extend=e.fn.extend=function(){var a,c,d,f,g,h,i=arguments[0]||{},j=1,k=arguments.length,l=!1;typeof i=="boolean"&&(l=i,i=arguments[1]||{},j=2),typeof i!="object"&&!e.isFunction(i)&&(i={}),k===j&&(i=this,--j);for(;j<k;j++)if((a=arguments[j])!=null)for(c in a){d=i[c],f=a[c];if(i===f)continue;l&&f&&(e.isPlainObject(f)||(g=e.isArray(f)))?(g?(g=!1,h=d&&e.isArray(d)?d:[]):h=d&&e.isPlainObject(d)?d:{},i[c]=e.extend(l,h,f)):f!==b&&(i[c]=f)}return i},e.extend({noConflict:function(b){a.$===e&&(a.$=g),b&&a.jQuery===e&&(a.jQuery=f);return e},isReady:!1,readyWait:1,holdReady:function(a){a?e.readyWait++:e.ready(!0)},ready:function(a){if(a===!0&&!--e.readyWait||a!==!0&&!e.isReady){if(!c.body)return setTimeout(e.ready,1);e.isReady=!0;if(a!==!0&&--e.readyWait>0)return;A.fireWith(c,[e]),e.fn.trigger&&e(c).trigger("ready").off("ready")}},bindReady:function(){if(!A){A=e.Callbacks("once memory");if(c.readyState==="complete")return setTimeout(e.ready,1);if(c.addEventListener)c.addEventListener("DOMContentLoaded",B,!1),a.addEventListener("load",e.ready,!1);else if(c.attachEvent){c.attachEvent("onreadystatechange",B),a.attachEvent("onload",e.ready);var b=!1;try{b=a.frameElement==null}catch(d){}c.documentElement.doScroll&&b&&J()}}},isFunction:function(a){return e.type(a)==="function"},isArray:Array.isArray||function(a){return e.type(a)==="array"},isWindow:function(a){return a!=null&&a==a.window},isNumeric:function(a){return!isNaN(parseFloat(a))&&isFinite(a)},type:function(a){return a==null?String(a):I[C.call(a)]||"object"},isPlainObject:function(a){if(!a||e.type(a)!=="object"||a.nodeType||e.isWindow(a))return!1;try{if(a.constructor&&!D.call(a,"constructor")&&!D.call(a.constructor.prototype,"isPrototypeOf"))return!1}catch(c){return!1}var d;for(d in a);return d===b||D.call(a,d)},isEmptyObject:function(a){for(var b in a)return!1;return!0},error:function(a){throw new Error(a)},parseJSON:function(b){if(typeof b!="string"||!b)return null;b=e.trim(b);if(a.JSON&&a.JSON.parse)return a.JSON.parse(b);if(n.test(b.replace(o,"@").replace(p,"]").replace(q,"")))return(new Function("return "+b))();e.error("Invalid JSON: "+b)},parseXML:function(c){if(typeof c!="string"||!c)return null;var d,f;try{a.DOMParser?(f=new DOMParser,d=f.parseFromString(c,"text/xml")):(d=new ActiveXObject("Microsoft.XMLDOM"),d.async="false",d.loadXML(c))}catch(g){d=b}(!d||!d.documentElement||d.getElementsByTagName("parsererror").length)&&e.error("Invalid XML: "+c);return d},noop:function(){},globalEval:function(b){b&&j.test(b)&&(a.execScript||function(b){a.eval.call(a,b)})(b)},camelCase:function(a){return a.replace(w,"ms-").replace(v,x)},nodeName:function(a,b){return a.nodeName&&a.nodeName.toUpperCase()===b.toUpperCase()},each:function(a,c,d){var f,g=0,h=a.length,i=h===b||e.isFunction(a);if(d){if(i){for(f in a)if(c.apply(a[f],d)===!1)break}else for(;g<h;)if(c.apply(a[g++],d)===!1)break}else if(i){for(f in a)if(c.call(a[f],f,a[f])===!1)break}else for(;g<h;)if(c.call(a[g],g,a[g++])===!1)break;return a},trim:G?function(a){return a==null?"":G.call(a)}:function(a){return a==null?"":(a+"").replace(k,"").replace(l,"")},makeArray:function(a,b){var c=b||[];if(a!=null){var d=e.type(a);a.length==null||d==="string"||d==="function"||d==="regexp"||e.isWindow(a)?E.call(c,a):e.merge(c,a)}return c},inArray:function(a,b,c){var d;if(b){if(H)return H.call(b,a,c);d=b.length,c=c?c<0?Math.max(0,d+c):c:0;for(;c<d;c++)if(c in b&&b[c]===a)return c}return-1},merge:function(a,c){var d=a.length,e=0;if(typeof c.length=="number")for(var f=c.length;e<f;e++)a[d++]=c[e];else while(c[e]!==b)a[d++]=c[e++];a.length=d;return a},grep:function(a,b,c){var d=[],e;c=!!c;for(var f=0,g=a.length;f<g;f++)e=!!b(a[f],f),c!==e&&d.push(a[f]);return d},map:function(a,c,d){var f,g,h=[],i=0,j=a.length,k=a instanceof e||j!==b&&typeof j=="number"&&(j>0&&a[0]&&a[j-1]||j===0||e.isArray(a));if(k)for(;i<j;i++)f=c(a[i],i,d),f!=null&&(h[h.length]=f);else for(g in a)f=c(a[g],g,d),f!=null&&(h[h.length]=f);return h.concat.apply([],h)},guid:1,proxy:function(a,c){if(typeof c=="string"){var d=a[c];c=a,a=d}if(!e.isFunction(a))return b;var f=F.call(arguments,2),g=function(){return a.apply(c,f.concat(F.call(arguments)))};g.guid=a.guid=a.guid||g.guid||e.guid++;return g},access:function(a,c,d,f,g,h,i){var j,k=d==null,l=0,m=a.length;if(d&&typeof d=="object"){for(l in d)e.access(a,c,l,d[l],1,h,f);g=1}else if(f!==b){j=i===b&&e.isFunction(f),k&&(j?(j=c,c=function(a,b,c){return j.call(e(a),c)}):(c.call(a,f),c=null));if(c)for(;l<m;l++)c(a[l],d,j?f.call(a[l],l,c(a[l],d)):f,i);g=1}return g?a:k?c.call(a):m?c(a[0],d):h},now:function(){return(new Date).getTime()},uaMatch:function(a){a=a.toLowerCase();var b=r.exec(a)||s.exec(a)||t.exec(a)||a.indexOf("compatible")<0&&u.exec(a)||[];return{browser:b[1]||"",version:b[2]||"0"}},sub:function(){function a(b,c){return new a.fn.init(b,c)}e.extend(!0,a,this),a.superclass=this,a.fn=a.prototype=this(),a.fn.constructor=a,a.sub=this.sub,a.fn.init=function(d,f){f&&f instanceof e&&!(f instanceof a)&&(f=a(f));return e.fn.init.call(this,d,f,b)},a.fn.init.prototype=a.fn;var b=a(c);return a},browser:{}}),e.each("Boolean Number String Function Array Date RegExp Object".split(" "),function(a,b){I["[object "+b+"]"]=b.toLowerCase()}),z=e.uaMatch(y),z.browser&&(e.browser[z.browser]=!0,e.browser.version=z.version),e.browser.webkit&&(e.browser.safari=!0),j.test(" ")&&(k=/^[\s\xA0]+/,l=/[\s\xA0]+$/),h=e(c),c.addEventListener?B=function(){c.removeEventListener("DOMContentLoaded",B,!1),e.ready()}:c.attachEvent&&(B=function(){c.readyState==="complete"&&(c.detachEvent("onreadystatechange",B),e.ready())});return e}(),g={};f.Callbacks=function(a){a=a?g[a]||h(a):{};var c=[],d=[],e,i,j,k,l,m,n=function(b){var d,e,g,h,i;for(d=0,e=b.length;d<e;d++)g=b[d],h=f.type(g),h==="array"?n(g):h==="function"&&(!a.unique||!p.has(g))&&c.push(g)},o=function(b,f){f=f||[],e=!a.memory||[b,f],i=!0,j=!0,m=k||0,k=0,l=c.length;for(;c&&m<l;m++)if(c[m].apply(b,f)===!1&&a.stopOnFalse){e=!0;break}j=!1,c&&(a.once?e===!0?p.disable():c=[]:d&&d.length&&(e=d.shift(),p.fireWith(e[0],e[1])))},p={add:function(){if(c){var a=c.length;n(arguments),j?l=c.length:e&&e!==!0&&(k=a,o(e[0],e[1]))}return this},remove:function(){if(c){var b=arguments,d=0,e=b.length;for(;d<e;d++)for(var f=0;f<c.length;f++)if(b[d]===c[f]){j&&f<=l&&(l--,f<=m&&m--),c.splice(f--,1);if(a.unique)break}}return this},has:function(a){if(c){var b=0,d=c.length;for(;b<d;b++)if(a===c[b])return!0}return!1},empty:function(){c=[];return this},disable:function(){c=d=e=b;return this},disabled:function(){return!c},lock:function(){d=b,(!e||e===!0)&&p.disable();return this},locked:function(){return!d},fireWith:function(b,c){d&&(j?a.once||d.push([b,c]):(!a.once||!e)&&o(b,c));return this},fire:function(){p.fireWith(this,arguments);return this},fired:function(){return!!i}};return p};var i=[].slice;f.extend({Deferred:function(a){var b=f.Callbacks("once memory"),c=f.Callbacks("once memory"),d=f.Callbacks("memory"),e="pending",g={resolve:b,reject:c,notify:d},h={done:b.add,fail:c.add,progress:d.add,state:function(){return e},isResolved:b.fired,isRejected:c.fired,then:function(a,b,c){i.done(a).fail(b).progress(c);return this},always:function(){i.done.apply(i,arguments).fail.apply(i,arguments);return this},pipe:function(a,b,c){return f.Deferred(function(d){f.each({done:[a,"resolve"],fail:[b,"reject"],progress:[c,"notify"]},function(a,b){var c=b[0],e=b[1],g;f.isFunction(c)?i[a](function(){g=c.apply(this,arguments),g&&f.isFunction(g.promise)?g.promise().then(d.resolve,d.reject,d.notify):d[e+"With"](this===i?d:this,[g])}):i[a](d[e])})}).promise()},promise:function(a){if(a==null)a=h;else for(var b in h)a[b]=h[b];return a}},i=h.promise({}),j;for(j in g)i[j]=g[j].fire,i[j+"With"]=g[j].fireWith;i.done(function(){e="resolved"},c.disable,d.lock).fail(function(){e="rejected"},b.disable,d.lock),a&&a.call(i,i);return i},when:function(a){function m(a){return function(b){e[a]=arguments.length>1?i.call(arguments,0):b,j.notifyWith(k,e)}}function l(a){return function(c){b[a]=arguments.length>1?i.call(arguments,0):c,--g||j.resolveWith(j,b)}}var b=i.call(arguments,0),c=0,d=b.length,e=Array(d),g=d,h=d,j=d<=1&&a&&f.isFunction(a.promise)?a:f.Deferred(),k=j.promise();if(d>1){for(;c<d;c++)b[c]&&b[c].promise&&f.isFunction(b[c].promise)?b[c].promise().then(l(c),j.reject,m(c)):--g;g||j.resolveWith(j,b)}else j!==a&&j.resolveWith(j,d?[a]:[]);return k}}),f.support=function(){var b,d,e,g,h,i,j,k,l,m,n,o,p=c.createElement("div"),q=c.documentElement;p.setAttribute("className","t"),p.innerHTML="   <link/><table></table><a href='/a' style='top:1px;float:left;opacity:.55;'>a</a><input type='checkbox'/>",d=p.getElementsByTagName("*"),e=p.getElementsByTagName("a")[0];if(!d||!d.length||!e)return{};g=c.createElement("select"),h=g.appendChild(c.createElement("option")),i=p.getElementsByTagName("input")[0],b={leadingWhitespace:p.firstChild.nodeType===3,tbody:!p.getElementsByTagName("tbody").length,htmlSerialize:!!p.getElementsByTagName("link").length,style:/top/.test(e.getAttribute("style")),hrefNormalized:e.getAttribute("href")==="/a",opacity:/^0.55/.test(e.style.opacity),cssFloat:!!e.style.cssFloat,checkOn:i.value==="on",optSelected:h.selected,getSetAttribute:p.className!=="t",enctype:!!c.createElement("form").enctype,html5Clone:c.createElement("nav").cloneNode(!0).outerHTML!=="<:nav></:nav>",submitBubbles:!0,changeBubbles:!0,focusinBubbles:!1,deleteExpando:!0,noCloneEvent:!0,inlineBlockNeedsLayout:!1,shrinkWrapBlocks:!1,reliableMarginRight:!0,pixelMargin:!0},f.boxModel=b.boxModel=c.compatMode==="CSS1Compat",i.checked=!0,b.noCloneChecked=i.cloneNode(!0).checked,g.disabled=!0,b.optDisabled=!h.disabled;try{delete p.test}catch(r){b.deleteExpando=!1}!p.addEventListener&&p.attachEvent&&p.fireEvent&&(p.attachEvent("onclick",function(){b.noCloneEvent=!1}),p.cloneNode(!0).fireEvent("onclick")),i=c.createElement("input"),i.value="t",i.setAttribute("type","radio"),b.radioValue=i.value==="t",i.setAttribute("checked","checked"),i.setAttribute("name","t"),p.appendChild(i),j=c.createDocumentFragment(),j.appendChild(p.lastChild),b.checkClone=j.cloneNode(!0).cloneNode(!0).lastChild.checked,b.appendChecked=i.checked,j.removeChild(i),j.appendChild(p);if(p.attachEvent)for(n in{submit:1,change:1,focusin:1})m="on"+n,o=m in p,o||(p.setAttribute(m,"return;"),o=typeof p[m]=="function"),b[n+"Bubbles"]=o;j.removeChild(p),j=g=h=p=i=null,f(function(){var d,e,g,h,i,j,l,m,n,q,r,s,t,u=c.getElementsByTagName("body")[0];!u||(m=1,t="padding:0;margin:0;border:",r="position:absolute;top:0;left:0;width:1px;height:1px;",s=t+"0;visibility:hidden;",n="style='"+r+t+"5px solid #000;",q="<div "+n+"display:block;'><div style='"+t+"0;display:block;overflow:hidden;'></div></div>"+"<table "+n+"' cellpadding='0' cellspacing='0'>"+"<tr><td></td></tr></table>",d=c.createElement("div"),d.style.cssText=s+"width:0;height:0;position:static;top:0;margin-top:"+m+"px",u.insertBefore(d,u.firstChild),p=c.createElement("div"),d.appendChild(p),p.innerHTML="<table><tr><td style='"+t+"0;display:none'></td><td>t</td></tr></table>",k=p.getElementsByTagName("td"),o=k[0].offsetHeight===0,k[0].style.display="",k[1].style.display="none",b.reliableHiddenOffsets=o&&k[0].offsetHeight===0,a.getComputedStyle&&(p.innerHTML="",l=c.createElement("div"),l.style.width="0",l.style.marginRight="0",p.style.width="2px",p.appendChild(l),b.reliableMarginRight=(parseInt((a.getComputedStyle(l,null)||{marginRight:0}).marginRight,10)||0)===0),typeof p.style.zoom!="undefined"&&(p.innerHTML="",p.style.width=p.style.padding="1px",p.style.border=0,p.style.overflow="hidden",p.style.display="inline",p.style.zoom=1,b.inlineBlockNeedsLayout=p.offsetWidth===3,p.style.display="block",p.style.overflow="visible",p.innerHTML="<div style='width:5px;'></div>",b.shrinkWrapBlocks=p.offsetWidth!==3),p.style.cssText=r+s,p.innerHTML=q,e=p.firstChild,g=e.firstChild,i=e.nextSibling.firstChild.firstChild,j={doesNotAddBorder:g.offsetTop!==5,doesAddBorderForTableAndCells:i.offsetTop===5},g.style.position="fixed",g.style.top="20px",j.fixedPosition=g.offsetTop===20||g.offsetTop===15,g.style.position=g.style.top="",e.style.overflow="hidden",e.style.position="relative",j.subtractsBorderForOverflowNotVisible=g.offsetTop===-5,j.doesNotIncludeMarginInBodyOffset=u.offsetTop!==m,a.getComputedStyle&&(p.style.marginTop="1%",b.pixelMargin=(a.getComputedStyle(p,null)||{marginTop:0}).marginTop!=="1%"),typeof d.style.zoom!="undefined"&&(d.style.zoom=1),u.removeChild(d),l=p=d=null,f.extend(b,j))});return b}();var j=/^(?:\{.*\}|\[.*\])$/,k=/([A-Z])/g;f.extend({cache:{},uuid:0,expando:"jQuery"+(f.fn.jquery+Math.random()).replace(/\D/g,""),noData:{embed:!0,object:"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",applet:!0},hasData:function(a){a=a.nodeType?f.cache[a[f.expando]]:a[f.expando];return!!a&&!m(a)},data:function(a,c,d,e){if(!!f.acceptData(a)){var g,h,i,j=f.expando,k=typeof c=="string",l=a.nodeType,m=l?f.cache:a,n=l?a[j]:a[j]&&j,o=c==="events";if((!n||!m[n]||!o&&!e&&!m[n].data)&&k&&d===b)return;n||(l?a[j]=n=++f.uuid:n=j),m[n]||(m[n]={},l||(m[n].toJSON=f.noop));if(typeof c=="object"||typeof c=="function")e?m[n]=f.extend(m[n],c):m[n].data=f.extend(m[n].data,c);g=h=m[n],e||(h.data||(h.data={}),h=h.data),d!==b&&(h[f.camelCase(c)]=d);if(o&&!h[c])return g.events;k?(i=h[c],i==null&&(i=h[f.camelCase(c)])):i=h;return i}},removeData:function(a,b,c){if(!!f.acceptData(a)){var d,e,g,h=f.expando,i=a.nodeType,j=i?f.cache:a,k=i?a[h]:h;if(!j[k])return;if(b){d=c?j[k]:j[k].data;if(d){f.isArray(b)||(b in d?b=[b]:(b=f.camelCase(b),b in d?b=[b]:b=b.split(" ")));for(e=0,g=b.length;e<g;e++)delete d[b[e]];if(!(c?m:f.isEmptyObject)(d))return}}if(!c){delete j[k].data;if(!m(j[k]))return}f.support.deleteExpando||!j.setInterval?delete j[k]:j[k]=null,i&&(f.support.deleteExpando?delete a[h]:a.removeAttribute?a.removeAttribute(h):a[h]=null)}},_data:function(a,b,c){return f.data(a,b,c,!0)},acceptData:function(a){if(a.nodeName){var b=f.noData[a.nodeName.toLowerCase()];if(b)return b!==!0&&a.getAttribute("classid")===b}return!0}}),f.fn.extend({data:function(a,c){var d,e,g,h,i,j=this[0],k=0,m=null;if(a===b){if(this.length){m=f.data(j);if(j.nodeType===1&&!f._data(j,"parsedAttrs")){g=j.attributes;for(i=g.length;k<i;k++)h=g[k].name,h.indexOf("data-")===0&&(h=f.camelCase(h.substring(5)),l(j,h,m[h]));f._data(j,"parsedAttrs",!0)}}return m}if(typeof a=="object")return this.each(function(){f.data(this,a)});d=a.split(".",2),d[1]=d[1]?"."+d[1]:"",e=d[1]+"!";return f.access(this,function(c){if(c===b){m=this.triggerHandler("getData"+e,[d[0]]),m===b&&j&&(m=f.data(j,a),m=l(j,a,m));return m===b&&d[1]?this.data(d[0]):m}d[1]=c,this.each(function(){var b=f(this);b.triggerHandler("setData"+e,d),f.data(this,a,c),b.triggerHandler("changeData"+e,d)})},null,c,arguments.length>1,null,!1)},removeData:function(a){return this.each(function(){f.removeData(this,a)})}}),f.extend({_mark:function(a,b){a&&(b=(b||"fx")+"mark",f._data(a,b,(f._data(a,b)||0)+1))},_unmark:function(a,b,c){a!==!0&&(c=b,b=a,a=!1);if(b){c=c||"fx";var d=c+"mark",e=a?0:(f._data(b,d)||1)-1;e?f._data(b,d,e):(f.removeData(b,d,!0),n(b,c,"mark"))}},queue:function(a,b,c){var d;if(a){b=(b||"fx")+"queue",d=f._data(a,b),c&&(!d||f.isArray(c)?d=f._data(a,b,f.makeArray(c)):d.push(c));return d||[]}},dequeue:function(a,b){b=b||"fx";var c=f.queue(a,b),d=c.shift(),e={};d==="inprogress"&&(d=c.shift()),d&&(b==="fx"&&c.unshift("inprogress"),f._data(a,b+".run",e),d.call(a,function(){f.dequeue(a,b)},e)),c.length||(f.removeData(a,b+"queue "+b+".run",!0),n(a,b,"queue"))}}),f.fn.extend({queue:function(a,c){var d=2;typeof a!="string"&&(c=a,a="fx",d--);if(arguments.length<d)return f.queue(this[0],a);return c===b?this:this.each(function(){var b=f.queue(this,a,c);a==="fx"&&b[0]!=="inprogress"&&f.dequeue(this,a)})},dequeue:function(a){return this.each(function(){f.dequeue(this,a)})},delay:function(a,b){a=f.fx?f.fx.speeds[a]||a:a,b=b||"fx";return this.queue(b,function(b,c){var d=setTimeout(b,a);c.stop=function(){clearTimeout(d)}})},clearQueue:function(a){return this.queue(a||"fx",[])},promise:function(a,c){function m(){--h||d.resolveWith(e,[e])}typeof a!="string"&&(c=a,a=b),a=a||"fx";var d=f.Deferred(),e=this,g=e.length,h=1,i=a+"defer",j=a+"queue",k=a+"mark",l;while(g--)if(l=f.data(e[g],i,b,!0)||(f.data(e[g],j,b,!0)||f.data(e[g],k,b,!0))&&f.data(e[g],i,f.Callbacks("once memory"),!0))h++,l.add(m);m();return d.promise(c)}});var o=/[\n\t\r]/g,p=/\s+/,q=/\r/g,r=/^(?:button|input)$/i,s=/^(?:button|input|object|select|textarea)$/i,t=/^a(?:rea)?$/i,u=/^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,v=f.support.getSetAttribute,w,x,y;f.fn.extend({attr:function(a,b){return f.access(this,f.attr,a,b,arguments.length>1)},removeAttr:function(a){return this.each(function(){f.removeAttr(this,a)})},prop:function(a,b){return f.access(this,f.prop,a,b,arguments.length>1)},removeProp:function(a){a=f.propFix[a]||a;return this.each(function(){try{this[a]=b,delete this[a]}catch(c){}})},addClass:function(a){var b,c,d,e,g,h,i;if(f.isFunction(a))return this.each(function(b){f(this).addClass(a.call(this,b,this.className))});if(a&&typeof a=="string"){b=a.split(p);for(c=0,d=this.length;c<d;c++){e=this[c];if(e.nodeType===1)if(!e.className&&b.length===1)e.className=a;else{g=" "+e.className+" ";for(h=0,i=b.length;h<i;h++)~g.indexOf(" "+b[h]+" ")||(g+=b[h]+" ");e.className=f.trim(g)}}}return this},removeClass:function(a){var c,d,e,g,h,i,j;if(f.isFunction(a))return this.each(function(b){f(this).removeClass(a.call(this,b,this.className))});if(a&&typeof a=="string"||a===b){c=(a||"").split(p);for(d=0,e=this.length;d<e;d++){g=this[d];if(g.nodeType===1&&g.className)if(a){h=(" "+g.className+" ").replace(o," ");for(i=0,j=c.length;i<j;i++)h=h.replace(" "+c[i]+" "," ");g.className=f.trim(h)}else g.className=""}}return this},toggleClass:function(a,b){var c=typeof a,d=typeof b=="boolean";if(f.isFunction(a))return this.each(function(c){f(this).toggleClass(a.call(this,c,this.className,b),b)});return this.each(function(){if(c==="string"){var e,g=0,h=f(this),i=b,j=a.split(p);while(e=j[g++])i=d?i:!h.hasClass(e),h[i?"addClass":"removeClass"](e)}else if(c==="undefined"||c==="boolean")this.className&&f._data(this,"__className__",this.className),this.className=this.className||a===!1?"":f._data(this,"__className__")||""})},hasClass:function(a){var b=" "+a+" ",c=0,d=this.length;for(;c<d;c++)if(this[c].nodeType===1&&(" "+this[c].className+" ").replace(o," ").indexOf(b)>-1)return!0;return!1},val:function(a){var c,d,e,g=this[0];{if(!!arguments.length){e=f.isFunction(a);return this.each(function(d){var g=f(this),h;if(this.nodeType===1){e?h=a.call(this,d,g.val()):h=a,h==null?h="":typeof h=="number"?h+="":f.isArray(h)&&(h=f.map(h,function(a){return a==null?"":a+""})),c=f.valHooks[this.type]||f.valHooks[this.nodeName.toLowerCase()];if(!c||!("set"in c)||c.set(this,h,"value")===b)this.value=h}})}if(g){c=f.valHooks[g.type]||f.valHooks[g.nodeName.toLowerCase()];if(c&&"get"in c&&(d=c.get(g,"value"))!==b)return d;d=g.value;return typeof d=="string"?d.replace(q,""):d==null?"":d}}}}),f.extend({valHooks:{option:{get:function(a){var b=a.attributes.value;return!b||b.specified?a.value:a.text}},select:{get:function(a){var b,c,d,e,g=a.selectedIndex,h=[],i=a.options,j=a.type==="select-one";if(g<0)return null;c=j?g:0,d=j?g+1:i.length;for(;c<d;c++){e=i[c];if(e.selected&&(f.support.optDisabled?!e.disabled:e.getAttribute("disabled")===null)&&(!e.parentNode.disabled||!f.nodeName(e.parentNode,"optgroup"))){b=f(e).val();if(j)return b;h.push(b)}}if(j&&!h.length&&i.length)return f(i[g]).val();return h},set:function(a,b){var c=f.makeArray(b);f(a).find("option").each(function(){this.selected=f.inArray(f(this).val(),c)>=0}),c.length||(a.selectedIndex=-1);return c}}},attrFn:{val:!0,css:!0,html:!0,text:!0,data:!0,width:!0,height:!0,offset:!0},attr:function(a,c,d,e){var g,h,i,j=a.nodeType;if(!!a&&j!==3&&j!==8&&j!==2){if(e&&c in f.attrFn)return f(a)[c](d);if(typeof a.getAttribute=="undefined")return f.prop(a,c,d);i=j!==1||!f.isXMLDoc(a),i&&(c=c.toLowerCase(),h=f.attrHooks[c]||(u.test(c)?x:w));if(d!==b){if(d===null){f.removeAttr(a,c);return}if(h&&"set"in h&&i&&(g=h.set(a,d,c))!==b)return g;a.setAttribute(c,""+d);return d}if(h&&"get"in h&&i&&(g=h.get(a,c))!==null)return g;g=a.getAttribute(c);return g===null?b:g}},removeAttr:function(a,b){var c,d,e,g,h,i=0;if(b&&a.nodeType===1){d=b.toLowerCase().split(p),g=d.length;for(;i<g;i++)e=d[i],e&&(c=f.propFix[e]||e,h=u.test(e),h||f.attr(a,e,""),a.removeAttribute(v?e:c),h&&c in a&&(a[c]=!1))}},attrHooks:{type:{set:function(a,b){if(r.test(a.nodeName)&&a.parentNode)f.error("type property can't be changed");else if(!f.support.radioValue&&b==="radio"&&f.nodeName(a,"input")){var c=a.value;a.setAttribute("type",b),c&&(a.value=c);return b}}},value:{get:function(a,b){if(w&&f.nodeName(a,"button"))return w.get(a,b);return b in a?a.value:null},set:function(a,b,c){if(w&&f.nodeName(a,"button"))return w.set(a,b,c);a.value=b}}},propFix:{tabindex:"tabIndex",readonly:"readOnly","for":"htmlFor","class":"className",maxlength:"maxLength",cellspacing:"cellSpacing",cellpadding:"cellPadding",rowspan:"rowSpan",colspan:"colSpan",usemap:"useMap",frameborder:"frameBorder",contenteditable:"contentEditable"},prop:function(a,c,d){var e,g,h,i=a.nodeType;if(!!a&&i!==3&&i!==8&&i!==2){h=i!==1||!f.isXMLDoc(a),h&&(c=f.propFix[c]||c,g=f.propHooks[c]);return d!==b?g&&"set"in g&&(e=g.set(a,d,c))!==b?e:a[c]=d:g&&"get"in g&&(e=g.get(a,c))!==null?e:a[c]}},propHooks:{tabIndex:{get:function(a){var c=a.getAttributeNode("tabindex");return c&&c.specified?parseInt(c.value,10):s.test(a.nodeName)||t.test(a.nodeName)&&a.href?0:b}}}}),f.attrHooks.tabindex=f.propHooks.tabIndex,x={get:function(a,c){var d,e=f.prop(a,c);return e===!0||typeof e!="boolean"&&(d=a.getAttributeNode(c))&&d.nodeValue!==!1?c.toLowerCase():b},set:function(a,b,c){var d;b===!1?f.removeAttr(a,c):(d=f.propFix[c]||c,d in a&&(a[d]=!0),a.setAttribute(c,c.toLowerCase()));return c}},v||(y={name:!0,id:!0,coords:!0},w=f.valHooks.button={get:function(a,c){var d;d=a.getAttributeNode(c);return d&&(y[c]?d.nodeValue!=="":d.specified)?d.nodeValue:b},set:function(a,b,d){var e=a.getAttributeNode(d);e||(e=c.createAttribute(d),a.setAttributeNode(e));return e.nodeValue=b+""}},f.attrHooks.tabindex.set=w.set,f.each(["width","height"],function(a,b){f.attrHooks[b]=f.extend(f.attrHooks[b],{set:function(a,c){if(c===""){a.setAttribute(b,"auto");return c}}})}),f.attrHooks.contenteditable={get:w.get,set:function(a,b,c){b===""&&(b="false"),w.set(a,b,c)}}),f.support.hrefNormalized||f.each(["href","src","width","height"],function(a,c){f.attrHooks[c]=f.extend(f.attrHooks[c],{get:function(a){var d=a.getAttribute(c,2);return d===null?b:d}})}),f.support.style||(f.attrHooks.style={get:function(a){return a.style.cssText.toLowerCase()||b},set:function(a,b){return a.style.cssText=""+b}}),f.support.optSelected||(f.propHooks.selected=f.extend(f.propHooks.selected,{get:function(a){var b=a.parentNode;b&&(b.selectedIndex,b.parentNode&&b.parentNode.selectedIndex);return null}})),f.support.enctype||(f.propFix.enctype="encoding"),f.support.checkOn||f.each(["radio","checkbox"],function(){f.valHooks[this]={get:function(a){return a.getAttribute("value")===null?"on":a.value}}}),f.each(["radio","checkbox"],function(){f.valHooks[this]=f.extend(f.valHooks[this],{set:function(a,b){if(f.isArray(b))return a.checked=f.inArray(f(a).val(),b)>=0}})});var z=/^(?:textarea|input|select)$/i,A=/^([^\.]*)?(?:\.(.+))?$/,B=/(?:^|\s)hover(\.\S+)?\b/,C=/^key/,D=/^(?:mouse|contextmenu)|click/,E=/^(?:focusinfocus|focusoutblur)$/,F=/^(\w*)(?:#([\w\-]+))?(?:\.([\w\-]+))?$/,G=function(
a){var b=F.exec(a);b&&(b[1]=(b[1]||"").toLowerCase(),b[3]=b[3]&&new RegExp("(?:^|\\s)"+b[3]+"(?:\\s|$)"));return b},H=function(a,b){var c=a.attributes||{};return(!b[1]||a.nodeName.toLowerCase()===b[1])&&(!b[2]||(c.id||{}).value===b[2])&&(!b[3]||b[3].test((c["class"]||{}).value))},I=function(a){return f.event.special.hover?a:a.replace(B,"mouseenter$1 mouseleave$1")};f.event={add:function(a,c,d,e,g){var h,i,j,k,l,m,n,o,p,q,r,s;if(!(a.nodeType===3||a.nodeType===8||!c||!d||!(h=f._data(a)))){d.handler&&(p=d,d=p.handler,g=p.selector),d.guid||(d.guid=f.guid++),j=h.events,j||(h.events=j={}),i=h.handle,i||(h.handle=i=function(a){return typeof f!="undefined"&&(!a||f.event.triggered!==a.type)?f.event.dispatch.apply(i.elem,arguments):b},i.elem=a),c=f.trim(I(c)).split(" ");for(k=0;k<c.length;k++){l=A.exec(c[k])||[],m=l[1],n=(l[2]||"").split(".").sort(),s=f.event.special[m]||{},m=(g?s.delegateType:s.bindType)||m,s=f.event.special[m]||{},o=f.extend({type:m,origType:l[1],data:e,handler:d,guid:d.guid,selector:g,quick:g&&G(g),namespace:n.join(".")},p),r=j[m];if(!r){r=j[m]=[],r.delegateCount=0;if(!s.setup||s.setup.call(a,e,n,i)===!1)a.addEventListener?a.addEventListener(m,i,!1):a.attachEvent&&a.attachEvent("on"+m,i)}s.add&&(s.add.call(a,o),o.handler.guid||(o.handler.guid=d.guid)),g?r.splice(r.delegateCount++,0,o):r.push(o),f.event.global[m]=!0}a=null}},global:{},remove:function(a,b,c,d,e){var g=f.hasData(a)&&f._data(a),h,i,j,k,l,m,n,o,p,q,r,s;if(!!g&&!!(o=g.events)){b=f.trim(I(b||"")).split(" ");for(h=0;h<b.length;h++){i=A.exec(b[h])||[],j=k=i[1],l=i[2];if(!j){for(j in o)f.event.remove(a,j+b[h],c,d,!0);continue}p=f.event.special[j]||{},j=(d?p.delegateType:p.bindType)||j,r=o[j]||[],m=r.length,l=l?new RegExp("(^|\\.)"+l.split(".").sort().join("\\.(?:.*\\.)?")+"(\\.|$)"):null;for(n=0;n<r.length;n++)s=r[n],(e||k===s.origType)&&(!c||c.guid===s.guid)&&(!l||l.test(s.namespace))&&(!d||d===s.selector||d==="**"&&s.selector)&&(r.splice(n--,1),s.selector&&r.delegateCount--,p.remove&&p.remove.call(a,s));r.length===0&&m!==r.length&&((!p.teardown||p.teardown.call(a,l)===!1)&&f.removeEvent(a,j,g.handle),delete o[j])}f.isEmptyObject(o)&&(q=g.handle,q&&(q.elem=null),f.removeData(a,["events","handle"],!0))}},customEvent:{getData:!0,setData:!0,changeData:!0},trigger:function(c,d,e,g){if(!e||e.nodeType!==3&&e.nodeType!==8){var h=c.type||c,i=[],j,k,l,m,n,o,p,q,r,s;if(E.test(h+f.event.triggered))return;h.indexOf("!")>=0&&(h=h.slice(0,-1),k=!0),h.indexOf(".")>=0&&(i=h.split("."),h=i.shift(),i.sort());if((!e||f.event.customEvent[h])&&!f.event.global[h])return;c=typeof c=="object"?c[f.expando]?c:new f.Event(h,c):new f.Event(h),c.type=h,c.isTrigger=!0,c.exclusive=k,c.namespace=i.join("."),c.namespace_re=c.namespace?new RegExp("(^|\\.)"+i.join("\\.(?:.*\\.)?")+"(\\.|$)"):null,o=h.indexOf(":")<0?"on"+h:"";if(!e){j=f.cache;for(l in j)j[l].events&&j[l].events[h]&&f.event.trigger(c,d,j[l].handle.elem,!0);return}c.result=b,c.target||(c.target=e),d=d!=null?f.makeArray(d):[],d.unshift(c),p=f.event.special[h]||{};if(p.trigger&&p.trigger.apply(e,d)===!1)return;r=[[e,p.bindType||h]];if(!g&&!p.noBubble&&!f.isWindow(e)){s=p.delegateType||h,m=E.test(s+h)?e:e.parentNode,n=null;for(;m;m=m.parentNode)r.push([m,s]),n=m;n&&n===e.ownerDocument&&r.push([n.defaultView||n.parentWindow||a,s])}for(l=0;l<r.length&&!c.isPropagationStopped();l++)m=r[l][0],c.type=r[l][1],q=(f._data(m,"events")||{})[c.type]&&f._data(m,"handle"),q&&q.apply(m,d),q=o&&m[o],q&&f.acceptData(m)&&q.apply(m,d)===!1&&c.preventDefault();c.type=h,!g&&!c.isDefaultPrevented()&&(!p._default||p._default.apply(e.ownerDocument,d)===!1)&&(h!=="click"||!f.nodeName(e,"a"))&&f.acceptData(e)&&o&&e[h]&&(h!=="focus"&&h!=="blur"||c.target.offsetWidth!==0)&&!f.isWindow(e)&&(n=e[o],n&&(e[o]=null),f.event.triggered=h,e[h](),f.event.triggered=b,n&&(e[o]=n));return c.result}},dispatch:function(c){c=f.event.fix(c||a.event);var d=(f._data(this,"events")||{})[c.type]||[],e=d.delegateCount,g=[].slice.call(arguments,0),h=!c.exclusive&&!c.namespace,i=f.event.special[c.type]||{},j=[],k,l,m,n,o,p,q,r,s,t,u;g[0]=c,c.delegateTarget=this;if(!i.preDispatch||i.preDispatch.call(this,c)!==!1){if(e&&(!c.button||c.type!=="click")){n=f(this),n.context=this.ownerDocument||this;for(m=c.target;m!=this;m=m.parentNode||this)if(m.disabled!==!0){p={},r=[],n[0]=m;for(k=0;k<e;k++)s=d[k],t=s.selector,p[t]===b&&(p[t]=s.quick?H(m,s.quick):n.is(t)),p[t]&&r.push(s);r.length&&j.push({elem:m,matches:r})}}d.length>e&&j.push({elem:this,matches:d.slice(e)});for(k=0;k<j.length&&!c.isPropagationStopped();k++){q=j[k],c.currentTarget=q.elem;for(l=0;l<q.matches.length&&!c.isImmediatePropagationStopped();l++){s=q.matches[l];if(h||!c.namespace&&!s.namespace||c.namespace_re&&c.namespace_re.test(s.namespace))c.data=s.data,c.handleObj=s,o=((f.event.special[s.origType]||{}).handle||s.handler).apply(q.elem,g),o!==b&&(c.result=o,o===!1&&(c.preventDefault(),c.stopPropagation()))}}i.postDispatch&&i.postDispatch.call(this,c);return c.result}},props:"attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(a,b){a.which==null&&(a.which=b.charCode!=null?b.charCode:b.keyCode);return a}},mouseHooks:{props:"button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(a,d){var e,f,g,h=d.button,i=d.fromElement;a.pageX==null&&d.clientX!=null&&(e=a.target.ownerDocument||c,f=e.documentElement,g=e.body,a.pageX=d.clientX+(f&&f.scrollLeft||g&&g.scrollLeft||0)-(f&&f.clientLeft||g&&g.clientLeft||0),a.pageY=d.clientY+(f&&f.scrollTop||g&&g.scrollTop||0)-(f&&f.clientTop||g&&g.clientTop||0)),!a.relatedTarget&&i&&(a.relatedTarget=i===a.target?d.toElement:i),!a.which&&h!==b&&(a.which=h&1?1:h&2?3:h&4?2:0);return a}},fix:function(a){if(a[f.expando])return a;var d,e,g=a,h=f.event.fixHooks[a.type]||{},i=h.props?this.props.concat(h.props):this.props;a=f.Event(g);for(d=i.length;d;)e=i[--d],a[e]=g[e];a.target||(a.target=g.srcElement||c),a.target.nodeType===3&&(a.target=a.target.parentNode),a.metaKey===b&&(a.metaKey=a.ctrlKey);return h.filter?h.filter(a,g):a},special:{ready:{setup:f.bindReady},load:{noBubble:!0},focus:{delegateType:"focusin"},blur:{delegateType:"focusout"},beforeunload:{setup:function(a,b,c){f.isWindow(this)&&(this.onbeforeunload=c)},teardown:function(a,b){this.onbeforeunload===b&&(this.onbeforeunload=null)}}},simulate:function(a,b,c,d){var e=f.extend(new f.Event,c,{type:a,isSimulated:!0,originalEvent:{}});d?f.event.trigger(e,null,b):f.event.dispatch.call(b,e),e.isDefaultPrevented()&&c.preventDefault()}},f.event.handle=f.event.dispatch,f.removeEvent=c.removeEventListener?function(a,b,c){a.removeEventListener&&a.removeEventListener(b,c,!1)}:function(a,b,c){a.detachEvent&&a.detachEvent("on"+b,c)},f.Event=function(a,b){if(!(this instanceof f.Event))return new f.Event(a,b);a&&a.type?(this.originalEvent=a,this.type=a.type,this.isDefaultPrevented=a.defaultPrevented||a.returnValue===!1||a.getPreventDefault&&a.getPreventDefault()?K:J):this.type=a,b&&f.extend(this,b),this.timeStamp=a&&a.timeStamp||f.now(),this[f.expando]=!0},f.Event.prototype={preventDefault:function(){this.isDefaultPrevented=K;var a=this.originalEvent;!a||(a.preventDefault?a.preventDefault():a.returnValue=!1)},stopPropagation:function(){this.isPropagationStopped=K;var a=this.originalEvent;!a||(a.stopPropagation&&a.stopPropagation(),a.cancelBubble=!0)},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=K,this.stopPropagation()},isDefaultPrevented:J,isPropagationStopped:J,isImmediatePropagationStopped:J},f.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(a,b){f.event.special[a]={delegateType:b,bindType:b,handle:function(a){var c=this,d=a.relatedTarget,e=a.handleObj,g=e.selector,h;if(!d||d!==c&&!f.contains(c,d))a.type=e.origType,h=e.handler.apply(this,arguments),a.type=b;return h}}}),f.support.submitBubbles||(f.event.special.submit={setup:function(){if(f.nodeName(this,"form"))return!1;f.event.add(this,"click._submit keypress._submit",function(a){var c=a.target,d=f.nodeName(c,"input")||f.nodeName(c,"button")?c.form:b;d&&!d._submit_attached&&(f.event.add(d,"submit._submit",function(a){a._submit_bubble=!0}),d._submit_attached=!0)})},postDispatch:function(a){a._submit_bubble&&(delete a._submit_bubble,this.parentNode&&!a.isTrigger&&f.event.simulate("submit",this.parentNode,a,!0))},teardown:function(){if(f.nodeName(this,"form"))return!1;f.event.remove(this,"._submit")}}),f.support.changeBubbles||(f.event.special.change={setup:function(){if(z.test(this.nodeName)){if(this.type==="checkbox"||this.type==="radio")f.event.add(this,"propertychange._change",function(a){a.originalEvent.propertyName==="checked"&&(this._just_changed=!0)}),f.event.add(this,"click._change",function(a){this._just_changed&&!a.isTrigger&&(this._just_changed=!1,f.event.simulate("change",this,a,!0))});return!1}f.event.add(this,"beforeactivate._change",function(a){var b=a.target;z.test(b.nodeName)&&!b._change_attached&&(f.event.add(b,"change._change",function(a){this.parentNode&&!a.isSimulated&&!a.isTrigger&&f.event.simulate("change",this.parentNode,a,!0)}),b._change_attached=!0)})},handle:function(a){var b=a.target;if(this!==b||a.isSimulated||a.isTrigger||b.type!=="radio"&&b.type!=="checkbox")return a.handleObj.handler.apply(this,arguments)},teardown:function(){f.event.remove(this,"._change");return z.test(this.nodeName)}}),f.support.focusinBubbles||f.each({focus:"focusin",blur:"focusout"},function(a,b){var d=0,e=function(a){f.event.simulate(b,a.target,f.event.fix(a),!0)};f.event.special[b]={setup:function(){d++===0&&c.addEventListener(a,e,!0)},teardown:function(){--d===0&&c.removeEventListener(a,e,!0)}}}),f.fn.extend({on:function(a,c,d,e,g){var h,i;if(typeof a=="object"){typeof c!="string"&&(d=d||c,c=b);for(i in a)this.on(i,c,d,a[i],g);return this}d==null&&e==null?(e=c,d=c=b):e==null&&(typeof c=="string"?(e=d,d=b):(e=d,d=c,c=b));if(e===!1)e=J;else if(!e)return this;g===1&&(h=e,e=function(a){f().off(a);return h.apply(this,arguments)},e.guid=h.guid||(h.guid=f.guid++));return this.each(function(){f.event.add(this,a,e,d,c)})},one:function(a,b,c,d){return this.on(a,b,c,d,1)},off:function(a,c,d){if(a&&a.preventDefault&&a.handleObj){var e=a.handleObj;f(a.delegateTarget).off(e.namespace?e.origType+"."+e.namespace:e.origType,e.selector,e.handler);return this}if(typeof a=="object"){for(var g in a)this.off(g,c,a[g]);return this}if(c===!1||typeof c=="function")d=c,c=b;d===!1&&(d=J);return this.each(function(){f.event.remove(this,a,d,c)})},bind:function(a,b,c){return this.on(a,null,b,c)},unbind:function(a,b){return this.off(a,null,b)},live:function(a,b,c){f(this.context).on(a,this.selector,b,c);return this},die:function(a,b){f(this.context).off(a,this.selector||"**",b);return this},delegate:function(a,b,c,d){return this.on(b,a,c,d)},undelegate:function(a,b,c){return arguments.length==1?this.off(a,"**"):this.off(b,a,c)},trigger:function(a,b){return this.each(function(){f.event.trigger(a,b,this)})},triggerHandler:function(a,b){if(this[0])return f.event.trigger(a,b,this[0],!0)},toggle:function(a){var b=arguments,c=a.guid||f.guid++,d=0,e=function(c){var e=(f._data(this,"lastToggle"+a.guid)||0)%d;f._data(this,"lastToggle"+a.guid,e+1),c.preventDefault();return b[e].apply(this,arguments)||!1};e.guid=c;while(d<b.length)b[d++].guid=c;return this.click(e)},hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)}}),f.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(a,b){f.fn[b]=function(a,c){c==null&&(c=a,a=null);return arguments.length>0?this.on(b,null,a,c):this.trigger(b)},f.attrFn&&(f.attrFn[b]=!0),C.test(b)&&(f.event.fixHooks[b]=f.event.keyHooks),D.test(b)&&(f.event.fixHooks[b]=f.event.mouseHooks)}),function(){function x(a,b,c,e,f,g){for(var h=0,i=e.length;h<i;h++){var j=e[h];if(j){var k=!1;j=j[a];while(j){if(j[d]===c){k=e[j.sizset];break}if(j.nodeType===1){g||(j[d]=c,j.sizset=h);if(typeof b!="string"){if(j===b){k=!0;break}}else if(m.filter(b,[j]).length>0){k=j;break}}j=j[a]}e[h]=k}}}function w(a,b,c,e,f,g){for(var h=0,i=e.length;h<i;h++){var j=e[h];if(j){var k=!1;j=j[a];while(j){if(j[d]===c){k=e[j.sizset];break}j.nodeType===1&&!g&&(j[d]=c,j.sizset=h);if(j.nodeName.toLowerCase()===b){k=j;break}j=j[a]}e[h]=k}}}var a=/((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,d="sizcache"+(Math.random()+"").replace(".",""),e=0,g=Object.prototype.toString,h=!1,i=!0,j=/\\/g,k=/\r\n/g,l=/\W/;[0,0].sort(function(){i=!1;return 0});var m=function(b,d,e,f){e=e||[],d=d||c;var h=d;if(d.nodeType!==1&&d.nodeType!==9)return[];if(!b||typeof b!="string")return e;var i,j,k,l,n,q,r,t,u=!0,v=m.isXML(d),w=[],x=b;do{a.exec(""),i=a.exec(x);if(i){x=i[3],w.push(i[1]);if(i[2]){l=i[3];break}}}while(i);if(w.length>1&&p.exec(b))if(w.length===2&&o.relative[w[0]])j=y(w[0]+w[1],d,f);else{j=o.relative[w[0]]?[d]:m(w.shift(),d);while(w.length)b=w.shift(),o.relative[b]&&(b+=w.shift()),j=y(b,j,f)}else{!f&&w.length>1&&d.nodeType===9&&!v&&o.match.ID.test(w[0])&&!o.match.ID.test(w[w.length-1])&&(n=m.find(w.shift(),d,v),d=n.expr?m.filter(n.expr,n.set)[0]:n.set[0]);if(d){n=f?{expr:w.pop(),set:s(f)}:m.find(w.pop(),w.length===1&&(w[0]==="~"||w[0]==="+")&&d.parentNode?d.parentNode:d,v),j=n.expr?m.filter(n.expr,n.set):n.set,w.length>0?k=s(j):u=!1;while(w.length)q=w.pop(),r=q,o.relative[q]?r=w.pop():q="",r==null&&(r=d),o.relative[q](k,r,v)}else k=w=[]}k||(k=j),k||m.error(q||b);if(g.call(k)==="[object Array]")if(!u)e.push.apply(e,k);else if(d&&d.nodeType===1)for(t=0;k[t]!=null;t++)k[t]&&(k[t]===!0||k[t].nodeType===1&&m.contains(d,k[t]))&&e.push(j[t]);else for(t=0;k[t]!=null;t++)k[t]&&k[t].nodeType===1&&e.push(j[t]);else s(k,e);l&&(m(l,h,e,f),m.uniqueSort(e));return e};m.uniqueSort=function(a){if(u){h=i,a.sort(u);if(h)for(var b=1;b<a.length;b++)a[b]===a[b-1]&&a.splice(b--,1)}return a},m.matches=function(a,b){return m(a,null,null,b)},m.matchesSelector=function(a,b){return m(b,null,null,[a]).length>0},m.find=function(a,b,c){var d,e,f,g,h,i;if(!a)return[];for(e=0,f=o.order.length;e<f;e++){h=o.order[e];if(g=o.leftMatch[h].exec(a)){i=g[1],g.splice(1,1);if(i.substr(i.length-1)!=="\\"){g[1]=(g[1]||"").replace(j,""),d=o.find[h](g,b,c);if(d!=null){a=a.replace(o.match[h],"");break}}}}d||(d=typeof b.getElementsByTagName!="undefined"?b.getElementsByTagName("*"):[]);return{set:d,expr:a}},m.filter=function(a,c,d,e){var f,g,h,i,j,k,l,n,p,q=a,r=[],s=c,t=c&&c[0]&&m.isXML(c[0]);while(a&&c.length){for(h in o.filter)if((f=o.leftMatch[h].exec(a))!=null&&f[2]){k=o.filter[h],l=f[1],g=!1,f.splice(1,1);if(l.substr(l.length-1)==="\\")continue;s===r&&(r=[]);if(o.preFilter[h]){f=o.preFilter[h](f,s,d,r,e,t);if(!f)g=i=!0;else if(f===!0)continue}if(f)for(n=0;(j=s[n])!=null;n++)j&&(i=k(j,f,n,s),p=e^i,d&&i!=null?p?g=!0:s[n]=!1:p&&(r.push(j),g=!0));if(i!==b){d||(s=r),a=a.replace(o.match[h],"");if(!g)return[];break}}if(a===q)if(g==null)m.error(a);else break;q=a}return s},m.error=function(a){throw new Error("Syntax error, unrecognized expression: "+a)};var n=m.getText=function(a){var b,c,d=a.nodeType,e="";if(d){if(d===1||d===9||d===11){if(typeof a.textContent=="string")return a.textContent;if(typeof a.innerText=="string")return a.innerText.replace(k,"");for(a=a.firstChild;a;a=a.nextSibling)e+=n(a)}else if(d===3||d===4)return a.nodeValue}else for(b=0;c=a[b];b++)c.nodeType!==8&&(e+=n(c));return e},o=m.selectors={order:["ID","NAME","TAG"],match:{ID:/#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,CLASS:/\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,NAME:/\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,ATTR:/\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(?:(['"])(.*?)\3|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/,TAG:/^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,CHILD:/:(only|nth|last|first)-child(?:\(\s*(even|odd|(?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,POS:/:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,PSEUDO:/:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/},leftMatch:{},attrMap:{"class":"className","for":"htmlFor"},attrHandle:{href:function(a){return a.getAttribute("href")},type:function(a){return a.getAttribute("type")}},relative:{"+":function(a,b){var c=typeof b=="string",d=c&&!l.test(b),e=c&&!d;d&&(b=b.toLowerCase());for(var f=0,g=a.length,h;f<g;f++)if(h=a[f]){while((h=h.previousSibling)&&h.nodeType!==1);a[f]=e||h&&h.nodeName.toLowerCase()===b?h||!1:h===b}e&&m.filter(b,a,!0)},">":function(a,b){var c,d=typeof b=="string",e=0,f=a.length;if(d&&!l.test(b)){b=b.toLowerCase();for(;e<f;e++){c=a[e];if(c){var g=c.parentNode;a[e]=g.nodeName.toLowerCase()===b?g:!1}}}else{for(;e<f;e++)c=a[e],c&&(a[e]=d?c.parentNode:c.parentNode===b);d&&m.filter(b,a,!0)}},"":function(a,b,c){var d,f=e++,g=x;typeof b=="string"&&!l.test(b)&&(b=b.toLowerCase(),d=b,g=w),g("parentNode",b,f,a,d,c)},"~":function(a,b,c){var d,f=e++,g=x;typeof b=="string"&&!l.test(b)&&(b=b.toLowerCase(),d=b,g=w),g("previousSibling",b,f,a,d,c)}},find:{ID:function(a,b,c){if(typeof b.getElementById!="undefined"&&!c){var d=b.getElementById(a[1]);return d&&d.parentNode?[d]:[]}},NAME:function(a,b){if(typeof b.getElementsByName!="undefined"){var c=[],d=b.getElementsByName(a[1]);for(var e=0,f=d.length;e<f;e++)d[e].getAttribute("name")===a[1]&&c.push(d[e]);return c.length===0?null:c}},TAG:function(a,b){if(typeof b.getElementsByTagName!="undefined")return b.getElementsByTagName(a[1])}},preFilter:{CLASS:function(a,b,c,d,e,f){a=" "+a[1].replace(j,"")+" ";if(f)return a;for(var g=0,h;(h=b[g])!=null;g++)h&&(e^(h.className&&(" "+h.className+" ").replace(/[\t\n\r]/g," ").indexOf(a)>=0)?c||d.push(h):c&&(b[g]=!1));return!1},ID:function(a){return a[1].replace(j,"")},TAG:function(a,b){return a[1].replace(j,"").toLowerCase()},CHILD:function(a){if(a[1]==="nth"){a[2]||m.error(a[0]),a[2]=a[2].replace(/^\+|\s*/g,"");var b=/(-?)(\d*)(?:n([+\-]?\d*))?/.exec(a[2]==="even"&&"2n"||a[2]==="odd"&&"2n+1"||!/\D/.test(a[2])&&"0n+"+a[2]||a[2]);a[2]=b[1]+(b[2]||1)-0,a[3]=b[3]-0}else a[2]&&m.error(a[0]);a[0]=e++;return a},ATTR:function(a,b,c,d,e,f){var g=a[1]=a[1].replace(j,"");!f&&o.attrMap[g]&&(a[1]=o.attrMap[g]),a[4]=(a[4]||a[5]||"").replace(j,""),a[2]==="~="&&(a[4]=" "+a[4]+" ");return a},PSEUDO:function(b,c,d,e,f){if(b[1]==="not")if((a.exec(b[3])||"").length>1||/^\w/.test(b[3]))b[3]=m(b[3],null,null,c);else{var g=m.filter(b[3],c,d,!0^f);d||e.push.apply(e,g);return!1}else if(o.match.POS.test(b[0])||o.match.CHILD.test(b[0]))return!0;return b},POS:function(a){a.unshift(!0);return a}},filters:{enabled:function(a){return a.disabled===!1&&a.type!=="hidden"},disabled:function(a){return a.disabled===!0},checked:function(a){return a.checked===!0},selected:function(a){a.parentNode&&a.parentNode.selectedIndex;return a.selected===!0},parent:function(a){return!!a.firstChild},empty:function(a){return!a.firstChild},has:function(a,b,c){return!!m(c[3],a).length},header:function(a){return/h\d/i.test(a.nodeName)},text:function(a){var b=a.getAttribute("type"),c=a.type;return a.nodeName.toLowerCase()==="input"&&"text"===c&&(b===c||b===null)},radio:function(a){return a.nodeName.toLowerCase()==="input"&&"radio"===a.type},checkbox:function(a){return a.nodeName.toLowerCase()==="input"&&"checkbox"===a.type},file:function(a){return a.nodeName.toLowerCase()==="input"&&"file"===a.type},password:function(a){return a.nodeName.toLowerCase()==="input"&&"password"===a.type},submit:function(a){var b=a.nodeName.toLowerCase();return(b==="input"||b==="button")&&"submit"===a.type},image:function(a){return a.nodeName.toLowerCase()==="input"&&"image"===a.type},reset:function(a){var b=a.nodeName.toLowerCase();return(b==="input"||b==="button")&&"reset"===a.type},button:function(a){var b=a.nodeName.toLowerCase();return b==="input"&&"button"===a.type||b==="button"},input:function(a){return/input|select|textarea|button/i.test(a.nodeName)},focus:function(a){return a===a.ownerDocument.activeElement}},setFilters:{first:function(a,b){return b===0},last:function(a,b,c,d){return b===d.length-1},even:function(a,b){return b%2===0},odd:function(a,b){return b%2===1},lt:function(a,b,c){return b<c[3]-0},gt:function(a,b,c){return b>c[3]-0},nth:function(a,b,c){return c[3]-0===b},eq:function(a,b,c){return c[3]-0===b}},filter:{PSEUDO:function(a,b,c,d){var e=b[1],f=o.filters[e];if(f)return f(a,c,b,d);if(e==="contains")return(a.textContent||a.innerText||n([a])||"").indexOf(b[3])>=0;if(e==="not"){var g=b[3];for(var h=0,i=g.length;h<i;h++)if(g[h]===a)return!1;return!0}m.error(e)},CHILD:function(a,b){var c,e,f,g,h,i,j,k=b[1],l=a;switch(k){case"only":case"first":while(l=l.previousSibling)if(l.nodeType===1)return!1;if(k==="first")return!0;l=a;case"last":while(l=l.nextSibling)if(l.nodeType===1)return!1;return!0;case"nth":c=b[2],e=b[3];if(c===1&&e===0)return!0;f=b[0],g=a.parentNode;if(g&&(g[d]!==f||!a.nodeIndex)){i=0;for(l=g.firstChild;l;l=l.nextSibling)l.nodeType===1&&(l.nodeIndex=++i);g[d]=f}j=a.nodeIndex-e;return c===0?j===0:j%c===0&&j/c>=0}},ID:function(a,b){return a.nodeType===1&&a.getAttribute("id")===b},TAG:function(a,b){return b==="*"&&a.nodeType===1||!!a.nodeName&&a.nodeName.toLowerCase()===b},CLASS:function(a,b){return(" "+(a.className||a.getAttribute("class"))+" ").indexOf(b)>-1},ATTR:function(a,b){var c=b[1],d=m.attr?m.attr(a,c):o.attrHandle[c]?o.attrHandle[c](a):a[c]!=null?a[c]:a.getAttribute(c),e=d+"",f=b[2],g=b[4];return d==null?f==="!=":!f&&m.attr?d!=null:f==="="?e===g:f==="*="?e.indexOf(g)>=0:f==="~="?(" "+e+" ").indexOf(g)>=0:g?f==="!="?e!==g:f==="^="?e.indexOf(g)===0:f==="$="?e.substr(e.length-g.length)===g:f==="|="?e===g||e.substr(0,g.length+1)===g+"-":!1:e&&d!==!1},POS:function(a,b,c,d){var e=b[2],f=o.setFilters[e];if(f)return f(a,c,b,d)}}},p=o.match.POS,q=function(a,b){return"\\"+(b-0+1)};for(var r in o.match)o.match[r]=new RegExp(o.match[r].source+/(?![^\[]*\])(?![^\(]*\))/.source),o.leftMatch[r]=new RegExp(/(^(?:.|\r|\n)*?)/.source+o.match[r].source.replace(/\\(\d+)/g,q));o.match.globalPOS=p;var s=function(a,b){a=Array.prototype.slice.call(a,0);if(b){b.push.apply(b,a);return b}return a};try{Array.prototype.slice.call(c.documentElement.childNodes,0)[0].nodeType}catch(t){s=function(a,b){var c=0,d=b||[];if(g.call(a)==="[object Array]")Array.prototype.push.apply(d,a);else if(typeof a.length=="number")for(var e=a.length;c<e;c++)d.push(a[c]);else for(;a[c];c++)d.push(a[c]);return d}}var u,v;c.documentElement.compareDocumentPosition?u=function(a,b){if(a===b){h=!0;return 0}if(!a.compareDocumentPosition||!b.compareDocumentPosition)return a.compareDocumentPosition?-1:1;return a.compareDocumentPosition(b)&4?-1:1}:(u=function(a,b){if(a===b){h=!0;return 0}if(a.sourceIndex&&b.sourceIndex)return a.sourceIndex-b.sourceIndex;var c,d,e=[],f=[],g=a.parentNode,i=b.parentNode,j=g;if(g===i)return v(a,b);if(!g)return-1;if(!i)return 1;while(j)e.unshift(j),j=j.parentNode;j=i;while(j)f.unshift(j),j=j.parentNode;c=e.length,d=f.length;for(var k=0;k<c&&k<d;k++)if(e[k]!==f[k])return v(e[k],f[k]);return k===c?v(a,f[k],-1):v(e[k],b,1)},v=function(a,b,c){if(a===b)return c;var d=a.nextSibling;while(d){if(d===b)return-1;d=d.nextSibling}return 1}),function(){var a=c.createElement("div"),d="script"+(new Date).getTime(),e=c.documentElement;a.innerHTML="<a name='"+d+"'/>",e.insertBefore(a,e.firstChild),c.getElementById(d)&&(o.find.ID=function(a,c,d){if(typeof c.getElementById!="undefined"&&!d){var e=c.getElementById(a[1]);return e?e.id===a[1]||typeof e.getAttributeNode!="undefined"&&e.getAttributeNode("id").nodeValue===a[1]?[e]:b:[]}},o.filter.ID=function(a,b){var c=typeof a.getAttributeNode!="undefined"&&a.getAttributeNode("id");return a.nodeType===1&&c&&c.nodeValue===b}),e.removeChild(a),e=a=null}(),function(){var a=c.createElement("div");a.appendChild(c.createComment("")),a.getElementsByTagName("*").length>0&&(o.find.TAG=function(a,b){var c=b.getElementsByTagName(a[1]);if(a[1]==="*"){var d=[];for(var e=0;c[e];e++)c[e].nodeType===1&&d.push(c[e]);c=d}return c}),a.innerHTML="<a href='#'></a>",a.firstChild&&typeof a.firstChild.getAttribute!="undefined"&&a.firstChild.getAttribute("href")!=="#"&&(o.attrHandle.href=function(a){return a.getAttribute("href",2)}),a=null}(),c.querySelectorAll&&function(){var a=m,b=c.createElement("div"),d="__sizzle__";b.innerHTML="<p class='TEST'></p>";if(!b.querySelectorAll||b.querySelectorAll(".TEST").length!==0){m=function(b,e,f,g){e=e||c;if(!g&&!m.isXML(e)){var h=/^(\w+$)|^\.([\w\-]+$)|^#([\w\-]+$)/.exec(b);if(h&&(e.nodeType===1||e.nodeType===9)){if(h[1])return s(e.getElementsByTagName(b),f);if(h[2]&&o.find.CLASS&&e.getElementsByClassName)return s(e.getElementsByClassName(h[2]),f)}if(e.nodeType===9){if(b==="body"&&e.body)return s([e.body],f);if(h&&h[3]){var i=e.getElementById(h[3]);if(!i||!i.parentNode)return s([],f);if(i.id===h[3])return s([i],f)}try{return s(e.querySelectorAll(b),f)}catch(j){}}else if(e.nodeType===1&&e.nodeName.toLowerCase()!=="object"){var k=e,l=e.getAttribute("id"),n=l||d,p=e.parentNode,q=/^\s*[+~]/.test(b);l?n=n.replace(/'/g,"\\$&"):e.setAttribute("id",n),q&&p&&(e=e.parentNode);try{if(!q||p)return s(e.querySelectorAll("[id='"+n+"'] "+b),f)}catch(r){}finally{l||k.removeAttribute("id")}}}return a(b,e,f,g)};for(var e in a)m[e]=a[e];b=null}}(),function(){var a=c.documentElement,b=a.matchesSelector||a.mozMatchesSelector||a.webkitMatchesSelector||a.msMatchesSelector;if(b){var d=!b.call(c.createElement("div"),"div"),e=!1;try{b.call(c.documentElement,"[test!='']:sizzle")}catch(f){e=!0}m.matchesSelector=function(a,c){c=c.replace(/\=\s*([^'"\]]*)\s*\]/g,"='$1']");if(!m.isXML(a))try{if(e||!o.match.PSEUDO.test(c)&&!/!=/.test(c)){var f=b.call(a,c);if(f||!d||a.document&&a.document.nodeType!==11)return f}}catch(g){}return m(c,null,null,[a]).length>0}}}(),function(){var a=c.createElement("div");a.innerHTML="<div class='test e'></div><div class='test'></div>";if(!!a.getElementsByClassName&&a.getElementsByClassName("e").length!==0){a.lastChild.className="e";if(a.getElementsByClassName("e").length===1)return;o.order.splice(1,0,"CLASS"),o.find.CLASS=function(a,b,c){if(typeof b.getElementsByClassName!="undefined"&&!c)return b.getElementsByClassName(a[1])},a=null}}(),c.documentElement.contains?m.contains=function(a,b){return a!==b&&(a.contains?a.contains(b):!0)}:c.documentElement.compareDocumentPosition?m.contains=function(a,b){return!!(a.compareDocumentPosition(b)&16)}:m.contains=function(){return!1},m.isXML=function(a){var b=(a?a.ownerDocument||a:0).documentElement;return b?b.nodeName!=="HTML":!1};var y=function(a,b,c){var d,e=[],f="",g=b.nodeType?[b]:b;while(d=o.match.PSEUDO.exec(a))f+=d[0],a=a.replace(o.match.PSEUDO,"");a=o.relative[a]?a+"*":a;for(var h=0,i=g.length;h<i;h++)m(a,g[h],e,c);return m.filter(f,e)};m.attr=f.attr,m.selectors.attrMap={},f.find=m,f.expr=m.selectors,f.expr[":"]=f.expr.filters,f.unique=m.uniqueSort,f.text=m.getText,f.isXMLDoc=m.isXML,f.contains=m.contains}();var L=/Until$/,M=/^(?:parents|prevUntil|prevAll)/,N=/,/,O=/^.[^:#\[\.,]*$/,P=Array.prototype.slice,Q=f.expr.match.globalPOS,R={children:!0,contents:!0,next:!0,prev:!0};f.fn.extend({find:function(a){var b=this,c,d;if(typeof a!="string")return f(a).filter(function(){for(c=0,d=b.length;c<d;c++)if(f.contains(b[c],this))return!0});var e=this.pushStack("","find",a),g,h,i;for(c=0,d=this.length;c<d;c++){g=e.length,f.find(a,this[c],e);if(c>0)for(h=g;h<e.length;h++)for(i=0;i<g;i++)if(e[i]===e[h]){e.splice(h--,1);break}}return e},has:function(a){var b=f(a);return this.filter(function(){for(var a=0,c=b.length;a<c;a++)if(f.contains(this,b[a]))return!0})},not:function(a){return this.pushStack(T(this,a,!1),"not",a)},filter:function(a){return this.pushStack(T(this,a,!0),"filter",a)},is:function(a){return!!a&&(typeof a=="string"?Q.test(a)?f(a,this.context).index(this[0])>=0:f.filter(a,this).length>0:this.filter(a).length>0)},closest:function(a,b){var c=[],d,e,g=this[0];if(f.isArray(a)){var h=1;while(g&&g.ownerDocument&&g!==b){for(d=0;d<a.length;d++)f(g).is(a[d])&&c.push({selector:a[d],elem:g,level:h});g=g.parentNode,h++}return c}var i=Q.test(a)||typeof a!="string"?f(a,b||this.context):0;for(d=0,e=this.length;d<e;d++){g=this[d];while(g){if(i?i.index(g)>-1:f.find.matchesSelector(g,a)){c.push(g);break}g=g.parentNode;if(!g||!g.ownerDocument||g===b||g.nodeType===11)break}}c=c.length>1?f.unique(c):c;return this.pushStack(c,"closest",a)},index:function(a){if(!a)return this[0]&&this[0].parentNode?this.prevAll().length:-1;if(typeof a=="string")return f.inArray(this[0],f(a));return f.inArray(a.jquery?a[0]:a,this)},add:function(a,b){var c=typeof a=="string"?f(a,b):f.makeArray(a&&a.nodeType?[a]:a),d=f.merge(this.get(),c);return this.pushStack(S(c[0])||S(d[0])?d:f.unique(d))},andSelf:function(){return this.add(this.prevObject)}}),f.each({parent:function(a){var b=a.parentNode;return b&&b.nodeType!==11?b:null},parents:function(a){return f.dir(a,"parentNode")},parentsUntil:function(a,b,c){return f.dir(a,"parentNode",c)},next:function(a){return f.nth(a,2,"nextSibling")},prev:function(a){return f.nth(a,2,"previousSibling")},nextAll:function(a){return f.dir(a,"nextSibling")},prevAll:function(a){return f.dir(a,"previousSibling")},nextUntil:function(a,b,c){return f.dir(a,"nextSibling",c)},prevUntil:function(a,b,c){return f.dir(a,"previousSibling",c)},siblings:function(a){return f.sibling((a.parentNode||{}).firstChild,a)},children:function(a){return f.sibling(a.firstChild)},contents:function(a){return f.nodeName(a,"iframe")?a.contentDocument||a.contentWindow.document:f.makeArray(a.childNodes)}},function(a,b){f.fn[a]=function(c,d){var e=f.map(this,b,c);L.test(a)||(d=c),d&&typeof d=="string"&&(e=f.filter(d,e)),e=this.length>1&&!R[a]?f.unique(e):e,(this.length>1||N.test(d))&&M.test(a)&&(e=e.reverse());return this.pushStack(e,a,P.call(arguments).join(","))}}),f.extend({filter:function(a,b,c){c&&(a=":not("+a+")");return b.length===1?f.find.matchesSelector(b[0],a)?[b[0]]:[]:f.find.matches(a,b)},dir:function(a,c,d){var e=[],g=a[c];while(g&&g.nodeType!==9&&(d===b||g.nodeType!==1||!f(g).is(d)))g.nodeType===1&&e.push(g),g=g[c];return e},nth:function(a,b,c,d){b=b||1;var e=0;for(;a;a=a[c])if(a.nodeType===1&&++e===b)break;return a},sibling:function(a,b){var c=[];for(;a;a=a.nextSibling)a.nodeType===1&&a!==b&&c.push(a);return c}});var V="abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",W=/ jQuery\d+="(?:\d+|null)"/g,X=/^\s+/,Y=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,Z=/<([\w:]+)/,$=/<tbody/i,_=/<|&#?\w+;/,ba=/<(?:script|style)/i,bb=/<(?:script|object|embed|option|style)/i,bc=new RegExp("<(?:"+V+")[\\s/>]","i"),bd=/checked\s*(?:[^=]|=\s*.checked.)/i,be=/\/(java|ecma)script/i,bf=/^\s*<!(?:\[CDATA\[|\-\-)/,bg={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],area:[1,"<map>","</map>"],_default:[0,"",""]},bh=U(c);bg.optgroup=bg.option,bg.tbody=bg.tfoot=bg.colgroup=bg.caption=bg.thead,bg.th=bg.td,f.support.htmlSerialize||(bg._default=[1,"div<div>","</div>"]),f.fn.extend({text:function(a){return f.access(this,function(a){return a===b?f.text(this):this.empty().append((this[0]&&this[0].ownerDocument||c).createTextNode(a))},null,a,arguments.length)},wrapAll:function(a){if(f.isFunction(a))return this.each(function(b){f(this).wrapAll(a.call(this,b))});if(this[0]){var b=f(a,this[0].ownerDocument).eq(0).clone(!0);this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){var a=this;while(a.firstChild&&a.firstChild.nodeType===1)a=a.firstChild;return a}).append(this)}return this},wrapInner:function(a){if(f.isFunction(a))return this.each(function(b){f(this).wrapInner(a.call(this,b))});return this.each(function(){var b=f(this),c=b.contents();c.length?c.wrapAll(a):b.append(a)})},wrap:function(a){var b=f.isFunction(a);return this.each(function(c){f(this).wrapAll(b?a.call(this,c):a)})},unwrap:function(){return this.parent().each(function(){f.nodeName(this,"body")||f(this).replaceWith(this.childNodes)}).end()},append:function(){return this.domManip(arguments,!0,function(a){this.nodeType===1&&this.appendChild(a)})},prepend:function(){return this.domManip(arguments,!0,function(a){this.nodeType===1&&this.insertBefore(a,this.firstChild)})},before:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this)});if(arguments.length){var a=f
.clean(arguments);a.push.apply(a,this.toArray());return this.pushStack(a,"before",arguments)}},after:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this.nextSibling)});if(arguments.length){var a=this.pushStack(this,"after",arguments);a.push.apply(a,f.clean(arguments));return a}},remove:function(a,b){for(var c=0,d;(d=this[c])!=null;c++)if(!a||f.filter(a,[d]).length)!b&&d.nodeType===1&&(f.cleanData(d.getElementsByTagName("*")),f.cleanData([d])),d.parentNode&&d.parentNode.removeChild(d);return this},empty:function(){for(var a=0,b;(b=this[a])!=null;a++){b.nodeType===1&&f.cleanData(b.getElementsByTagName("*"));while(b.firstChild)b.removeChild(b.firstChild)}return this},clone:function(a,b){a=a==null?!1:a,b=b==null?a:b;return this.map(function(){return f.clone(this,a,b)})},html:function(a){return f.access(this,function(a){var c=this[0]||{},d=0,e=this.length;if(a===b)return c.nodeType===1?c.innerHTML.replace(W,""):null;if(typeof a=="string"&&!ba.test(a)&&(f.support.leadingWhitespace||!X.test(a))&&!bg[(Z.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(Y,"<$1></$2>");try{for(;d<e;d++)c=this[d]||{},c.nodeType===1&&(f.cleanData(c.getElementsByTagName("*")),c.innerHTML=a);c=0}catch(g){}}c&&this.empty().append(a)},null,a,arguments.length)},replaceWith:function(a){if(this[0]&&this[0].parentNode){if(f.isFunction(a))return this.each(function(b){var c=f(this),d=c.html();c.replaceWith(a.call(this,b,d))});typeof a!="string"&&(a=f(a).detach());return this.each(function(){var b=this.nextSibling,c=this.parentNode;f(this).remove(),b?f(b).before(a):f(c).append(a)})}return this.length?this.pushStack(f(f.isFunction(a)?a():a),"replaceWith",a):this},detach:function(a){return this.remove(a,!0)},domManip:function(a,c,d){var e,g,h,i,j=a[0],k=[];if(!f.support.checkClone&&arguments.length===3&&typeof j=="string"&&bd.test(j))return this.each(function(){f(this).domManip(a,c,d,!0)});if(f.isFunction(j))return this.each(function(e){var g=f(this);a[0]=j.call(this,e,c?g.html():b),g.domManip(a,c,d)});if(this[0]){i=j&&j.parentNode,f.support.parentNode&&i&&i.nodeType===11&&i.childNodes.length===this.length?e={fragment:i}:e=f.buildFragment(a,this,k),h=e.fragment,h.childNodes.length===1?g=h=h.firstChild:g=h.firstChild;if(g){c=c&&f.nodeName(g,"tr");for(var l=0,m=this.length,n=m-1;l<m;l++)d.call(c?bi(this[l],g):this[l],e.cacheable||m>1&&l<n?f.clone(h,!0,!0):h)}k.length&&f.each(k,function(a,b){b.src?f.ajax({type:"GET",global:!1,url:b.src,async:!1,dataType:"script"}):f.globalEval((b.text||b.textContent||b.innerHTML||"").replace(bf,"/*$0*/")),b.parentNode&&b.parentNode.removeChild(b)})}return this}}),f.buildFragment=function(a,b,d){var e,g,h,i,j=a[0];b&&b[0]&&(i=b[0].ownerDocument||b[0]),i.createDocumentFragment||(i=c),a.length===1&&typeof j=="string"&&j.length<512&&i===c&&j.charAt(0)==="<"&&!bb.test(j)&&(f.support.checkClone||!bd.test(j))&&(f.support.html5Clone||!bc.test(j))&&(g=!0,h=f.fragments[j],h&&h!==1&&(e=h)),e||(e=i.createDocumentFragment(),f.clean(a,i,e,d)),g&&(f.fragments[j]=h?e:1);return{fragment:e,cacheable:g}},f.fragments={},f.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){f.fn[a]=function(c){var d=[],e=f(c),g=this.length===1&&this[0].parentNode;if(g&&g.nodeType===11&&g.childNodes.length===1&&e.length===1){e[b](this[0]);return this}for(var h=0,i=e.length;h<i;h++){var j=(h>0?this.clone(!0):this).get();f(e[h])[b](j),d=d.concat(j)}return this.pushStack(d,a,e.selector)}}),f.extend({clone:function(a,b,c){var d,e,g,h=f.support.html5Clone||f.isXMLDoc(a)||!bc.test("<"+a.nodeName+">")?a.cloneNode(!0):bo(a);if((!f.support.noCloneEvent||!f.support.noCloneChecked)&&(a.nodeType===1||a.nodeType===11)&&!f.isXMLDoc(a)){bk(a,h),d=bl(a),e=bl(h);for(g=0;d[g];++g)e[g]&&bk(d[g],e[g])}if(b){bj(a,h);if(c){d=bl(a),e=bl(h);for(g=0;d[g];++g)bj(d[g],e[g])}}d=e=null;return h},clean:function(a,b,d,e){var g,h,i,j=[];b=b||c,typeof b.createElement=="undefined"&&(b=b.ownerDocument||b[0]&&b[0].ownerDocument||c);for(var k=0,l;(l=a[k])!=null;k++){typeof l=="number"&&(l+="");if(!l)continue;if(typeof l=="string")if(!_.test(l))l=b.createTextNode(l);else{l=l.replace(Y,"<$1></$2>");var m=(Z.exec(l)||["",""])[1].toLowerCase(),n=bg[m]||bg._default,o=n[0],p=b.createElement("div"),q=bh.childNodes,r;b===c?bh.appendChild(p):U(b).appendChild(p),p.innerHTML=n[1]+l+n[2];while(o--)p=p.lastChild;if(!f.support.tbody){var s=$.test(l),t=m==="table"&&!s?p.firstChild&&p.firstChild.childNodes:n[1]==="<table>"&&!s?p.childNodes:[];for(i=t.length-1;i>=0;--i)f.nodeName(t[i],"tbody")&&!t[i].childNodes.length&&t[i].parentNode.removeChild(t[i])}!f.support.leadingWhitespace&&X.test(l)&&p.insertBefore(b.createTextNode(X.exec(l)[0]),p.firstChild),l=p.childNodes,p&&(p.parentNode.removeChild(p),q.length>0&&(r=q[q.length-1],r&&r.parentNode&&r.parentNode.removeChild(r)))}var u;if(!f.support.appendChecked)if(l[0]&&typeof (u=l.length)=="number")for(i=0;i<u;i++)bn(l[i]);else bn(l);l.nodeType?j.push(l):j=f.merge(j,l)}if(d){g=function(a){return!a.type||be.test(a.type)};for(k=0;j[k];k++){h=j[k];if(e&&f.nodeName(h,"script")&&(!h.type||be.test(h.type)))e.push(h.parentNode?h.parentNode.removeChild(h):h);else{if(h.nodeType===1){var v=f.grep(h.getElementsByTagName("script"),g);j.splice.apply(j,[k+1,0].concat(v))}d.appendChild(h)}}}return j},cleanData:function(a){var b,c,d=f.cache,e=f.event.special,g=f.support.deleteExpando;for(var h=0,i;(i=a[h])!=null;h++){if(i.nodeName&&f.noData[i.nodeName.toLowerCase()])continue;c=i[f.expando];if(c){b=d[c];if(b&&b.events){for(var j in b.events)e[j]?f.event.remove(i,j):f.removeEvent(i,j,b.handle);b.handle&&(b.handle.elem=null)}g?delete i[f.expando]:i.removeAttribute&&i.removeAttribute(f.expando),delete d[c]}}}});var bp=/alpha\([^)]*\)/i,bq=/opacity=([^)]*)/,br=/([A-Z]|^ms)/g,bs=/^[\-+]?(?:\d*\.)?\d+$/i,bt=/^-?(?:\d*\.)?\d+(?!px)[^\d\s]+$/i,bu=/^([\-+])=([\-+.\de]+)/,bv=/^margin/,bw={position:"absolute",visibility:"hidden",display:"block"},bx=["Top","Right","Bottom","Left"],by,bz,bA;f.fn.css=function(a,c){return f.access(this,function(a,c,d){return d!==b?f.style(a,c,d):f.css(a,c)},a,c,arguments.length>1)},f.extend({cssHooks:{opacity:{get:function(a,b){if(b){var c=by(a,"opacity");return c===""?"1":c}return a.style.opacity}}},cssNumber:{fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":f.support.cssFloat?"cssFloat":"styleFloat"},style:function(a,c,d,e){if(!!a&&a.nodeType!==3&&a.nodeType!==8&&!!a.style){var g,h,i=f.camelCase(c),j=a.style,k=f.cssHooks[i];c=f.cssProps[i]||i;if(d===b){if(k&&"get"in k&&(g=k.get(a,!1,e))!==b)return g;return j[c]}h=typeof d,h==="string"&&(g=bu.exec(d))&&(d=+(g[1]+1)*+g[2]+parseFloat(f.css(a,c)),h="number");if(d==null||h==="number"&&isNaN(d))return;h==="number"&&!f.cssNumber[i]&&(d+="px");if(!k||!("set"in k)||(d=k.set(a,d))!==b)try{j[c]=d}catch(l){}}},css:function(a,c,d){var e,g;c=f.camelCase(c),g=f.cssHooks[c],c=f.cssProps[c]||c,c==="cssFloat"&&(c="float");if(g&&"get"in g&&(e=g.get(a,!0,d))!==b)return e;if(by)return by(a,c)},swap:function(a,b,c){var d={},e,f;for(f in b)d[f]=a.style[f],a.style[f]=b[f];e=c.call(a);for(f in b)a.style[f]=d[f];return e}}),f.curCSS=f.css,c.defaultView&&c.defaultView.getComputedStyle&&(bz=function(a,b){var c,d,e,g,h=a.style;b=b.replace(br,"-$1").toLowerCase(),(d=a.ownerDocument.defaultView)&&(e=d.getComputedStyle(a,null))&&(c=e.getPropertyValue(b),c===""&&!f.contains(a.ownerDocument.documentElement,a)&&(c=f.style(a,b))),!f.support.pixelMargin&&e&&bv.test(b)&&bt.test(c)&&(g=h.width,h.width=c,c=e.width,h.width=g);return c}),c.documentElement.currentStyle&&(bA=function(a,b){var c,d,e,f=a.currentStyle&&a.currentStyle[b],g=a.style;f==null&&g&&(e=g[b])&&(f=e),bt.test(f)&&(c=g.left,d=a.runtimeStyle&&a.runtimeStyle.left,d&&(a.runtimeStyle.left=a.currentStyle.left),g.left=b==="fontSize"?"1em":f,f=g.pixelLeft+"px",g.left=c,d&&(a.runtimeStyle.left=d));return f===""?"auto":f}),by=bz||bA,f.each(["height","width"],function(a,b){f.cssHooks[b]={get:function(a,c,d){if(c)return a.offsetWidth!==0?bB(a,b,d):f.swap(a,bw,function(){return bB(a,b,d)})},set:function(a,b){return bs.test(b)?b+"px":b}}}),f.support.opacity||(f.cssHooks.opacity={get:function(a,b){return bq.test((b&&a.currentStyle?a.currentStyle.filter:a.style.filter)||"")?parseFloat(RegExp.$1)/100+"":b?"1":""},set:function(a,b){var c=a.style,d=a.currentStyle,e=f.isNumeric(b)?"alpha(opacity="+b*100+")":"",g=d&&d.filter||c.filter||"";c.zoom=1;if(b>=1&&f.trim(g.replace(bp,""))===""){c.removeAttribute("filter");if(d&&!d.filter)return}c.filter=bp.test(g)?g.replace(bp,e):g+" "+e}}),f(function(){f.support.reliableMarginRight||(f.cssHooks.marginRight={get:function(a,b){return f.swap(a,{display:"inline-block"},function(){return b?by(a,"margin-right"):a.style.marginRight})}})}),f.expr&&f.expr.filters&&(f.expr.filters.hidden=function(a){var b=a.offsetWidth,c=a.offsetHeight;return b===0&&c===0||!f.support.reliableHiddenOffsets&&(a.style&&a.style.display||f.css(a,"display"))==="none"},f.expr.filters.visible=function(a){return!f.expr.filters.hidden(a)}),f.each({margin:"",padding:"",border:"Width"},function(a,b){f.cssHooks[a+b]={expand:function(c){var d,e=typeof c=="string"?c.split(" "):[c],f={};for(d=0;d<4;d++)f[a+bx[d]+b]=e[d]||e[d-2]||e[0];return f}}});var bC=/%20/g,bD=/\[\]$/,bE=/\r?\n/g,bF=/#.*$/,bG=/^(.*?):[ \t]*([^\r\n]*)\r?$/mg,bH=/^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,bI=/^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,bJ=/^(?:GET|HEAD)$/,bK=/^\/\//,bL=/\?/,bM=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,bN=/^(?:select|textarea)/i,bO=/\s+/,bP=/([?&])_=[^&]*/,bQ=/^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/,bR=f.fn.load,bS={},bT={},bU,bV,bW=["*/"]+["*"];try{bU=e.href}catch(bX){bU=c.createElement("a"),bU.href="",bU=bU.href}bV=bQ.exec(bU.toLowerCase())||[],f.fn.extend({load:function(a,c,d){if(typeof a!="string"&&bR)return bR.apply(this,arguments);if(!this.length)return this;var e=a.indexOf(" ");if(e>=0){var g=a.slice(e,a.length);a=a.slice(0,e)}var h="GET";c&&(f.isFunction(c)?(d=c,c=b):typeof c=="object"&&(c=f.param(c,f.ajaxSettings.traditional),h="POST"));var i=this;f.ajax({url:a,type:h,dataType:"html",data:c,complete:function(a,b,c){c=a.responseText,a.isResolved()&&(a.done(function(a){c=a}),i.html(g?f("<div>").append(c.replace(bM,"")).find(g):c)),d&&i.each(d,[c,b,a])}});return this},serialize:function(){return f.param(this.serializeArray())},serializeArray:function(){return this.map(function(){return this.elements?f.makeArray(this.elements):this}).filter(function(){return this.name&&!this.disabled&&(this.checked||bN.test(this.nodeName)||bH.test(this.type))}).map(function(a,b){var c=f(this).val();return c==null?null:f.isArray(c)?f.map(c,function(a,c){return{name:b.name,value:a.replace(bE,"\r\n")}}):{name:b.name,value:c.replace(bE,"\r\n")}}).get()}}),f.each("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "),function(a,b){f.fn[b]=function(a){return this.on(b,a)}}),f.each(["get","post"],function(a,c){f[c]=function(a,d,e,g){f.isFunction(d)&&(g=g||e,e=d,d=b);return f.ajax({type:c,url:a,data:d,success:e,dataType:g})}}),f.extend({getScript:function(a,c){return f.get(a,b,c,"script")},getJSON:function(a,b,c){return f.get(a,b,c,"json")},ajaxSetup:function(a,b){b?b$(a,f.ajaxSettings):(b=a,a=f.ajaxSettings),b$(a,b);return a},ajaxSettings:{url:bU,isLocal:bI.test(bV[1]),global:!0,type:"GET",contentType:"application/x-www-form-urlencoded; charset=UTF-8",processData:!0,async:!0,accepts:{xml:"application/xml, text/xml",html:"text/html",text:"text/plain",json:"application/json, text/javascript","*":bW},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText"},converters:{"* text":a.String,"text html":!0,"text json":f.parseJSON,"text xml":f.parseXML},flatOptions:{context:!0,url:!0}},ajaxPrefilter:bY(bS),ajaxTransport:bY(bT),ajax:function(a,c){function w(a,c,l,m){if(s!==2){s=2,q&&clearTimeout(q),p=b,n=m||"",v.readyState=a>0?4:0;var o,r,u,w=c,x=l?ca(d,v,l):b,y,z;if(a>=200&&a<300||a===304){if(d.ifModified){if(y=v.getResponseHeader("Last-Modified"))f.lastModified[k]=y;if(z=v.getResponseHeader("Etag"))f.etag[k]=z}if(a===304)w="notmodified",o=!0;else try{r=cb(d,x),w="success",o=!0}catch(A){w="parsererror",u=A}}else{u=w;if(!w||a)w="error",a<0&&(a=0)}v.status=a,v.statusText=""+(c||w),o?h.resolveWith(e,[r,w,v]):h.rejectWith(e,[v,w,u]),v.statusCode(j),j=b,t&&g.trigger("ajax"+(o?"Success":"Error"),[v,d,o?r:u]),i.fireWith(e,[v,w]),t&&(g.trigger("ajaxComplete",[v,d]),--f.active||f.event.trigger("ajaxStop"))}}typeof a=="object"&&(c=a,a=b),c=c||{};var d=f.ajaxSetup({},c),e=d.context||d,g=e!==d&&(e.nodeType||e instanceof f)?f(e):f.event,h=f.Deferred(),i=f.Callbacks("once memory"),j=d.statusCode||{},k,l={},m={},n,o,p,q,r,s=0,t,u,v={readyState:0,setRequestHeader:function(a,b){if(!s){var c=a.toLowerCase();a=m[c]=m[c]||a,l[a]=b}return this},getAllResponseHeaders:function(){return s===2?n:null},getResponseHeader:function(a){var c;if(s===2){if(!o){o={};while(c=bG.exec(n))o[c[1].toLowerCase()]=c[2]}c=o[a.toLowerCase()]}return c===b?null:c},overrideMimeType:function(a){s||(d.mimeType=a);return this},abort:function(a){a=a||"abort",p&&p.abort(a),w(0,a);return this}};h.promise(v),v.success=v.done,v.error=v.fail,v.complete=i.add,v.statusCode=function(a){if(a){var b;if(s<2)for(b in a)j[b]=[j[b],a[b]];else b=a[v.status],v.then(b,b)}return this},d.url=((a||d.url)+"").replace(bF,"").replace(bK,bV[1]+"//"),d.dataTypes=f.trim(d.dataType||"*").toLowerCase().split(bO),d.crossDomain==null&&(r=bQ.exec(d.url.toLowerCase()),d.crossDomain=!(!r||r[1]==bV[1]&&r[2]==bV[2]&&(r[3]||(r[1]==="http:"?80:443))==(bV[3]||(bV[1]==="http:"?80:443)))),d.data&&d.processData&&typeof d.data!="string"&&(d.data=f.param(d.data,d.traditional)),bZ(bS,d,c,v);if(s===2)return!1;t=d.global,d.type=d.type.toUpperCase(),d.hasContent=!bJ.test(d.type),t&&f.active++===0&&f.event.trigger("ajaxStart");if(!d.hasContent){d.data&&(d.url+=(bL.test(d.url)?"&":"?")+d.data,delete d.data),k=d.url;if(d.cache===!1){var x=f.now(),y=d.url.replace(bP,"$1_="+x);d.url=y+(y===d.url?(bL.test(d.url)?"&":"?")+"_="+x:"")}}(d.data&&d.hasContent&&d.contentType!==!1||c.contentType)&&v.setRequestHeader("Content-Type",d.contentType),d.ifModified&&(k=k||d.url,f.lastModified[k]&&v.setRequestHeader("If-Modified-Since",f.lastModified[k]),f.etag[k]&&v.setRequestHeader("If-None-Match",f.etag[k])),v.setRequestHeader("Accept",d.dataTypes[0]&&d.accepts[d.dataTypes[0]]?d.accepts[d.dataTypes[0]]+(d.dataTypes[0]!=="*"?", "+bW+"; q=0.01":""):d.accepts["*"]);for(u in d.headers)v.setRequestHeader(u,d.headers[u]);if(d.beforeSend&&(d.beforeSend.call(e,v,d)===!1||s===2)){v.abort();return!1}for(u in{success:1,error:1,complete:1})v[u](d[u]);p=bZ(bT,d,c,v);if(!p)w(-1,"No Transport");else{v.readyState=1,t&&g.trigger("ajaxSend",[v,d]),d.async&&d.timeout>0&&(q=setTimeout(function(){v.abort("timeout")},d.timeout));try{s=1,p.send(l,w)}catch(z){if(s<2)w(-1,z);else throw z}}return v},param:function(a,c){var d=[],e=function(a,b){b=f.isFunction(b)?b():b,d[d.length]=encodeURIComponent(a)+"="+encodeURIComponent(b)};c===b&&(c=f.ajaxSettings.traditional);if(f.isArray(a)||a.jquery&&!f.isPlainObject(a))f.each(a,function(){e(this.name,this.value)});else for(var g in a)b_(g,a[g],c,e);return d.join("&").replace(bC,"+")}}),f.extend({active:0,lastModified:{},etag:{}});var cc=f.now(),cd=/(\=)\?(&|$)|\?\?/i;f.ajaxSetup({jsonp:"callback",jsonpCallback:function(){return f.expando+"_"+cc++}}),f.ajaxPrefilter("json jsonp",function(b,c,d){var e=typeof b.data=="string"&&/^application\/x\-www\-form\-urlencoded/.test(b.contentType);if(b.dataTypes[0]==="jsonp"||b.jsonp!==!1&&(cd.test(b.url)||e&&cd.test(b.data))){var g,h=b.jsonpCallback=f.isFunction(b.jsonpCallback)?b.jsonpCallback():b.jsonpCallback,i=a[h],j=b.url,k=b.data,l="$1"+h+"$2";b.jsonp!==!1&&(j=j.replace(cd,l),b.url===j&&(e&&(k=k.replace(cd,l)),b.data===k&&(j+=(/\?/.test(j)?"&":"?")+b.jsonp+"="+h))),b.url=j,b.data=k,a[h]=function(a){g=[a]},d.always(function(){a[h]=i,g&&f.isFunction(i)&&a[h](g[0])}),b.converters["script json"]=function(){g||f.error(h+" was not called");return g[0]},b.dataTypes[0]="json";return"script"}}),f.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/javascript|ecmascript/},converters:{"text script":function(a){f.globalEval(a);return a}}}),f.ajaxPrefilter("script",function(a){a.cache===b&&(a.cache=!1),a.crossDomain&&(a.type="GET",a.global=!1)}),f.ajaxTransport("script",function(a){if(a.crossDomain){var d,e=c.head||c.getElementsByTagName("head")[0]||c.documentElement;return{send:function(f,g){d=c.createElement("script"),d.async="async",a.scriptCharset&&(d.charset=a.scriptCharset),d.src=a.url,d.onload=d.onreadystatechange=function(a,c){if(c||!d.readyState||/loaded|complete/.test(d.readyState))d.onload=d.onreadystatechange=null,e&&d.parentNode&&e.removeChild(d),d=b,c||g(200,"success")},e.insertBefore(d,e.firstChild)},abort:function(){d&&d.onload(0,1)}}}});var ce=a.ActiveXObject?function(){for(var a in cg)cg[a](0,1)}:!1,cf=0,cg;f.ajaxSettings.xhr=a.ActiveXObject?function(){return!this.isLocal&&ch()||ci()}:ch,function(a){f.extend(f.support,{ajax:!!a,cors:!!a&&"withCredentials"in a})}(f.ajaxSettings.xhr()),f.support.ajax&&f.ajaxTransport(function(c){if(!c.crossDomain||f.support.cors){var d;return{send:function(e,g){var h=c.xhr(),i,j;c.username?h.open(c.type,c.url,c.async,c.username,c.password):h.open(c.type,c.url,c.async);if(c.xhrFields)for(j in c.xhrFields)h[j]=c.xhrFields[j];c.mimeType&&h.overrideMimeType&&h.overrideMimeType(c.mimeType),!c.crossDomain&&!e["X-Requested-With"]&&(e["X-Requested-With"]="XMLHttpRequest");try{for(j in e)h.setRequestHeader(j,e[j])}catch(k){}h.send(c.hasContent&&c.data||null),d=function(a,e){var j,k,l,m,n;try{if(d&&(e||h.readyState===4)){d=b,i&&(h.onreadystatechange=f.noop,ce&&delete cg[i]);if(e)h.readyState!==4&&h.abort();else{j=h.status,l=h.getAllResponseHeaders(),m={},n=h.responseXML,n&&n.documentElement&&(m.xml=n);try{m.text=h.responseText}catch(a){}try{k=h.statusText}catch(o){k=""}!j&&c.isLocal&&!c.crossDomain?j=m.text?200:404:j===1223&&(j=204)}}}catch(p){e||g(-1,p)}m&&g(j,k,m,l)},!c.async||h.readyState===4?d():(i=++cf,ce&&(cg||(cg={},f(a).unload(ce)),cg[i]=d),h.onreadystatechange=d)},abort:function(){d&&d(0,1)}}}});var cj={},ck,cl,cm=/^(?:toggle|show|hide)$/,cn=/^([+\-]=)?([\d+.\-]+)([a-z%]*)$/i,co,cp=[["height","marginTop","marginBottom","paddingTop","paddingBottom"],["width","marginLeft","marginRight","paddingLeft","paddingRight"],["opacity"]],cq;f.fn.extend({show:function(a,b,c){var d,e;if(a||a===0)return this.animate(ct("show",3),a,b,c);for(var g=0,h=this.length;g<h;g++)d=this[g],d.style&&(e=d.style.display,!f._data(d,"olddisplay")&&e==="none"&&(e=d.style.display=""),(e===""&&f.css(d,"display")==="none"||!f.contains(d.ownerDocument.documentElement,d))&&f._data(d,"olddisplay",cu(d.nodeName)));for(g=0;g<h;g++){d=this[g];if(d.style){e=d.style.display;if(e===""||e==="none")d.style.display=f._data(d,"olddisplay")||""}}return this},hide:function(a,b,c){if(a||a===0)return this.animate(ct("hide",3),a,b,c);var d,e,g=0,h=this.length;for(;g<h;g++)d=this[g],d.style&&(e=f.css(d,"display"),e!=="none"&&!f._data(d,"olddisplay")&&f._data(d,"olddisplay",e));for(g=0;g<h;g++)this[g].style&&(this[g].style.display="none");return this},_toggle:f.fn.toggle,toggle:function(a,b,c){var d=typeof a=="boolean";f.isFunction(a)&&f.isFunction(b)?this._toggle.apply(this,arguments):a==null||d?this.each(function(){var b=d?a:f(this).is(":hidden");f(this)[b?"show":"hide"]()}):this.animate(ct("toggle",3),a,b,c);return this},fadeTo:function(a,b,c,d){return this.filter(":hidden").css("opacity",0).show().end().animate({opacity:b},a,c,d)},animate:function(a,b,c,d){function g(){e.queue===!1&&f._mark(this);var b=f.extend({},e),c=this.nodeType===1,d=c&&f(this).is(":hidden"),g,h,i,j,k,l,m,n,o,p,q;b.animatedProperties={};for(i in a){g=f.camelCase(i),i!==g&&(a[g]=a[i],delete a[i]);if((k=f.cssHooks[g])&&"expand"in k){l=k.expand(a[g]),delete a[g];for(i in l)i in a||(a[i]=l[i])}}for(g in a){h=a[g],f.isArray(h)?(b.animatedProperties[g]=h[1],h=a[g]=h[0]):b.animatedProperties[g]=b.specialEasing&&b.specialEasing[g]||b.easing||"swing";if(h==="hide"&&d||h==="show"&&!d)return b.complete.call(this);c&&(g==="height"||g==="width")&&(b.overflow=[this.style.overflow,this.style.overflowX,this.style.overflowY],f.css(this,"display")==="inline"&&f.css(this,"float")==="none"&&(!f.support.inlineBlockNeedsLayout||cu(this.nodeName)==="inline"?this.style.display="inline-block":this.style.zoom=1))}b.overflow!=null&&(this.style.overflow="hidden");for(i in a)j=new f.fx(this,b,i),h=a[i],cm.test(h)?(q=f._data(this,"toggle"+i)||(h==="toggle"?d?"show":"hide":0),q?(f._data(this,"toggle"+i,q==="show"?"hide":"show"),j[q]()):j[h]()):(m=cn.exec(h),n=j.cur(),m?(o=parseFloat(m[2]),p=m[3]||(f.cssNumber[i]?"":"px"),p!=="px"&&(f.style(this,i,(o||1)+p),n=(o||1)/j.cur()*n,f.style(this,i,n+p)),m[1]&&(o=(m[1]==="-="?-1:1)*o+n),j.custom(n,o,p)):j.custom(n,h,""));return!0}var e=f.speed(b,c,d);if(f.isEmptyObject(a))return this.each(e.complete,[!1]);a=f.extend({},a);return e.queue===!1?this.each(g):this.queue(e.queue,g)},stop:function(a,c,d){typeof a!="string"&&(d=c,c=a,a=b),c&&a!==!1&&this.queue(a||"fx",[]);return this.each(function(){function h(a,b,c){var e=b[c];f.removeData(a,c,!0),e.stop(d)}var b,c=!1,e=f.timers,g=f._data(this);d||f._unmark(!0,this);if(a==null)for(b in g)g[b]&&g[b].stop&&b.indexOf(".run")===b.length-4&&h(this,g,b);else g[b=a+".run"]&&g[b].stop&&h(this,g,b);for(b=e.length;b--;)e[b].elem===this&&(a==null||e[b].queue===a)&&(d?e[b](!0):e[b].saveState(),c=!0,e.splice(b,1));(!d||!c)&&f.dequeue(this,a)})}}),f.each({slideDown:ct("show",1),slideUp:ct("hide",1),slideToggle:ct("toggle",1),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(a,b){f.fn[a]=function(a,c,d){return this.animate(b,a,c,d)}}),f.extend({speed:function(a,b,c){var d=a&&typeof a=="object"?f.extend({},a):{complete:c||!c&&b||f.isFunction(a)&&a,duration:a,easing:c&&b||b&&!f.isFunction(b)&&b};d.duration=f.fx.off?0:typeof d.duration=="number"?d.duration:d.duration in f.fx.speeds?f.fx.speeds[d.duration]:f.fx.speeds._default;if(d.queue==null||d.queue===!0)d.queue="fx";d.old=d.complete,d.complete=function(a){f.isFunction(d.old)&&d.old.call(this),d.queue?f.dequeue(this,d.queue):a!==!1&&f._unmark(this)};return d},easing:{linear:function(a){return a},swing:function(a){return-Math.cos(a*Math.PI)/2+.5}},timers:[],fx:function(a,b,c){this.options=b,this.elem=a,this.prop=c,b.orig=b.orig||{}}}),f.fx.prototype={update:function(){this.options.step&&this.options.step.call(this.elem,this.now,this),(f.fx.step[this.prop]||f.fx.step._default)(this)},cur:function(){if(this.elem[this.prop]!=null&&(!this.elem.style||this.elem.style[this.prop]==null))return this.elem[this.prop];var a,b=f.css(this.elem,this.prop);return isNaN(a=parseFloat(b))?!b||b==="auto"?0:b:a},custom:function(a,c,d){function h(a){return e.step(a)}var e=this,g=f.fx;this.startTime=cq||cr(),this.end=c,this.now=this.start=a,this.pos=this.state=0,this.unit=d||this.unit||(f.cssNumber[this.prop]?"":"px"),h.queue=this.options.queue,h.elem=this.elem,h.saveState=function(){f._data(e.elem,"fxshow"+e.prop)===b&&(e.options.hide?f._data(e.elem,"fxshow"+e.prop,e.start):e.options.show&&f._data(e.elem,"fxshow"+e.prop,e.end))},h()&&f.timers.push(h)&&!co&&(co=setInterval(g.tick,g.interval))},show:function(){var a=f._data(this.elem,"fxshow"+this.prop);this.options.orig[this.prop]=a||f.style(this.elem,this.prop),this.options.show=!0,a!==b?this.custom(this.cur(),a):this.custom(this.prop==="width"||this.prop==="height"?1:0,this.cur()),f(this.elem).show()},hide:function(){this.options.orig[this.prop]=f._data(this.elem,"fxshow"+this.prop)||f.style(this.elem,this.prop),this.options.hide=!0,this.custom(this.cur(),0)},step:function(a){var b,c,d,e=cq||cr(),g=!0,h=this.elem,i=this.options;if(a||e>=i.duration+this.startTime){this.now=this.end,this.pos=this.state=1,this.update(),i.animatedProperties[this.prop]=!0;for(b in i.animatedProperties)i.animatedProperties[b]!==!0&&(g=!1);if(g){i.overflow!=null&&!f.support.shrinkWrapBlocks&&f.each(["","X","Y"],function(a,b){h.style["overflow"+b]=i.overflow[a]}),i.hide&&f(h).hide();if(i.hide||i.show)for(b in i.animatedProperties)f.style(h,b,i.orig[b]),f.removeData(h,"fxshow"+b,!0),f.removeData(h,"toggle"+b,!0);d=i.complete,d&&(i.complete=!1,d.call(h))}return!1}i.duration==Infinity?this.now=e:(c=e-this.startTime,this.state=c/i.duration,this.pos=f.easing[i.animatedProperties[this.prop]](this.state,c,0,1,i.duration),this.now=this.start+(this.end-this.start)*this.pos),this.update();return!0}},f.extend(f.fx,{tick:function(){var a,b=f.timers,c=0;for(;c<b.length;c++)a=b[c],!a()&&b[c]===a&&b.splice(c--,1);b.length||f.fx.stop()},interval:13,stop:function(){clearInterval(co),co=null},speeds:{slow:600,fast:200,_default:400},step:{opacity:function(a){f.style(a.elem,"opacity",a.now)},_default:function(a){a.elem.style&&a.elem.style[a.prop]!=null?a.elem.style[a.prop]=a.now+a.unit:a.elem[a.prop]=a.now}}}),f.each(cp.concat.apply([],cp),function(a,b){b.indexOf("margin")&&(f.fx.step[b]=function(a){f.style(a.elem,b,Math.max(0,a.now)+a.unit)})}),f.expr&&f.expr.filters&&(f.expr.filters.animated=function(a){return f.grep(f.timers,function(b){return a===b.elem}).length});var cv,cw=/^t(?:able|d|h)$/i,cx=/^(?:body|html)$/i;"getBoundingClientRect"in c.documentElement?cv=function(a,b,c,d){try{d=a.getBoundingClientRect()}catch(e){}if(!d||!f.contains(c,a))return d?{top:d.top,left:d.left}:{top:0,left:0};var g=b.body,h=cy(b),i=c.clientTop||g.clientTop||0,j=c.clientLeft||g.clientLeft||0,k=h.pageYOffset||f.support.boxModel&&c.scrollTop||g.scrollTop,l=h.pageXOffset||f.support.boxModel&&c.scrollLeft||g.scrollLeft,m=d.top+k-i,n=d.left+l-j;return{top:m,left:n}}:cv=function(a,b,c){var d,e=a.offsetParent,g=a,h=b.body,i=b.defaultView,j=i?i.getComputedStyle(a,null):a.currentStyle,k=a.offsetTop,l=a.offsetLeft;while((a=a.parentNode)&&a!==h&&a!==c){if(f.support.fixedPosition&&j.position==="fixed")break;d=i?i.getComputedStyle(a,null):a.currentStyle,k-=a.scrollTop,l-=a.scrollLeft,a===e&&(k+=a.offsetTop,l+=a.offsetLeft,f.support.doesNotAddBorder&&(!f.support.doesAddBorderForTableAndCells||!cw.test(a.nodeName))&&(k+=parseFloat(d.borderTopWidth)||0,l+=parseFloat(d.borderLeftWidth)||0),g=e,e=a.offsetParent),f.support.subtractsBorderForOverflowNotVisible&&d.overflow!=="visible"&&(k+=parseFloat(d.borderTopWidth)||0,l+=parseFloat(d.borderLeftWidth)||0),j=d}if(j.position==="relative"||j.position==="static")k+=h.offsetTop,l+=h.offsetLeft;f.support.fixedPosition&&j.position==="fixed"&&(k+=Math.max(c.scrollTop,h.scrollTop),l+=Math.max(c.scrollLeft,h.scrollLeft));return{top:k,left:l}},f.fn.offset=function(a){if(arguments.length)return a===b?this:this.each(function(b){f.offset.setOffset(this,a,b)});var c=this[0],d=c&&c.ownerDocument;if(!d)return null;if(c===d.body)return f.offset.bodyOffset(c);return cv(c,d,d.documentElement)},f.offset={bodyOffset:function(a){var b=a.offsetTop,c=a.offsetLeft;f.support.doesNotIncludeMarginInBodyOffset&&(b+=parseFloat(f.css(a,"marginTop"))||0,c+=parseFloat(f.css(a,"marginLeft"))||0);return{top:b,left:c}},setOffset:function(a,b,c){var d=f.css(a,"position");d==="static"&&(a.style.position="relative");var e=f(a),g=e.offset(),h=f.css(a,"top"),i=f.css(a,"left"),j=(d==="absolute"||d==="fixed")&&f.inArray("auto",[h,i])>-1,k={},l={},m,n;j?(l=e.position(),m=l.top,n=l.left):(m=parseFloat(h)||0,n=parseFloat(i)||0),f.isFunction(b)&&(b=b.call(a,c,g)),b.top!=null&&(k.top=b.top-g.top+m),b.left!=null&&(k.left=b.left-g.left+n),"using"in b?b.using.call(a,k):e.css(k)}},f.fn.extend({position:function(){if(!this[0])return null;var a=this[0],b=this.offsetParent(),c=this.offset(),d=cx.test(b[0].nodeName)?{top:0,left:0}:b.offset();c.top-=parseFloat(f.css(a,"marginTop"))||0,c.left-=parseFloat(f.css(a,"marginLeft"))||0,d.top+=parseFloat(f.css(b[0],"borderTopWidth"))||0,d.left+=parseFloat(f.css(b[0],"borderLeftWidth"))||0;return{top:c.top-d.top,left:c.left-d.left}},offsetParent:function(){return this.map(function(){var a=this.offsetParent||c.body;while(a&&!cx.test(a.nodeName)&&f.css(a,"position")==="static")a=a.offsetParent;return a})}}),f.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(a,c){var d=/Y/.test(c);f.fn[a]=function(e){return f.access(this,function(a,e,g){var h=cy(a);if(g===b)return h?c in h?h[c]:f.support.boxModel&&h.document.documentElement[e]||h.document.body[e]:a[e];h?h.scrollTo(d?f(h).scrollLeft():g,d?g:f(h).scrollTop()):a[e]=g},a,e,arguments.length,null)}}),f.each({Height:"height",Width:"width"},function(a,c){var d="client"+a,e="scroll"+a,g="offset"+a;f.fn["inner"+a]=function(){var a=this[0];return a?a.style?parseFloat(f.css(a,c,"padding")):this[c]():null},f.fn["outer"+a]=function(a){var b=this[0];return b?b.style?parseFloat(f.css(b,c,a?"margin":"border")):this[c]():null},f.fn[c]=function(a){return f.access(this,function(a,c,h){var i,j,k,l;if(f.isWindow(a)){i=a.document,j=i.documentElement[d];return f.support.boxModel&&j||i.body&&i.body[d]||j}if(a.nodeType===9){i=a.documentElement;if(i[d]>=i[e])return i[d];return Math.max(a.body[e],i[e],a.body[g],i[g])}if(h===b){k=f.css(a,c),l=parseFloat(k);return f.isNumeric(l)?l:k}f(a).css(c,h)},c,a,arguments.length,null)}}),a.jQuery=a.$=f,typeof define=="function"&&define.amd&&define.amd.jQuery&&define("jquery",[],function(){return f})})(window);DZ.navigation = {
	first_page: null,

	goTo: function(deezer_page) {

		if (typeof deezer_page == 'undefined') {
			return false;
		}
		if (deezer_page.substr(0,22) != 'http://www.deezer.com/' && deezer_page != 'http://www.deezer.com') {
			return false;
		}
		//console.log("GO TO ", deezer_page.substr(22), deezer_page);return false;

		DZ.communication.callDeezerMethod('DZ.deezer.loadbox', deezer_page.substr(21));
	},

	setPage: function(page) {
		/*DZ.communication.send("frames.dzplayer","DZ.deezer.setPage", {location : document.location, url : page}, 'deezer');
		return;
		var newHash = '|dzhash=' + page + '=dzhash|';
		var hash = document.location.hash;
		if (hash == '') {
			hash = '#';
		}
		var patt = /\|dzhash=(.*)=dzhash\|/;
		var results = patt.exec(hash);
		if (results != null && results.length > 1) {
			if (results[1] == newHash) {
				return false;
			}
			document.location.hash = hash.replace(results[1], newHash);
		} else {
			document.location.hash = hash + newHash;
		}
		*/
		DZ.communication.send('frames.dzplayer','DZ.deezer.setPage', {location: document.location, url: page}, 'deezer');
	},
	onPageChanged: function(callback) {
		if (typeof callback != 'function') {
			return false;
		}
		if (DZ.navigation.first_page !== null) {
			callback(DZ.navigation.first_page);
			DZ.navigation.first_page = null;
		}
		DZ.Event.subscribe(DZ.Event.navigation.PAGE_CHANGED, callback);
	},

	//CALLED BY DEEZER
	pageChanged: function(args) {
		try {
			if (typeof args == 'string') {
				try {
					args = eval('(' + args + ')');
				} catch (e) {
					return false;
				}
			}

			var event = args.evt;
			var value = typeof args.val == 'undefined' ? null : args.val;

			DZ.Event.triggerEvent({evt: DZ.Event.navigation[event], args: value});

		} catch (e) {
			DZ.catchException(e);
		}
	}
};DZ.mobile = {
	override: function(platform) {

		if (typeof platform == 'undefined' || (platform != 'ios' && platform != 'android')) {
			platform = 'android';
		}

		DZ.communication.send = (platform == 'android' ? function(framePath, method, args, domain) {

			try {
				domain = domain || 'app';
				var message = {
					method: method, args: args
				};
				DZ.mobile.android.callDeezer(message);
			} catch (e) {
				DZ.catchException(e);
			}

		} : function(framePath, method, args, domain) {

			try {
				domain = domain || 'app';
				var message = {
					method: method, args: args
				};
				DZ.mobile.ios.callDeezer(message);
			} catch (e) {
				DZ.catchException(e);
			}

		});

		if (platform == 'ios') {
			window.Deezer = DZ.mobile.ios.Deezer_object;
		}

		DZ.login_mobile = true;

		// end OVERRIDE
	},

	ios: {

		// CALLABLE BY APPLICATION :
		trigger: function(json) {
			var evt = json.evt;
			var value = json.val;

			if (evt == 'onLoad') {
				return DZ.mobile.ios.triggers.onLoad(value);
			}

			evt = evt.split('.');
			if (evt.length < 2) {
				return false;
			}

			var object = evt[0];
			evt = evt[1];

			if (typeof DZ.mobile.ios.triggers[object] == 'undefined') {
				return false;
			}
			DZ.mobile.ios.triggers[object].receiveEvent(evt, value);
			return true;
		},

		triggers: {
			onLoad: function(settings) {

				var gettext = settings.gettext;

				for (var key in gettext) {
					if (gettext[key] == key) {
						gettext[key] = '';
					}
				}

				settings.framework = {
					text: {
						add: gettext['action.addtofavorites'],
						remove: gettext['action.delete'],
						add_playlist: gettext['action.addtoplaylist'],
						buy: gettext['action.buytrack'],
						share: gettext['action.share'],
						follow: gettext['action.follow'],
						unfollow: gettext['action.unfollow'],
						download: gettext['action.download']
					}
				};

				DZ.onDeezerLoaded(settings);
				return true;

			},

			ui: {
				receiveEvent: function(evt, val) {

					if (evt == 'APPREQUEST_CLOSED') {
						DZ.Event.triggerEvent({
							evt: DZ.Event.ui.APPREQUEST_CLOSED + '_' + val.idrequest,
							args: {status: val.status}
						});
						return true;
					}

					return false;
				}
			},

			player: {
				receiveEvent: function(evt, val) {
					// CURRENT_TRACK | MUTE_CHANGED | REPEAT_CHANGED | SHUFFLE_CHANGED

					DZ.player.receiveEvent({
						evt: evt,
						val: val
					});
				}
			},

			framework: {
				receiveEvent: function(evt, val) {
					if (evt == 'ON_FAVORITE') {
						DZ.framework.onFavorite({
							type: val.type,
							id: val.id,
							value: val.state
						});

						return true;
					}

					if (evt == 'CB_ASK_FAVORITE') {
						DZ.framework.callbackQueue(val);
						return true;
					}
					return false;
				}
			}
		},

		gettext_keys: {
			'action.addtofavorites': true,
			'action.delete': true,
			'action.addtoplaylist': true,
			'action.buytrack': true,
			'action.share': true,
			'action.follow': true,
			'action.unfollow': true,
			'action.download': true,
			test: true
		},

		Deezer_object: {

			callMethod: function(name, args) {
				if (typeof args != 'string') {
					args = JSON.stringify(args);
				}

				Deezer.iframeRequest(name, args);
				return true;
			},

			iframeRequest: function(method, args) {

				// We must check that the app_version > 6.11.1 because of iOS limitation about ||
				var platform = DZ.util.getPlatform();
				var app_version = platform.app_version;

				var url = 'deezer://' + method;

				if (DZ.util.versionCompare(app_version, '6.11.1') >= 0) {
					url += '?' + args;
				} else {
					url += '||' + args;
				}

				var iframe = document.createElement('IFRAME');
				iframe.setAttribute('src', url);
				document.documentElement.appendChild(iframe);
				iframe.parentNode.removeChild(iframe);
				iframe = null;
				return true;
			},

			playerControl: function(method, args) {
				return Deezer.callMethod('playerControl.' + method, args);
			},

			log: function() {
				var log = [];
				for (var i = 0; i < arguments.length; i++) {
					var arg = typeof arguments[i] == 'string' ? arguments[i] : JSON.stringify(arguments[i]);
					log.push(arg);
				}
				Deezer.callMethod('log', log.join(' , '));
			},

			appRequest: function(args) {
				Deezer.callMethod('appRequest', args);
			}

		},

		callDeezer: function(json) {
			try {

				var args;

				if (json.method == 'DZ.inapploaded') {
					Deezer.callMethod('webviewLoaded', {
						gettext: DZ.mobile.ios.gettext_keys
					});
					return true;
				}

				var method;
				if (json.method.substr(0, 20) == 'DZ.player_controler.') {
					method = json.method.substr(20);
					args = JSON.stringify(json.args);

					Deezer.log('Method appelé ' + method);
					Deezer.log('Method arguments ' + args);
					Deezer.playerControl(method, args);
				}

				if (json.method.substr(0, 10) == 'DZ.deezer.') {
					// var authorizedMethod = {'addToPlaylist' : true};
					method = json.method.substr(10);

					if (typeof DZ.mobile.ios.wrapCall[method] != 'undefined') {
						return DZ.mobile.ios.wrapCall[method](json.args);
					}

					if (typeof Deezer[method] != 'undefined') {
						args = JSON.stringify(json.args);
						return Deezer[method](args);
					}

					Deezer.callMethod('deezer.' + method, json.args);

					return false;
				}
			} catch (e) {
				DZ.catchException(e);
			}
		},

		/* WRAPPER */
		wrapCall: {
			loadbox: function(uri) {
				document.location.href = 'deezer://' + uri;
				return true;
			}
		}
	},

	android: {

		// CALLABLE BY APPLICATION :
		trigger: function(json) {
			var evt = json.evt;
			var value = json.val;

			if (evt == 'onLoad') {
				return DZ.mobile.android.triggers.onLoad(value);
			}

			evt = evt.split('.');
			if (evt.length < 2) {
				return false;
			}

			var object = evt[0];
			evt = evt[1];

			if (typeof DZ.mobile.android.triggers[object] == 'undefined') {
				return false;
			}
			DZ.mobile.android.triggers[object].receiveEvent(evt, value);
			return true;
		},

		triggers: {
			onLoad: function(settings) {

				var gettext = settings.gettext;

				for (var key in gettext) {
					if (gettext[key] == '-') {
						gettext[key] = '';
					}
				}

				settings.framework = {
					text: {
						add: gettext['action.addtofavorites'],
						remove: gettext['action.delete'],
						add_playlist: gettext['action.addtoplaylist'],
						buy: gettext['action.buytrack'],
						share: gettext['action.share'],
						follow: gettext['action.follow'],
						unfollow: gettext['action.unfollow'],
						download: gettext['action.download']
					}
				};

				DZ.onDeezerLoaded(settings);
				return true;
			},

			player: {
				receiveEvent: function(evt, val) {
					// CURRENT_TRACK | MUTE_CHANGED | REPEAT_CHANGED | SHUFFLE_CHANGED
					DZ.player.receiveEvent({
						evt: evt,
						val: val
					});
				}
			},

			ui: {
				receiveEvent: function(evt, val) {
					DZ.Event.triggerEvent({
						evt: DZ.Event.ui.APPREQUEST_CLOSED + '_' + val.idrequest,
						args: {status: val.status}
					});
				}
			},

			framework: {
				receiveEvent: function(evt, val) {
					if (evt == 'ON_FAVORITE') {
						DZ.framework.onFavorite({
							type: val.type,
							id: val.id,
							value: val.state
						});

						return true;
					}

					if (evt == 'CB_ASK_FAVORITE') {
						DZ.framework.callbackQueue(val);
						return true;
					}
					return false;
				}
			}
		},

		gettext_keys: {
			'action.addtofavorites': true,
			'action.delete': true,
			'action.addtoplaylist': true,
			'action.buytrack': true,
			'action.share': true,
			'action.follow': true,
			'action.unfollow': true,
			'action.download': true,
			test: true
		},

		callDeezer: function(json) {
			try {

				var args;

				if (json.method == 'DZ.inapploaded') {

					Deezer.webviewLoaded(JSON.stringify({
						gettext: DZ.mobile.android.gettext_keys
					}));

					return true;
				}

				var method;
				if (json.method.substr(0, 20) == 'DZ.player_controler.') {
					method = json.method.substr(20);
					args = JSON.stringify(json.args);

					Deezer.log('Method appelé ' + method);
					Deezer.log('Method arguments ' + args);
					Deezer.playerControl(method, args);
				}

				if (json.method.substr(0, 10) == 'DZ.deezer.') {
					// var authorizedMethod = {'addToPlaylist' : true};
					method = json.method.substr(10);

					if (method.substr(0, 3) == 'ui.') {
						method = method.substr(3);
					}

					if (typeof DZ.mobile.android.wrapCall[method] != 'undefined') {
						return DZ.mobile.android.wrapCall[method](json.args);
					}

					if (typeof Deezer[method] != 'undefined') {
						args = JSON.stringify(json.args);
						return Deezer[method](args);
					}

					console.log(json.method, 'not authorized');
					return false;
				}
			} catch (e) {
				DZ.catchException(e);
			}
		},

		/* WRAPPER */
		wrapCall: {
			loadbox: function(uri) {
				// document.location.href = 'deezer://www.deezer.com/' + uri;
				if (uri == '') {
					uri = 'home';
				}
				var url = 'deezer://www.deezer.com/' + uri;
				DZ.mobile.android.callDeezer({
					method: 'DZ.deezer.externalLink',
					args: {url: url}
				});
				return true;
			},

			setPage: function(page) {
				window.location = '#DZ|' + page.url;
			},

			askFavorites: function(send_queue) {
				Deezer.askFavorites(JSON.stringify(send_queue));
				return true;
			}
		}
	}

};
DZ.ui = {

	register: function(options) {
		var register_options = {};
		if (typeof options != 'undefined' && typeof options.redirect_uri == 'string') {
			register_options.redirect_uri = options.redirect_uri;
		}
		DZ.communication.callDeezerMethod('DZ.deezer.ui.register', register_options);
	},

	appRequest: function(options) {
		try {
			var apprequest_options = {
				message: null,
				to: null
			};

			if (typeof options == 'undefined' || typeof options.to != 'string') {
				throw 'You have to specify at least one user_id in options.to !';
			}

			if (typeof options.message != 'undefined' && typeof options.message != 'string') {
				throw 'The message has to be a string !';
			} else if (typeof options.message != 'undefined') {
				apprequest_options.message = options.message;
			}

			var user_id = parseInt(options.to, 10) + '';
			if (user_id != options.to) {
				throw 'The parameter \'to\' has to be an int';
			}
			/*
			var user_ids = options.to.split(',');

			var user_ids_request = [];

			for (var i = 0; i < user_ids.length; i++) {
				var user_id = DZ.util.trim(user_ids[i]);
				var int_user_id = parseInt(user_id, 10) + "";

				if (int_user_id != user_id) {
					throw "The parameter 'to' has to be a coma separated list of user_id (int)";
				}

				user_ids_request.push(int_user_id);
			}

			apprequest_options.to = user_ids_request;
			*/

			apprequest_options.to = [user_id];

			var id_request = DZ.util.uniqid();
			if (typeof options.callback == 'function') {
				DZ.Event.subscribe(DZ.Event.ui.APPREQUEST_CLOSED + '_' + id_request, function(args, evt) {

					var response = {
						status: args.status
					};
					if (typeof args.error != 'undefined') {
						response.error = args.error;
					}
					options.callback(response);

				}, true);
			}

			apprequest_options.id_request = id_request;

			DZ.communication.callDeezerMethod('DZ.deezer.ui.appRequest', apprequest_options);
			return true;
		} catch (e) {
			DZ.catchException(e);
			return false;
		}
	}

};function dzloader() {
	var dzchannel = DZ.init({
		initChannel: true
	});

	if (DZ.isHttps()) {
		DZ.override_https();
	}
	/*
	 * #channel #token
	 */
	if (!dzchannel) {

		DZ.communication.init();

		// DO THIS ALL THE WAY
		if (typeof (jQuery) !== 'undefined') {
			DZ.query = jQuery.noConflict(true);
		}

		// SETTING PARAMS FROM STANDALONE JS
		var dzjssdk = document.getElementById('deezer-jssdk');
		if (dzjssdk !== null) {
			var a = document.createElement('a');
			a.href = dzjssdk.src;
			if (a.hash !== null && a.hash !== '') {
				var dzjssdk_params = a.hash.substr(1).split('&');
				for (var i = 0; i < dzjssdk_params.length; i++) {
					var param = dzjssdk_params[i].split('=');
					if (param.length === 2) {
						DZ.setParams(param[0], param[1]);
					}
				}
			}
		}

		if (typeof (DZ.inapp) !== 'undefined' && DZ.inapp.is_inapp()) {
			DZ.inapp.override_dz();
			DZ.inapp.init();
		} else {
			delete DZ.inapp;
		}

		DZ.query(document).ready(function() {
			var whereami = DZ.CONTEXT.whereami();
			DZ.init_framework();
			if (whereami.context === DZ.CONTEXT.PLAYER && whereami.side === DZ.CONTEXT.APP && typeof (DZ.css) !== 'undefined') {
				DZ.css.init();
			}
		});

		if (typeof (window.dzAsyncInit) !== 'undefined') {
			// load the user function (AFTER THE INIT)
			window.dzAsyncInit();
		}
	}

	/* THE HASH IS SETTING THE ENVIRONNEMENT
	COULD BE :
	#inapp
	#inappmobile
	#inappmobile_ios
	#inappmobile_android
	NULL
	*/
}
dzloader();