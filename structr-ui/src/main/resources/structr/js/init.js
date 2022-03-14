/*
 * Copyright (C) 2010-2021 Structr GmbH
 *
 * This file is part of Structr <http://structr.org>.
 *
 * Structr is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Structr is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Structr.  If not, see <http://www.gnu.org/licenses/>.
 */
var main;
var ignoreKeyUp;
var dialog, dialogBox, dialogMsg, dialogBtn, dialogTitle, dialogMeta, dialogText, dialogHead, dialogCancelButton, dialogSaveButton, saveAndClose, loginBox, dialogCloseButton;
var altKey = false, ctrlKey = false, shiftKey = false, eKey = false;

$(function() {

	$.blockUI.defaults.overlayCSS.opacity        = .6;
	$.blockUI.defaults.overlayCSS.cursor         = 'default';
	$.blockUI.defaults.applyPlatformOpacityRules = false;
	$.blockUI.defaults.onBlock = () => {
		_Console.insertHeaderBlocker();
	};
	$.blockUI.defaults.onUnblock = () => {
		_Console.removeHeaderBlocker();
	};

	main                = $('#main');
	Structr.header      = document.getElementById('header');
	Structr.functionBar = document.getElementById('function-bar');
	loginBox            = $('#login');

	dialogBox           = $('#dialogBox');
	dialog              = $('.dialogText', dialogBox);
	dialogText          = $('.dialogText', dialogBox);
	dialogHead          = $('.dialogHeaderWrapper', dialogBox);
	dialogMsg           = $('.dialogMsg', dialogBox);
	dialogBtn           = $('.dialogBtn', dialogBox);
	dialogTitle         = $('.dialogTitle', dialogBox);
	dialogMeta          = $('.dialogMeta', dialogBox);
	dialogCancelButton  = $('.closeButton', dialogBox);
	dialogSaveButton    = $('.save', dialogBox);

	$('#loginButton').on('click', function(e) {
		e.stopPropagation();
		let username = $('#usernameField').val();
		let password = $('#passwordField').val();
		Structr.doLogin(username, password);
		return false;
	});

	$('#loginButtonTFA').on('click', function(e) {
		e.stopPropagation();
		var tfaToken = $('#twoFactorTokenField').val();
		var tfaCode  = $('#twoFactorCodeField').val();
		Structr.doTFALogin(tfaCode, tfaToken);
		return false;
	});

	$('#logout_').on('click', function(e) {
		e.stopPropagation();
		Structr.doLogout();
	});

	let isHashReset = false;
	window.addEventListener('hashchange', (e) => {

		if (isHashReset === false) {

			let anchor = new URL(window.location.href).hash.substring(1);
			if (anchor === 'logout' || loginBox.is(':visible')) {
				return;
			}

			if (anchor.indexOf(':') > -1) {
				return;
			}

			let allow = (new URL(e.oldURL).hash === '') || Structr.requestActivateModule(e, anchor);

			if (allow !== true) {
				isHashReset = true;
				window.location.href = e.oldURL;
			}

		} else {
			isHashReset = false;
		}
	});

	$(document).on('mouseenter', '[data-toggle="popup"]', function() {
		let target = $(this).data("target");
		$(target).addClass('visible');
	});

	$(document).on('mouseleave', '[data-toggle="popup"]', function() {
		let target = $(this).data("target");
		$(target).removeClass('visible');
	});

	Structr.connect();

	// Reset keys in case of window switching
	$(window).blur(function(e) {
		altKey = false, ctrlKey = false, shiftKey = false, eKey = false;
	});

	$(window).focus(function(e) {
		altKey = false, ctrlKey = false, shiftKey = false, eKey = false;
	});

	$(window).keyup(function(e) {
		let k = e.which;
		if (k === 16) {
			shiftKey = false;
		}
		if (k === 18) {
			altKey = false;
		}
		if (k === 17) {
			ctrlKey = false;
		}
		if (k === 69) {
			eKey = false;
		}

		if (e.keyCode === 27) {
			if (ignoreKeyUp) {
				ignoreKeyUp = false;
				return false;
			}
			if (dialogSaveButton.length && dialogSaveButton.is(':visible') && !dialogSaveButton.prop('disabled')) {
				ignoreKeyUp = true;
				let saveBeforeExit = confirm('Save changes?');
				if (saveBeforeExit) {
					dialogSaveButton.click();
					setTimeout(function() {
						if (dialogSaveButton && dialogSaveButton.length && dialogSaveButton.is(':visible') && !dialogSaveButton.prop('disabled')) {
							dialogSaveButton.remove();
						}
						if (saveAndClose && saveAndClose.length && saveAndClose.is(':visible') && !saveAndClose.prop('disabled')) {
							saveAndClose.remove();
						}
						if (dialogCancelButton && dialogCancelButton.length && dialogCancelButton.is(':visible') && !dialogCancelButton.prop('disabled')) {
							dialogCancelButton.click();
						}
						return false;
					}, 1000);
				}
				return false;
			} else if (dialogCancelButton.length && dialogCancelButton.is(':visible') && !dialogCancelButton.prop('disabled')) {
				dialogCancelButton.click();
				ignoreKeyUp = false;
				return false;
			}
		}
		return false;
	});

	$(window).on('keydown', function(e) {
		// This hack prevents FF from closing WS connections on ESC
		if (e.keyCode === 27) {
			e.preventDefault();
		}
		var k = e.which;
		if (k === 16) {
			shiftKey = true;
		}
		if (k === 18) {
			altKey = true;
		}
		if (k === 17) {
			ctrlKey = true;
		}
		if (k === 69) {
			eKey = true;
		}

		let cmdKey = (navigator.platform === 'MacIntel' && e.metaKey);

		// ctrl-s / cmd-s
		if (k === 83 && ((navigator.platform !== 'MacIntel' && e.ctrlKey) || (navigator.platform === 'MacIntel' && cmdKey))) {
			e.preventDefault();
			if (dialogSaveButton && dialogSaveButton.length && dialogSaveButton.is(':visible') && !dialogSaveButton.prop('disabled')) {
				dialogSaveButton.click();
			}
		}
		// Ctrl-Alt-c
		if (k === 67 && altKey && ctrlKey) {
			e.preventDefault();
			_Console.toggleConsole();
		}
		// Ctrl-Alt-f
		if (k === 70 && altKey && ctrlKey) {
			e.preventDefault();
			_Favorites.toggleFavorites();
		}
		// Ctrl-Alt-p
		if (k === 80 && altKey && ctrlKey) {
			e.preventDefault();
			var uuid = prompt('Enter the UUID for which you want to open the properties dialog');
			if (uuid) {
				if (uuid.length === 32) {
					Command.get(uuid, null, function (obj) {
						_Entities.showProperties(obj);
					});
				} else {
					alert('That does not look like a UUID! length != 32');
				}
			}
		}
		// Ctrl-Alt-m
		if (k === 77 && altKey && ctrlKey) {
			e.preventDefault();
			var uuid = prompt('Enter the UUID for which you want to open the content/template edit dialog');
			if (uuid && uuid.length === 32) {
				Command.get(uuid, null, function(obj) {
					_Elements.openEditContentDialog(obj);
				});
			} else {
				alert('That does not look like a UUID! length != 32');
			}
		}
		// Ctrl-Alt-g
		if (k === 71 && altKey && ctrlKey) {
			e.preventDefault();
			var uuid = prompt('Enter the UUID for which you want to open the access control dialog');
			if (uuid && uuid.length === 32) {
				Command.get(uuid, null, function(obj) {
					_Entities.showAccessControlDialog(obj);
				});
			} else {
				alert('That does not look like a UUID! length != 32');
			}
		}
		// Ctrl-Alt-h
		if (k === 72 && altKey && ctrlKey) {
			e.preventDefault();
			if ("schema" === Structr.getActiveModuleName()) {
				_Schema.hideSelectedSchemaTypes();
			}
		}
		// Ctrl-Alt-e
		if (k === 69 && altKey && ctrlKey) {
			e.preventDefault();
			Structr.dialog('Bulk Editing Helper (Ctrl-Alt-E)');
			new RefactoringHelper(dialog).show();
		}

		// Ctrl-Alt-i
		if (k === 73 && altKey && ctrlKey) {
			e.preventDefault();

			Structr.showAvailableIcons();
		}
	});

	$(window).on('resize', Structr.resize);

	live('.dropdown-select', 'click', (e) => {
		e.stopPropagation();
		e.preventDefault();

		let menu = e.target.closest('.dropdown-menu');

		if (menu) {

			let container = e.target.closest('.dropdown-menu').querySelector('.dropdown-menu-container');

			if (container) {
				console.log(container);

				if (container.style.display === 'none' || container.style.display === '') {

					container.style.display = 'inline-block';

				} else if (container.style.display === 'inline-block') {

					container.style.display = 'none';
				}
			}
		}
		return false;
	});

	live('#closeDialog', 'click', (e) => {
		document.querySelector('#dialogBox .closeButton').click();
		return false;
	});

	window.addEventListener('click', (e) => {
		e.stopPropagation();
		const el = e.target;
		const isButton = el.classList.contains('dropdown-select');
		if (isButton) return false;
		const menu           = el.closest('.dropdown-menu');
		const menuContainer  = menu && menu.querySelector('.dropdown-menu-container');
		if (!menuContainer) {
			document.querySelectorAll('.dropdown-menu-container').forEach((container) => {
				container.style.display    = 'none';
			});
		}
		return false;
	});
});

let Structr = {
	isInMemoryDatabase: undefined,
	modules: {},
	activeModules: {},
	moduleAvailabilityCallbacks: [],
	keyMenuConfig: 'structrMenuConfig_' + location.port,
	mainModule: undefined,
	subModule: undefined,
	lastMenuEntry: undefined,
	lastMenuEntryKey: 'structrLastMenuEntry_' + location.port,
	menuBlocked: undefined,
	dialogMaximizedKey: 'structrDialogMaximized_' + location.port,
	isMax: false,
	expandedIdsKey: 'structrTreeExpandedIds_' + location.port,
	dialogDataKey: 'structrDialogData_' + location.port,
	edition: '',
	classes: [],
	expanded: {},
	msgCount: 0,
	currentlyActiveSortable: undefined,
	loadingSpinnerTimeout: undefined,
	legacyRequestParameters: false,
	diffMatchPatch: undefined,
	defaultBlockUICss: {
		cursor: 'default',
		border: 'none',
		backgroundColor: 'transparent'
	},
	dialogTimeoutId: undefined,
	getDiffMatchPatch: () => {
		if (!Structr.diffMatchPatch) {
			Structr.diffMatchPatch = new diff_match_patch();
		}
		return Structr.diffMatchPatch;
	},
    getPrefixedRootUrl: (rootUrl = '/structr/rest') => {

	    let prefix = [];
	    const pathEntries = window.location.pathname.split('/')?.filter( pathEntry => pathEntry !== '') ?? [];
	    let entry = pathEntries.shift();

	    while (entry !== 'structr' && entry !== undefined) {
           prefix.push(entry);
           entry = pathEntries.shift();
        }

	    return `${ (prefix.length ? '/' : '') + prefix.join('/') }${rootUrl}`;
	},
	getRequestParameterName: (key) => {

		if (Structr.legacyRequestParameters === true) {
			// return key itself for legacy usage
			return key;
		} else {
			return '_' + key;
		}
	},
	templateCache: new AsyncObjectCache(function(templateName) {

		Promise.resolve(
			fetch('templates/' + templateName + '.html?t=' + (new Date().getTime()))
		).then(function(response) {
			if (response.ok) {
				return response.text();
			} else {
				throw new Error('unable to fetch template ' + templateName);
			}
		}).then(function(templateHtml) {
			Structr.templateCache.addObject(templateHtml, templateName);
		}).catch(function(e) {
			console.log(e.statusText, templateName, e);
		});
	}),

	reconnect: function() {
		Structr.stopPing();
		Structr.stopReconnect();
		StructrWS.reconnectIntervalId = window.setInterval(function() {
			StructrWS.connect();
		}, 1000);
		StructrWS.connect();
	},
	stopReconnect: function() {
		if (StructrWS.reconnectIntervalId) {
			window.clearInterval(StructrWS.reconnectIntervalId);
			StructrWS.reconnectIntervalId = undefined;
			StructrWS.user = undefined;
		}
	},
	init: function() {
		$('#errorText').empty();
		Structr.ping();
		Structr.startPing();
	},
	ping: function(callback) {

		if (StructrWS.ws.readyState !== 1) {
			Structr.reconnect();
		}

		StructrWS.sessionId = Structr.getSessionId();

		if (StructrWS.sessionId) {
			Command.ping(callback);
		} else {
			Structr.renewSessionId(function() {
				Command.ping(callback);
			});
		}
	},
	refreshUi: function(isLogin = false) {
		Structr.showLoadingSpinner();

		Structr.clearMain();
		Structr.loadInitialModule(isLogin, function() {
			Structr.startPing();
			if (!dialogText.text().length) {
				LSWrapper.removeItem(Structr.dialogDataKey);
			} else {
				let dialogData = JSON.parse(LSWrapper.getItem(Structr.dialogDataKey));
				if (dialogData) {
					Structr.restoreDialog(dialogData);
				}
			}
			Structr.hideLoadingSpinner();
			_Console.initConsole();
			document.querySelector('#header .logo').addEventListener('click', _Console.toggleConsole);
			_Favorites.initFavorites();
		});
	},
	updateUsername: function(name) {
		if (name !== StructrWS.user) {
			StructrWS.user = name;
			$('#logout_').html('Logout <span class="username">' + name + '</span>');
		}
	},
	startPing: function() {
		Structr.stopPing();
		if (!StructrWS.ping) {
			StructrWS.ping = window.setInterval(function() {
				Structr.ping();
			}, 1000);
		}
	},
	stopPing: function() {
		if (StructrWS.ping) {
			window.clearInterval(StructrWS.ping);
			StructrWS.ping = undefined;
		}
	},
	getSessionId: function() {
		return Cookies.get('JSESSIONID');
	},
	connect: function() {
		StructrWS.sessionId = Structr.getSessionId();
		if (!StructrWS.sessionId) {
			Structr.renewSessionId(function() {
				StructrWS.connect();
			});
		} else {
			StructrWS.connect();
		}
	},
	login: function(text) {

		if (!loginBox.is(':visible')) {

			_Favorites.logoutAction();
			_Console.logoutAction();

			fastRemoveAllChildren(main[0]);
			fastRemoveAllChildren(Structr.functionBar);
			_Elements.removeContextMenu();

			$.blockUI({
				fadeIn: 25,
				fadeOut: 25,
				message: loginBox,
				forceInput: true,
				css: Structr.defaultBlockUICss
			});
		}

		$('#logout_').html('Login');
		if (text) {
			$('#errorText').html(text);
			$('#errorText-two-factor').html(text);
		}
	},
	clearLoginForm: function() {
		loginBox.find('#usernameField').val('');
		loginBox.find('#passwordField').val('');
		loginBox.find('#errorText').empty();

		loginBox.find('#two-factor').hide();
		loginBox.find('#two-factor #two-factor-qr-code').hide();
		loginBox.find('#two-factor img').attr('src', '');

		loginBox.find('#errorText-two-factor').empty();
		loginBox.find('#twoFactorTokenField').val('');
		loginBox.find('#twoFactorCodeField').val('');
	},
	toggle2FALoginBox: function(data) {

		$('#errorText').html('');
		$('#errorText-two-factor').html('');

		$('table.username-password', loginBox).hide();
		$('#two-factor', loginBox).show();

		if (data.qrdata) {
			$('#two-factor #two-factor-qr-code').show();
			$('#two-factor img', loginBox).attr('src', 'data:image/png;base64, ' + data.qrdata);
		}

		$('#twoFactorTokenField').val(data.token);
		$('#twoFactorCodeField').val('').focus();
	},
	doLogin: function(username, password) {
		Structr.renewSessionId(function() {
			Command.login({
				username: username,
				password: password
			});
		});
	},
	doTFALogin: function(twoFactorCode, twoFacorToken) {
		Structr.renewSessionId(function() {
			Command.login({
				twoFactorCode: twoFactorCode,
				twoFactorToken: twoFacorToken
			});
		});
	},
	doLogout: function(text) {
		_Favorites.logoutAction();
		_Console.logoutAction();
		LSWrapper.save();
		if (Command.logout(StructrWS.user)) {
			Cookies.remove('JSESSIONID');
			StructrWS.sessionId = '';
			Structr.renewSessionId();
			Structr.clearMain();
			Structr.clearVersionInfo();
			Structr.login(text);
			return true;
		}
		StructrWS.ws.close();
		return false;
	},
	renewSessionId: function(callback) {
		$.get(Structr.getPrefixedRootUrl('/')).always(function() {
			StructrWS.sessionId = Structr.getSessionId();

			if (!StructrWS.sessionId && location.protocol === 'http:') {

				new MessageBuilder()
					.title("Unable to retrieve session id cookie")
					.warning("This is most likely due to a pre-existing secure HttpOnly cookie. Please navigate to the HTTPS version of this page (even if HTTPS is inactive) and delete the JSESSIONID cookie. Then return to this page and reload. This should solve the problem.")
					.requiresConfirmation()
					.uniqueClass("http-only-cookie")
					.show();
			}

			if (typeof callback === "function") {
				callback();
			}
		});
	},
	loadInitialModule: function(isLogin, callback) {

		LSWrapper.restore(function() {

			Structr.expanded = JSON.parse(LSWrapper.getItem(Structr.expandedIdsKey));

			Structr.determineModule();

			Structr.lastMenuEntry = ((!isLogin && Structr.mainModule && Structr.mainModule !== 'logout') ? Structr.mainModule : Structr.getActiveModuleName());
			if (!Structr.lastMenuEntry) {
				Structr.lastMenuEntry = Structr.getActiveModuleName() || 'dashboard';
			}
			Structr.updateVersionInfo(0, isLogin);
			Structr.doActivateModule(Structr.lastMenuEntry);

			callback();
		});
	},
	determineModule: () => {

		const browserUrl   = new URL(window.location.href);
		const anchor       = browserUrl.hash.substring(1);
		const navState     = anchor.split(':');
		Structr.mainModule = navState[0];
		Structr.subModule  = navState.length > 1 ? navState[1] : null;
	},
	clearMain: function() {
		let newDroppables = new Array();
		$.ui.ddmanager.droppables['default'].forEach(function(droppable, i) {
			if (!droppable.element.attr('id') || droppable.element.attr('id') !== 'graph-canvas') {
			} else {
				newDroppables.push(droppable);
			}
		});
		$.ui.ddmanager.droppables['default'] = newDroppables;

		fastRemoveAllChildren(main[0]);
		fastRemoveAllChildren(Structr.functionBar);
		_Elements.removeContextMenu();
	},
	confirmation: function(text, yesCallback, noCallback) {
		if (text) {
			$('#confirmation .confirmationText').html(text);
		}
		let yesButton = $('#confirmation .yesButton');
		let noButton  = $('#confirmation .noButton');

		if (yesCallback) {
			yesButton.on('click', function(e) {
				e.stopPropagation();
				yesCallback();
				yesButton.off('click');
				noButton.off('click');
			});
		}

		noButton.on('click', function(e) {
			e.stopPropagation();
			$.unblockUI({
				fadeOut: 25
			});
			if (noCallback) {
				noCallback();
			}
			yesButton.off('click');
			noButton.off('click');
		});

		$.blockUI({
			fadeIn: 25,
			fadeOut: 25,
			message: $('#confirmation'),
			css: Structr.defaultBlockUICss
		});
	},
	restoreDialog: function(dialogData) {

		window.setTimeout(function() {

			Structr.blockUI(dialogData);
			Structr.resize();

		}, 1000);

	},
	dialog: function(text, callbackOk, callbackCancel, customClasses) {

		if (browser) {

			dialogHead.empty();
			dialogText.empty();
			dialogMsg.empty();
			dialogMeta.empty();
			dialogBtn.empty();

			dialogBox[0].classList = ["dialog"];
			if (customClasses) {
				for (let customClass of customClasses) {
					dialogBox.addClass(customClass);
				}
			}

			dialogBtn.html('<button class="closeButton">Close</button>');
			dialogCancelButton = $('.closeButton', dialogBox);

			$('.speechToText', dialogBox).remove();

			if (text) {
				dialogTitle.html(text);
			}

			dialogCancelButton.off('click').on('click', function(e) {
				e.stopPropagation();
				dialogText.empty();
				$.unblockUI({
					fadeOut: 25
				});

				dialogBtn.children(':not(.closeButton)').remove();

				Structr.focusSearchField();

				LSWrapper.removeItem(Structr.dialogDataKey);

				if (callbackCancel) {
					window.setTimeout(callbackCancel, 100);
				}
			});

			let dimensions = Structr.getDialogDimensions(24, 24);
			Structr.blockUI(dimensions);

			Structr.resize();

			dimensions.text = text;
			LSWrapper.setItem(Structr.dialogDataKey, JSON.stringify(dimensions));
		}
	},
	focusSearchField: function() {
		let activeModule = Structr.getActiveModule();
		if (activeModule) {
			let searchField = activeModule.searchField;

			if (searchField) {
				searchField.focus();
			}
		}
	},
	getDialogDimensions: function(marginLeft, marginTop) {

		var winW = $(window).width();
		var winH = $(window).height();

		var width = Math.min(900, winW - marginLeft);
		var height = Math.min(600, winH - marginTop);

		return {
			width: width,
			height: height,
			left: parseInt((winW - width) / 2),
			top: parseInt((winH - height) / 2)
		};

	},
	blockUI: function(dimensions) {

		$.blockUI({
			fadeIn: 25,
			fadeOut: 25,
			message: dialogBox,
			css: Object.assign({
				width: dimensions.width + 'px',
				height: dimensions.height + 'px',
				top: dimensions.top + 'px',
				left: dimensions.left + 'px'
			}, Structr.defaultBlockUICss),
			themedCSS: {
				width: dimensions.width + 'px',
				height: dimensions.height + 'px',
				top: dimensions.top + 'px',
				left: dimensions.left + 'px'
			},
			width: dimensions.width + 'px',
			height: dimensions.height + 'px',
			top: dimensions.top + 'px',
			left: dimensions.left + 'px'
		});

	},
	setSize: function(w, h, dw, dh) {

		let l = parseInt((w - dw) / 2);
		let t = parseInt((h - dh) / 2);

		let horizontalOffset = 148;

		// needs to be calculated like this because the elements in the dialogHead (tabs) are floated and thus the .height() method returns 0
		var headerHeight = (dialogText.position().top + dialogText.scrollParent().scrollTop()) - dialogHead.position().top;

		$('#dialogBox .dialogTextWrapper').css('width', 'calc(' + dw + 'px - 3rem)');
		$('#dialogBox .dialogTextWrapper').css('height', dh - horizontalOffset - headerHeight);

		$('.blockPage').css({
			width: dw + 'px',
			//height: dh + 'px',
			top: t + 'px',
			left: l + 'px'
		});

		$('.fit-to-height').css({
			height: h - 84 + 'px'
		});
	},
	resize: function(callback) {

		Structr.isMax = LSWrapper.getItem(Structr.dialogMaximizedKey);

		if (Structr.isMax) {
			Structr.maximize();
		} else {

			// Calculate dimensions of dialog
			if ($('.blockPage').length && !loginBox.is(':visible')) {
				Structr.setSize($(window).width(), $(window).height(), Math.min(900, $(window).width() - 24), Math.min(600, $(window).height() - 24));
			}

			$('#minimizeDialog').hide();
			$('#maximizeDialog').show().off('click').on('click', function() {
				Structr.maximize();
			});
		}

		if (callback) {
			callback();
		}
	},
	maximize: function() {

		// Calculate dimensions of dialog
		if ($('.blockPage').length && !loginBox.is(':visible')) {
			Structr.setSize($(window).width(), $(window).height(), $(window).width() - 24, $(window).height() - 24);
		}

		Structr.isMax = true;
		$('#maximizeDialog').hide();
		$('#minimizeDialog').show().off('click').on('click', function() {
			Structr.isMax = false;
			LSWrapper.removeItem(Structr.dialogMaximizedKey);
			Structr.resize();

			Structr.getActiveModule()?.dialogSizeChanged?.();
		});

		LSWrapper.setItem(Structr.dialogMaximizedKey, '1');

		Structr.getActiveModule()?.dialogSizeChanged?.();
	},
	error: (text, confirmationRequired) => {
		let message = new MessageBuilder().error(text);
		if (confirmationRequired) {
			message.requiresConfirmation();
		} else {
			message.delayDuration(2000).fadeDuration(1000);
		}
		message.show();
	},
	errorFromResponse: function(response, url, additionalParameters) {

		var errorText = '';

		if (response.errors && response.errors.length) {

			var errorLines = [response.message];

			response.errors.forEach(function(error) {

				var errorMsg = (error.type ? error.type : '');
				if (error.property) {
					errorMsg += '.' + error.property;
				}
				if (error.token) {
					errorMsg += ' ' + error.token;
				}
				if (error.detail) {
					if (errorMsg.trim().length > 0) {
						errorMsg += ': ';
					}
					errorMsg += error.detail;
				}

				errorLines.push(errorMsg);
			});

			errorText = errorLines.join('<br>');

		} else {

			if (url) {
				errorText = url + ': ';
			}

			errorText += response.code + '<br>';

			Object.keys(response).forEach(function(key) {
				if (key !== 'code') {
					errorText += '<b>' + key.capitalize() + '</b>: ' + response[key] + '<br>';
				}
			});
		}

		var message = new MessageBuilder().error(errorText);

		if (additionalParameters) {
			if (additionalParameters.requiresConfirmation) {
				message.requiresConfirmation();
			}
			if (additionalParameters.statusCode) {
				var title = Structr.getErrorTextForStatusCode(additionalParameters.statusCode);
				if (title) {
					message.title(title);
				}
			}
			if (additionalParameters.title) {
				message.title(additionalParameters.title);
			}
			if (additionalParameters.furtherText) {
				message.furtherText(additionalParameters.furtherText);
			}
			if (additionalParameters.overrideText) {
				message.text(additionalParameters.overrideText);
			}
		}

		message.show();
	},
	getErrorTextForStatusCode: function(statusCode) {
		switch (statusCode) {
			case 400: return 'Bad request';
			case 401: return 'Authentication required';
			case 403: return 'Forbidden';
			case 404: return 'Not found';
			case 422: return 'Unprocessable entity';
			case 500: return 'Internal Error';
			case 503: return 'Service Unavailable';
		}
	},
	loaderIcon: (element, css) => {
		let icon = $(_Icons.getSvgIcon('waiting-spinner', 24, 24));
		element.append(icon);
		if (css) {
			icon.css(css);
		}
		return icon;
	},
	updateButtonWithAjaxLoaderAndText: (btn, html) => {
		btn.attr('disabled', 'disabled').addClass('disabled').html(html + _Icons.getSvgIcon('waiting-spinner', 20, 20, 'ml-2'));
	},
	updateButtonWithSuccessIcon: (btn, html) => {
		btn.attr('disabled', null).removeClass('disabled').html(html + _Icons.getSvgIcon('checkmark_bold', 16, 16, 'tick icon-green ml-2'));
		window.setTimeout(() => {
			$('.tick', btn).fadeOut();
		}, 1000);
	},
	tempInfo: function(text, autoclose) {

		window.clearTimeout(Structr.dialogTimeoutId);

		if (text) {
			$('#tempInfoBox .infoHeading').html('<i class="' + _Icons.getFullSpriteClass(_Icons.information_icon) + '"></i> ' + text);
		}

		if (autoclose) {
			Structr.dialogTimeoutId = window.setTimeout(() => {
				$.unblockUI({
					fadeOut: 25
				});
			}, 3000);
		}

		$('#tempInfoBox .closeButton').on('click', function(e) {
			e.stopPropagation();
			window.clearTimeout(Structr.dialogTimeoutId);
			$.unblockUI({
				fadeOut: 25
			});
			dialogBtn.children(':not(.closeButton)').remove();

			Structr.focusSearchField();
		});

		$.blockUI({
			message: $('#tempInfoBox'),
			css: Structr.defaultBlockUICss
		});
	},
	reconnectDialog: () => {

		let restoreDialogText = '';
		let dialogData = JSON.parse(LSWrapper.getItem(Structr.dialogDataKey));
		if (dialogData && dialogData.text) {
			restoreDialogText = '<div>The dialog</div><b>"' + dialogData.text + '"</b><div>will be restored after reconnect.</div>';
		}

		let tmpErrorHTML = `
			<div id="tempErrorBox" class="dialog block">
				<div class="flex flex-col gap-y-4 items-center justify-center">
					<div class="flex items-center">
						<i class="${_Icons.getFullSpriteClass(_Icons.error_icon)} mr-2"></i>
						<b>Connection lost or timed out.</b>
					</div>

					<div>
						Don't reload the page!
					</div>
					
					${restoreDialogText}

					<div class="flex items-center">
						<span>Trying to reconnect...</span>
						${_Icons.getSvgIcon('waiting-spinner', 24, 24, 'ml-2')}
					</div>
				</div>
				<div class="errorMsg"></div>
				<div class="dialogBtn"></div>
			</div>
		`;

		$.blockUI({
			message: tmpErrorHTML,
			css: Structr.defaultBlockUICss
		});
	},
	blockMenu: () => {
		Structr.menuBlocked = true;
		$('#menu > ul > li > a').attr('disabled', 'disabled').addClass('disabled');
	},
	unblockMenu: (ms) => {
		// Wait ms before releasing the main menu
		window.setTimeout(function() {
			Structr.menuBlocked = false;
			$('#menu > ul > li > a').removeAttr('disabled', 'disabled').removeClass('disabled');
		}, ms || 0);
	},
	requestActivateModule: function(event, name) {
		if (Structr.menuBlocked) {
			return false;
		}

		event.stopPropagation();
		if (Structr.getActiveModuleName() !== name || main.children().length === 0) {
			return Structr.doActivateModule(name);
		}

		return true;
	},
	doActivateModule: function(name) {
		Structr.determineModule();

		if (Structr.modules[name]) {
			let activeModule = Structr.getActiveModule();

			let moduleAllowsNavigation = true;
			if (activeModule && activeModule.unload) {
				let moduleOverride = activeModule.unload();
				if (moduleOverride === false) {
					moduleAllowsNavigation = false;
				}
			}

			if (moduleAllowsNavigation) {
				Structr.clearMain();
				Structr.activateMenuEntry(name);
				Structr.modules[name].onload();
				Structr.adaptUiToAvailableFeatures();
			}

			return moduleAllowsNavigation;
		} else {
			Structr.unblockMenu();
		}

		return true;
	},
	activateMenuEntry: function(name) {
		Structr.blockMenu();
		let menuEntry = $('#' + name + '_');
		let li = menuEntry.parent();
		if (li.hasClass('active')) {
			return false;
		}
		Structr.lastMenuEntry = name;
		$('.menu li').removeClass('active');
		li.addClass('active');
		$('#title').text('Structr ' + menuEntry.text());
		window.location.hash = Structr.lastMenuEntry;
		if (Structr.lastMenuEntry && Structr.lastMenuEntry !== 'logout') {
			LSWrapper.setItem(Structr.lastMenuEntryKey, Structr.lastMenuEntry);
		}
	},
	registerModule: function(module) {
		let name = module._moduleName;
		if (!name || name.trim().length === 0) {
			new MessageBuilder().error("Cannot register module without a name - ignoring attempt. To fix this error, please add the '_moduleName' variable to the module.").show();
		} else if (!Structr.modules[name]) {
			Structr.modules[name] = module;
		} else {
			new MessageBuilder().error("Cannot register module '" + name + "' a second time - ignoring attempt.").show();
		}
	},
	getActiveModuleName: () => {
		return Structr.lastMenuEntry || LSWrapper.getItem(Structr.lastMenuEntryKey);
	},
	getActiveModule: () => {
		return Structr.modules[Structr.getActiveModuleName()];
	},
	isModuleActive: (module) => {
		return (module._moduleName === Structr.getActiveModuleName());
	},
	containsNodes: (element) => {
		return (element && Structr.numberOfNodes(element) && Structr.numberOfNodes(element) > 0);
	},
	numberOfNodes: function(element, excludeId) {
		let childNodes = $(element).children('.node');

		if (excludeId) {
			childNodes = childNodes.not('.' + excludeId + '_');
		}

		return childNodes.length;
	},
	findParent: function(parentId, componentId, pageId, defaultElement) {
		let parent = Structr.node(parentId, null, componentId, pageId);

		if (!parent) {
			parent = defaultElement;
		}

		return parent;
	},
	parent: function(id) {
		return Structr.node(id) && Structr.node(id).parent().closest('.node');
	},
	node: function(id, prefix) {
		let p    = prefix || '#id_';
		let node = $($(p + id)[0]);

		return (node.length ? node : undefined);
	},
	entity: function(id, parentId) {
		let entityElement = Structr.node(id, parentId);
		let entity        = Structr.entityFromElement(entityElement);
		return entity;
	},
	getClass: function(el) {
		let c;
		for(let cls of Structr.classes) {
			if (el && $(el).hasClass(cls)) {
				c = cls;
			}
		}

		return c;
	},
	entityFromElement: function(element) {

		var entity = {};
		entity.id = Structr.getId($(element));
		var cls = Structr.getClass(element);
		if (cls) {
			entity.type = cls.capitalize();
		}

		var nameEl = $(element).children('.name_');

		if (nameEl && nameEl.length) {
			entity.name = $(nameEl[0]).text();
		}

		var tagEl = $(element).children('.tag_');

		if (tagEl && tagEl.length) {
			entity.tag = $(tagEl[0]).text();
		}

		return entity;
	},
	makePagesMenuDroppable: function() {

		try {
			$('#pages_').droppable('destroy');
		} catch (err) {
			// console.log(err);
		}

		$('#pages_').droppable({
			accept: '.element, .content, .component, .file, .image, .widget',
			greedy: true,
			hoverClass: 'nodeHover',
			tolerance: 'pointer',
			over: function(e, ui) {

				e.stopPropagation();
				$('a#pages_').droppable('disable');

				Structr.activateMenuEntry('pages');
				window.location.href = '/structr/#pages';

				if (_Files.filesMain && _Files.filesMain.length) {
					_Files.filesMain.hide();
				}
				if (_Widgets.widgets && _Widgets.widgets.length) {
					_Widgets.widgets.hide();
				}

				Structr.modules['pages'].onload();
				Structr.adaptUiToAvailableFeatures();
				_Pages.resize();
				$('a#pages_').removeClass('nodeHover').droppable('enable');
			}

		});
	},
	openSlideOut: function(triggerEl, slideoutElement, callback) {

		let storedRightSlideoutWidth = LSWrapper.getItem(_Pages.pagesResizerRigthKey);
		let rsw                      = storedRightSlideoutWidth ? parseInt(storedRightSlideoutWidth) : (slideoutElement.width() + 12);

		let t = $(triggerEl);
		t.addClass('active');
		slideoutElement.width(rsw);
		slideoutElement.animate({right: 0}, 100, function() {
			if (typeof callback === 'function') {
				callback({isOpenAction: true});
			}
		}).zIndex(1);

		slideoutElement.addClass('open');
	},
	openLeftSlideOut: function(triggerEl, slideoutElement, callback) {

		let storedLeftSlideoutWidth = LSWrapper.getItem(_Pages.pagesResizerLeftKey);
		let psw                     = storedLeftSlideoutWidth ? parseInt(storedLeftSlideoutWidth) : (slideoutElement.width());

		let t = $(triggerEl);
		t.addClass('active');

		slideoutElement.width(psw);

		slideoutElement.animate({left: 0}, 100, function() {
			if (typeof callback === 'function') {
				callback({isOpenAction: true});
			}
		}).zIndex(1);

		slideoutElement.addClass('open');
	},
	closeSlideOuts: function(slideouts, callback) {
		var wasOpen = false;

		slideouts.forEach(function(slideout) {
			slideout.removeClass('open');
			let left          = slideout.position().left;
			let slideoutWidth = slideout[0].getBoundingClientRect().width;

			if (left < $(window).width()) {
			//if (Math.abs($(window).width() - left) >= 3) {
				wasOpen = true;
				slideout.animate({ right: -slideoutWidth }, 100, function() {
					if (typeof callback === 'function') {
						callback(wasOpen);
					}
				}).zIndex(2);
				$('.slideout-activator.right.active').removeClass('active');

				var openSlideoutCallback = slideout.data('closeCallback');
				if (typeof openSlideoutCallback === 'function') {
					openSlideoutCallback();
				}
			}
		});

		LSWrapper.removeItem(_Pages.activeTabRightKey);
	},
	closeLeftSlideOuts: function(slideouts, callback) {
		let wasOpen = false;
		let oldSlideoutWidth;

		slideouts.forEach(function(slideout) {
			slideout.removeClass('open');
			let left          = slideout.position().left;
			let slideoutWidth = slideout[0].getBoundingClientRect().width;

			if (left > -1) {
				wasOpen = true;
				oldSlideoutWidth = slideoutWidth;
				slideout.animate({ left: -slideoutWidth }, 100, function() {
					if (typeof callback === 'function') {
						callback(wasOpen, -oldSlideoutWidth, 0);
					}
				}).zIndex(2);
				$('.slideout-activator.left.active').removeClass('active');
			}
		});
	},
	updateVersionInfo: function(retryCount = 0, isLogin = false) {

		fetch(Structr.rootUrl + '_env').then(function(response) {

			if (response.ok) {
				return response.json();
			} else {
				throw Error("Unable to read env resource data");
			}

		}).then(function(data) {

			let envInfo = data.result;
			if (Array.isArray(envInfo)) {
			    envInfo = envInfo[0];
			}

			let dbInfoEl = $('#header .structr-instance-db');

			if (envInfo.databaseService) {
				let driverName = Structr.getDatabaseDriverNameForDatabaseServiceName(envInfo.databaseService);
				let icon       = _Icons.database_icon;

				if (envInfo.databaseService === 'MemoryDatabaseService') {
					icon = _Icons.database_error_icon;
				}

				dbInfoEl.html('<span><i class="' + _Icons.getFullSpriteClass(icon) + '" title="' + driverName + '"></span>');

				Structr.isInMemoryDatabase = (envInfo.databaseService === 'MemoryDatabaseService');
				if (Structr.isInMemoryDatabase === true) {
					Structr.isInMemoryDatabase = true;
					Structr.appendInMemoryInfoToElement($('span', dbInfoEl), $('span i', dbInfoEl));

					if (isLogin) {
						new MessageBuilder().warning(Structr.inMemoryWarningText).requiresConfirmation().show();
					}
				}
			}

			$('#header .structr-instance-name').text(envInfo.instanceName);
			$('#header .structr-instance-stage').text(envInfo.instanceStage);

			Structr.legacyRequestParameters = envInfo.legacyRequestParameters;

			if (true === envInfo.maintenanceModeActive) {
				$('#header .structr-instance-maintenance').text("MAINTENANCE");
			}


			let ui = envInfo.components['structr-ui'];
			if (ui) {

				let version     = ui.version;
				let build       = ui.build;
				let date        = ui.date;
				let versionLink = 'https://structr.com/download';
				let versionInfo = '<a target="_blank" href="' + versionLink + '">' + version + '</a>';
				if (build && date) {
					versionInfo += '<span> build </span><a target="_blank" href="https://github.com/structr/structr/commit/' + build + '">' + build + '</a><span> (' + date + ')</span>';
				}

				if (envInfo.edition) {

					Structr.edition = envInfo.edition;

					var tooltipText = 'Structr ' + envInfo.edition + ' Edition';
					if (envInfo.licensee) {
						tooltipText += '\nLicensed to: ' + envInfo.licensee;
					} else {
						tooltipText += '\nUnlicensed';
					}

					versionInfo += '<i title="' + tooltipText + '" class="edition-icon ' + _Icons.getFullSpriteClass(_Icons.getIconForEdition(envInfo.edition)) + '"></i>';

					$('.structr-version').html(versionInfo);

					_Dashboard.checkLicenseEnd(envInfo, $('.structr-version'), {
						offsetX: -300,
						helpElementCss: {
							color: "black",
							fontSize: "8pt",
							lineHeight: "1.7em"
						}
					});

				} else {
					$('.structr-version').html(versionInfo);
				}
			}

			Structr.activeModules = envInfo.modules;
			Structr.adaptUiToAvailableFeatures();

			let userConfigMenu = LSWrapper.getItem(Structr.keyMenuConfig);
			if (!userConfigMenu) {
				userConfigMenu = {
					main: envInfo.mainMenu,
					sub: []
				};
			}

			Structr.updateMainMenu(userConfigMenu);

			if (envInfo.resultCountSoftLimit !== undefined) {
				_Crud.resultCountSoftLimit = envInfo.resultCountSoftLimit;
			}

			// run previously registered callbacks
			let registeredCallbacks = Structr.moduleAvailabilityCallbacks;
			Structr.moduleAvailabilityCallbacks = [];
			registeredCallbacks.forEach((cb) => {
				cb();
			});

		}).catch((e) => {
			if (retryCount < 3) {
				setTimeout(() => {
					Structr.updateVersionInfo(++retryCount, isLogin);
				}, 250);
			} else {
				console.log(e);
			}
		});
	},
	updateMainMenu: function (menuConfig) {

		LSWrapper.setItem(Structr.keyMenuConfig, menuConfig);

		let menu      = $('#menu');
		let submenu   = $('#submenu');
		let hamburger = $('#menu li.submenu-trigger');

		// first move all elements from main menu to submenu
		$('li[data-name]', menu).appendTo(submenu);

		menuConfig.main.forEach(function(entry) {
			$('li[data-name="' + entry + '"]', menu).insertBefore(hamburger);
		});

		menuConfig.sub.forEach(function(entry) {
			$('#submenu li').last().after($('li[data-name="' + entry + '"]', menu));
		});
	},
	inMemoryWarningText:"Please note that the system is currently running on an in-memory database implementation. Data is not persisted and will be lost after restarting the instance! You can use the configuration tool to configure a database connection.",
	appendInMemoryInfoToElement: function(el, optionalToggleElement) {

		let config = {
			element: el,
			text: Structr.inMemoryWarningText,
			customToggleIcon: _Icons.database_error_icon,
			helpElementCss: {
				'border': '2px solid red',
				'border-radius': '4px',
				'font-weight': 'bold',
				'font-size': '15px',
				'color': '#000'
			}
		};

		if (optionalToggleElement) {
			config.toggleElement = optionalToggleElement;
		}

		Structr.appendInfoTextToElement(config);
	},
	getDatabaseDriverNameForDatabaseServiceName: function (databaseServiceName) {
		switch (databaseServiceName) {
			case 'BoltDatabaseService':
				return 'Bolt Database Driver';

			case 'MemoryDatabaseService':
				return 'In-Memory Database Driver';
				break;
		}

		return 'Unknown database driver!';
	},
	clearVersionInfo: function() {
		$('.structr-version').html('');
	},
	getId: function(element) {
		var id = Structr.getIdFromPrefixIdString($(element).prop('id'), 'id_') || $(element).data('nodeId');
		return id || undefined;
	},
	getIdFromPrefixIdString: function(idString, prefix) {
		if (!idString || !idString.startsWith(prefix)) {
			return false;
		}
		return idString.substring(prefix.length);
	},
	getComponentId: function(element) {
		return Structr.getIdFromPrefixIdString($(element).prop('id'), 'componentId_') || undefined;
	},
	getUserId: function(element) {
		return element.data('userId');
	},
	getGroupId: function(element) {
		return element.data('groupId');
	},
	getActiveElementId: function(element) {
		return Structr.getIdFromPrefixIdString($(element).prop('id'), 'active_') || undefined;
	},
	adaptUiToAvailableFeatures: function() {
		Structr.adaptUiToAvailableModules();
		Structr.adaptUiToEdition();
	},
	adaptUiToAvailableModules: function() {
		$('.module-dependend').each(function(idx, element) {
			var el = $(element);
			var module = el.data('structr-module');
			if (Structr.isModulePresent(module)) {
				if (!el.is(':visible')) el.show();
			} else {
				el.hide();
			}
		});
	},
	isModulePresent: function(moduleName) {
		return Structr.activeModules[moduleName] !== undefined;
	},
	isModuleInformationAvailable: function() {
		return (Object.keys(Structr.activeModules).length > 0);
	},
	performModuleDependendAction: function(action) {
		if (Structr.isModuleInformationAvailable()) {
			action();
		} else {
			Structr.registerActionAfterModuleInformationIsAvailable(action);
		}
	},
	registerActionAfterModuleInformationIsAvailable: function(cb) {
		Structr.moduleAvailabilityCallbacks.push(cb);
	},
	adaptUiToEdition: function() {
		$('.edition-dependend').each(function(idx, element) {
			var el = $(element);

			if (Structr.isAvailableInEdition(el.data('structr-edition'))) {
				if (!el.is(':visible')) el.show();
			} else {
				el.hide();
			}
		});
	},
	isAvailableInEdition: function(requiredEdition) {
		switch(Structr.edition) {
			case 'Enterprise':
				return true;
			case 'Small Business':
				return ['Small Business', 'Basic', 'Community'].indexOf(requiredEdition) !== -1;
			case 'Basic':
				return ['Basic', 'Community'].indexOf(requiredEdition) !== -1;
			case 'Community':
				return ['Community'].indexOf(requiredEdition) !== -1;
		};
	},
	updateMainHelpLink: function(newUrl) {
		$('#main-help a').attr('href', newUrl);
	},
	isButtonDisabled: function(button) {
		return $(button).data('disabled');
	},
	disableButton: function(btn) {
		$(btn).addClass('disabled').attr('disabled', 'disabled');
	},
	enableButton: function(btn) {
		$(btn).removeClass('disabled').removeAttr('disabled');
	},
	addExpandedNode: (id) => {

		if (id) {
			let alreadyStored = Structr.getExpanded()[id];
			if (!alreadyStored) {

				Structr.getExpanded()[id] = true;
				LSWrapper.setItem(Structr.expandedIdsKey, JSON.stringify(Structr.expanded));

			}
		}
	},
	removeExpandedNode: (id) => {

		if (id) {
			delete Structr.getExpanded()[id];
			LSWrapper.setItem(Structr.expandedIdsKey, JSON.stringify(Structr.expanded));
		}
	},
	isExpanded: (id) => {

		if (id) {
			let isExpanded = (Structr.getExpanded()[id] === true) ? true : false;

			return isExpanded;
		}

		return false;
	},
	getExpanded: () => {

		if (!Structr.expanded) {
			Structr.expanded = JSON.parse(LSWrapper.getItem(Structr.expandedIdsKey));
		}

		if (!Structr.expanded) {
			Structr.expanded = {};
		}
		return Structr.expanded;
	},
	showAndHideInfoBoxMessage: function(msg, msgClass, delayTime, fadeTime) {
		var newDiv = $('<div class="infoBox ' + msgClass + '"></div>');
		newDiv.text(msg);
		dialogMsg.html(newDiv);
		$('.infoBox', dialogMsg).delay(delayTime).fadeOut(fadeTime);
	},
	initVerticalSlider: function(sliderEl, localstorageKey, minWidth, dragCallback, isRight) {

		if (typeof dragCallback !== 'function') {
			console.error('dragCallback is not a function!');
			return;
		}

		$(sliderEl).draggable({
			axis: 'x',
			start: function(e, ui) {
				$('.column-resizer-blocker').show();
			},
			drag: function(e, ui) {
				return dragCallback(Structr.getSliderValueForDragCallback(ui.position.left, minWidth, isRight));
			},
			stop: function(e, ui) {
				$('.column-resizer-blocker').hide();
				LSWrapper.setItem(localstorageKey, Structr.getSliderValueForDragCallback(ui.position.left, minWidth, isRight));
			}
		});

	},
	getSliderValueForDragCallback: (leftPos, minWidth, isRight) => {
		let val = (isRight === true) ? Math.max(minWidth, window.innerWidth - leftPos) : Math.max(minWidth, leftPos);

		// If there are two resizer elements, distance between resizers must always be larger than minWidth.
		let leftResizer = document.querySelector('.column-resizer-left');
		let rightResizer = document.querySelector('.column-resizer-right');
		if (isRight && !leftResizer.classList.contains('hidden')) {
			let leftResizerLeft = leftResizer.getBoundingClientRect().left;
			val = Math.min(val, window.innerWidth - leftResizerLeft - minWidth + leftResizer.getBoundingClientRect().width + 3);
		} else if (!isRight && rightResizer && !rightResizer.classList.contains('hidden')) {
			let rightResizerLeft = rightResizer.getBoundingClientRect().left;
			val = Math.min(val, rightResizerLeft - minWidth);
		} else if (isRight && leftResizer.classList.contains('hidden')) {
			let rightResizerLeft = rightResizer.getBoundingClientRect().left;
			val = Math.min(val, window.innerWidth - minWidth);
		} else if (!isRight && rightResizer && rightResizer.classList.contains('hidden')) {
			val = Math.min(val, window.innerWidth - minWidth);
		}

		// console.log(isRight, leftResizer.classList.contains('hidden'), rightResizer.classList.contains('hidden'), val);
		return val;
	},
	appendInfoTextToElement: function(config) {

		let element            = config.element;
		let appendToElement    = config.appendToElement || element;
		let text               = config.text || 'No text supplied!';
		let toggleElementCss   = config.css || {};
		let toggleElementClass = config.class || undefined;
		let elementCss         = config.elementCss || {};
		let helpElementCss     = config.helpElementCss || {};
		let customToggleIcon   = config.customToggleIcon || _Icons.information_icon;
		let insertAfter        = config.insertAfter || false;
		let offsetX            = config.offsetX || 0;
		let offsetY            = config.offsetY || 0;

		let createdElements = [];

		let customToggleElement = true;
		let toggleElement = config.toggleElement;
		if (!toggleElement) {
			customToggleElement = false;
			toggleElement = $('<span><i class="' + _Icons.getFullSpriteClass(customToggleIcon) + '"></span>');
			createdElements.push(toggleElement);
		}

		if (toggleElementClass) {
			toggleElement.addClass(toggleElementClass);
		}
		toggleElement.css(toggleElementCss);
		appendToElement.css(elementCss);

		let helpElement = $('<span class="context-help-text">' + text + '</span>');
		createdElements.push(helpElement);

		toggleElement
			.on("mousemove", function(e) {
				helpElement.show();
				helpElement.css({
					left: Math.min(e.clientX + 20 + offsetX, window.innerWidth - helpElement.width() - 50),
					top: Math.min(e.clientY + 10 + offsetY, window.innerHeight - helpElement.height() - 10)
				});
			}).on("mouseout", function(e) {
			helpElement.hide();
		});

		if (insertAfter) {
			if (!customToggleElement) {
				element.after(toggleElement);
			}
			appendToElement.after(helpElement);
		} else {
			if (!customToggleElement) {
				element.append(toggleElement);
			}
			appendToElement.append(helpElement);
		}

		helpElement.css(helpElementCss);

		return createdElements;
	},
	refreshPositionsForCurrentlyActiveSortable: function() {

		if (Structr.currentlyActiveSortable) {

			Structr.currentlyActiveSortable.sortable({ refreshPositions: true });

			window.setTimeout(function() {
				Structr.currentlyActiveSortable.sortable({ refreshPositions: false });
			}, 500);
		}
	},
	handleGenericMessage: (data) => {

		let showScheduledJobsNotifications = Importer.isShowNotifications();
		let showScriptingErrorPopups       = UISettings.getValueForSetting(UISettings.global.settings.showScriptingErrorPopupsKey);
		let showDeprecationWarningPopups   = UISettings.getValueForSetting(UISettings.global.settings.showDeprecationWarningPopupsKey);

		switch (data.type) {

			case "CSV_IMPORT_STATUS":

				if (StructrWS.me.username === data.username) {

					let titles = {
						BEGIN: 'CSV Import started',
						CHUNK: 'CSV Import status',
						END:   'CSV Import finished'
					};

					let texts = {
						BEGIN: 'Started importing CSV data',
						CHUNK: `Finished importing chunk ${data.currentChunkNo} / ${data.totalChunkNo}`,
						END:   `Finished importing CSV data (Time: ${data.duration})`
					};

					new MessageBuilder().title(titles[data.subtype]).uniqueClass('csv-import-status').updatesText().requiresConfirmation().allowConfirmAll().className((data.subtype === 'END') ? 'success' : 'info').text(texts[data.subtype]).show();
				}
				break;

			case "CSV_IMPORT_WARNING":

				if (StructrWS.me.username === data.username) {
					new MessageBuilder().title(data.title).warning(data.text).requiresConfirmation().allowConfirmAll().show();
				}
				break;

			case "CSV_IMPORT_ERROR":

				if (StructrWS.me.username === data.username) {
					new MessageBuilder().title(data.title).error(data.text).requiresConfirmation().allowConfirmAll().show();
				}
				break;

			case "FILE_IMPORT_STATUS":

				let fileImportTitles = {
					QUEUED:     'Import added to queue',
					BEGIN:      'Import started',
					CHUNK:      'Import status',
					END:        'Import finished',
					WAIT_ABORT: 'Import waiting to abort',
					ABORTED:    'Import aborted',
					WAIT_PAUSE: 'Import waiting to pause',
					PAUSED:     'Import paused',
					RESUMED:    'Import resumed'
				};

				let fileImportTexts = {
					QUEUED:     `Import of <b>${data.filename}</b> will begin after currently running/queued job(s)`,
					BEGIN:      `Started importing data from <b>${data.filename}</b>`,
					CHUNK:      `Finished importing chunk ${data.currentChunkNo} of <b>${data.filename}</b><br>Objects created: ${data.objectsCreated}<br>Time: ${data.duration}<br>Objects/s: ${data.objectsPerSecond}`,
					END:        `Finished importing data from <b>${data.filename}</b><br>Objects created: ${data.objectsCreated}<br>Time: ${data.duration}<br>Objects/s: ${data.objectsPerSecond}`,
					WAIT_ABORT: `The import of <b>${data.filename}</b> will be aborted after finishing the current chunk`,
					ABORTED:    `The import of <b>${data.filename}</b> has been aborted`,
					WAIT_PAUSE: `The import of <b>${data.filename}</b> will be paused after finishing the current chunk`,
					PAUSED:     `The import of <b>${data.filename}</b> has been paused`,
					RESUMED:    `The import of <b>${data.filename}</b> has been resumed`
				};

				if (showScheduledJobsNotifications && StructrWS.me.username === data.username) {

					let msg = new MessageBuilder().title(`${data.jobtype} ${fileImportTitles[data.subtype]}`).className((data.subtype === 'END') ? 'success' : 'info')
						.text(fileImportTexts[data.subtype]).uniqueClass(`${data.jobtype}-import-status-${data.filepath}`);

					if (data.subtype !== 'QUEUED') {
						msg.updatesText().requiresConfirmation().allowConfirmAll();
					}

					msg.show();
				}

				if (Structr.isModuleActive(Importer)) {
					Importer.updateJobTable();
				}
				break;

			case "FILE_IMPORT_EXCEPTION":

				if (showScheduledJobsNotifications && StructrWS.me.username === data.username) {

					let text = data.message;
					if (data.message !== data.stringvalue) {
						text += '<br>' + data.stringvalue;
					}

					new MessageBuilder().title(`Exception while importing ${data.jobtype}`).error(`File: ${data.filepath}<br>${text}`).requiresConfirmation().allowConfirmAll().show();
				}

				if (Structr.isModuleActive(Importer)) {
					Importer.updateJobTable();
				}
				break;

			case "SCRIPT_JOB_STATUS":

				let scriptJobTitles = {
					QUEUED: 'Script added to queue',
					BEGIN:  'Script started',
					END:    'Script finished'
				};
				let scriptJobTexts = {
					QUEUED: `Script job #${data.jobId} will begin after currently running/queued job(s)`,
					BEGIN:  `Started script job #${data.jobId}${((data.jobName.length > 0) ? ` (${data.jobName})` : '')}`,
					END:    `Finished script job #${data.jobId}${((data.jobName.length > 0) ? ` (${data.jobName})` : '')}`
				};

				if (showScheduledJobsNotifications && StructrWS.me.username === data.username) {

					let msg = new MessageBuilder().title(scriptJobTitles[data.subtype]).className((data.subtype === 'END') ? 'success' : 'info').text(`<div>${scriptJobTexts[data.subtype]}</div>`).uniqueClass(`${data.jobtype}-${data.subtype}`).appendsText();

					if (data.subtype !== 'QUEUED') {
						msg.requiresConfirmation().allowConfirmAll();
					}

					msg.show();
				}

				if (Structr.isModuleActive(Importer)) {
					Importer.updateJobTable();
				}
				break;

			case 'DEPLOYMENT_IMPORT_STATUS':
			case 'DEPLOYMENT_DATA_IMPORT_STATUS': {

				let type            = 'Deployment Import';
				let messageCssClass = 'deployment-import';

				if (data.type === 'DEPLOYMENT_DATA_IMPORT_STATUS') {
					type            = 'Data Deployment Import';
					messageCssClass = 'data-deployment-import';
				}

				if (data.subtype === 'BEGIN') {

					let text = `${type} started: ${new Date(data.start)}<br>
						Importing from: <span class="deployment-source">${data.source}</span><br><br>
						Please wait until the import process is finished. Any changes made during a deployment might get lost or conflict with the deployment! This message will be updated during the deployment process.<br><ol class="message-steps"></ol>
					`;

					new MessageBuilder().title(`${type} Progress`).uniqueClass(messageCssClass).info(text).requiresConfirmation().updatesText().show();

				} else if (data.subtype === 'PROGRESS') {

					new MessageBuilder().title(`${type} Progress`).uniqueClass(messageCssClass).info(`<li>${data.message}</li>`).requiresConfirmation().appendsText('.message-steps').show();

				} else if (data.subtype === 'END') {

					let text = `<br>${type} finished: ${new Date(data.end)}<br>
						Total duration: ${data.duration}<br><br>
						Reload the page to see the new data.`;

					new MessageBuilder().title(`${type} finished`).uniqueClass(messageCssClass).success(text).specialInteractionButton('Reload Page', () => { location.reload(); }, 'Ignore').appendsText().updatesButtons().show();

				}
				break;
			}

			case 'DEPLOYMENT_EXPORT_STATUS':
			case 'DEPLOYMENT_DATA_EXPORT_STATUS': {

				let type            = 'Deployment Export';
				let messageCssClass = 'deployment-export';

				if (data.type === 'DEPLOYMENT_DATA_EXPORT_STATUS') {
					type            = 'Data Deployment Export';
					messageCssClass = 'data-deployment-export';
				}

				if (data.subtype === 'BEGIN') {

					let text = `${type} started: ${new Date(data.start)}<br>
						Exporting to: <span class="deployment-target">${data.target}</span><br><br>
						System performance may be affected during Export.<br><ol class="message-steps"></ol>
					`;

					new MessageBuilder().title(type + ' Progress').uniqueClass(messageCssClass).info(text).requiresConfirmation().updatesText().show();

				} else if (data.subtype === 'PROGRESS') {

					new MessageBuilder().title(type + ' Progress').uniqueClass(messageCssClass).info(`<li>${data.message}</li>`).requiresConfirmation().appendsText('.message-steps').show();

				} else if (data.subtype === 'END') {

					let text = `<br>${type} finished: ${new Date(data.end)}<br>Total duration: ${data.duration}`;

					new MessageBuilder().title(type + ' finished').uniqueClass(messageCssClass).success(text).appendsText().requiresConfirmation().show();

				}
				break;
			}

			case "SCHEMA_ANALYZE_STATUS":

				if (data.subtype === 'BEGIN') {

					let text = `Schema Analysis started: ${new Date(data.start)}<br>
						Please wait until the import process is finished. This message will be updated during the process.<br>
						<ol class="message-steps"></ol>
					`;

					new MessageBuilder().title('Schema Analysis progress').uniqueClass('schema-analysis').info(text).requiresConfirmation().updatesText().show();

				} else if (data.subtype === 'PROGRESS') {

					new MessageBuilder().title('Schema Analysis progress').uniqueClass('schema-analysis').info(`<li>${data.message}</li>`).requiresConfirmation().appendsText('.message-steps').show();

				} else if (data.subtype === 'END') {

					let text = `<br>Schema Analysis finished: ${new Date(data.end)}<br>Total duration: ${data.duration}`;

					new MessageBuilder().title("Schema Analysis finished").uniqueClass('schema-analysis').success(text).appendsText().requiresConfirmation().show();

				}
				break;

			case "CERTIFICATE_RETRIEVAL_STATUS":

				if (data.subtype === 'BEGIN') {

					let text = `Process to retrieve a Let's Encrypt certificate via ACME started: ${new Date(data.start)}<br>
						This will take a couple of seconds. This message will be updated during the process.<br>
						<ol class='message-steps'></ol>
					`;

					new MessageBuilder().title("Certificate retrieval progress").uniqueClass('cert-retrieval').info(text).requiresConfirmation().updatesText().show();

				} else if (data.subtype === 'PROGRESS') {

					new MessageBuilder().title("Certificate retrieval progress").uniqueClass('cert-retrieval').info(`<li>${data.message}</li>`).requiresConfirmation().appendsText('.message-steps').show();

				} else if (data.subtype === 'END') {

					let text = `<br>Certificate retrieval process finished: ${new Date(data.end)}<br>Total duration: ${data.duration}`;

					new MessageBuilder().title("Certificate retrieval finished").uniqueClass('cert-retrieval').success(text).appendsText().requiresConfirmation().show();

				} else if (data.subtype === 'WARNING') {

					new MessageBuilder().title("Certificate retrieval progress").warning(data.message).uniqueClass('cert-retrieval').requiresConfirmation().allowConfirmAll().show();
				}

				break;

			case "MAINTENANCE":

				let enabled = data.enabled ? 'enabled' : 'disabled';

				new MessageBuilder().title(`Maintenance Mode ${enabled}`).warning(`Maintenance Mode has been ${enabled}.<br><br> Redirecting...`).allowConfirmAll().show();

				window.setTimeout(function() {
					location.href = data.baseUrl + location.pathname + location.search;
				}, 1500);
				break;

			case "WARNING":
				new MessageBuilder().title(data.title).warning(data.message).requiresConfirmation().allowConfirmAll().show();
				break;

			case "SCRIPT_JOB_EXCEPTION":
				new MessageBuilder().title('Exception in Scheduled Job').warning(data.message).requiresConfirmation().allowConfirmAll().show();
				break;

			case "RESOURCE_ACCESS":

				let builder = new MessageBuilder().title(`REST Access to '${data.uri}' denied`).warning(data.message).requiresConfirmation().allowConfirmAll();

				builder.specialInteractionButton('Go to Security and create Grant', function (btn) {

					let maskIndex = (data.validUser ? 'AUTH_USER_' : 'NON_AUTH_USER_') + data.method.toUpperCase();
					let flags     = _ResourceAccessGrants.mask[maskIndex] || 0;

					let additionalData = {};

					if (data.validUser === true) {
						additionalData.visibleToAuthenticatedUsers = true;
					} else {
						additionalData.visibleToPublicUsers = true;
					}

					_ResourceAccessGrants.createResourceAccessGrant(data.signature, flags, null, additionalData);

					let resourceAccessKey = 'resource-access';

					let grantPagerConfig = LSWrapper.getItem(_Pager.pagerDataKey + resourceAccessKey);
					if (!grantPagerConfig) {
						grantPagerConfig = {
							id: resourceAccessKey,
							type: resourceAccessKey,
							page: 1,
							pageSize: 25,
							sort: "signature",
							order: "asc"
						};
					} else {
						grantPagerConfig = JSON.parse(grantPagerConfig);
					}
					grantPagerConfig.filters = {
						flags: false,
						signature: data.signature
					};

					LSWrapper.setItem(_Pager.pagerDataKey + resourceAccessKey, JSON.stringify(grantPagerConfig));

					if (Structr.getActiveModule()._moduleName === _Security._moduleName) {
						_Security.selectTab(resourceAccessKey);
					} else {
						LSWrapper.setItem(_Security.securityTabKey, resourceAccessKey);
						window.location.href = '#security';
					}
				}, 'Dismiss');

				builder.show();

				break;

			case "SCRIPTING_ERROR":

				if (showScriptingErrorPopups) {

					if (data.nodeId && data.nodeType) {

						Command.get(data.nodeId, 'id,type,name,content,ownerDocument,schemaNode', function (obj) {

							let name     = data.name.slice(data.name.indexOf('_html_') === 0 ? 6 : 0);
							let property = 'Property';
							let title    = '';

							switch (obj.type) {

								case 'SchemaMethod':
								    if (obj.schemaNode && data.isStaticMethod) {
								        title = 'type "' + data.staticType + '"';
								        property ='StaticMethod';
								    } else if (obj.schemaNode) {
										title = 'type "' + obj.schemaNode.name + '"';
										property = 'Method';
									} else {
										title = 'global schema method';
										property = 'Method';
									}
									break;

								default:
									if (obj.ownerDocument) {
										if (obj.ownerDocument.type === 'ShadowDocument') {
											title = 'shared component';
										} else {
											title = 'page "' + obj.ownerDocument.name  + '"';
										}
									}
									break;
							}

							let location = `
								<table class="scripting-error-location">
									<tr>
										<th>Element:</th>
										<td class="pl-2">${data.nodeType}[${data.nodeId}]</td>
									</tr>
									<tr>
										<th>${property}:</th>
										<td class="pl-2">${name}</td>
									</tr>
									<tr>
										<th>Row:</th>
										<td class="pl-2">${data.row}</td>
									</tr>
									<tr>
										<th>Column:</th>
										<td class="pl-2">${data.column}</td>
									</tr>
								</table>
								<br>
								${data.message}
							`;

							let builder = new MessageBuilder().uniqueClass(`n${data.nodeId}${data.nodeType}${data.row}${data.column}`).incrementsUniqueCount(true).title(`Scripting error in ${title}`).warning(location).requiresConfirmation();

							if (data.nodeType === 'SchemaMethod') {

								let pathToOpen = (obj.schemaNode) ? `custom--${obj.schemaNode.id}-methods-${obj.id}` : `globals--${obj.id}`;

								builder.specialInteractionButton('Go to method', function(btn) {
									window.location.href = '#code';
									window.setTimeout(() => {
										_Code.findAndOpenNode(pathToOpen, false);
									}, 1000);
								}, 'Dismiss');

							} else if (data.nodeType === 'SchemaProperty') {

								let pathToOpen = (obj.schemaNode) ? `custom--${obj.schemaNode.id}-properties-${obj.id}` : `globals--${obj.id}`;

								builder.specialInteractionButton('Go to property', function(btn) {
									window.location.href = '#code';
									window.setTimeout(function() {
										_Code.findAndOpenNode(pathToOpen, false);
									}, 1000);
								}, 'Dismiss');

							} else {

								builder.specialInteractionButton('Open in editor', function(btn) {

									switch (data.nodeType) {
										case 'Content':
										case 'Template':
											_Elements.openEditContentDialog(obj);
											break;
										default:
											_Entities.showProperties(obj);
											break;
									}

									// open and select element in tree
									let structrId = obj.id;
									_Entities.deselectAllElements();

									if (!Structr.node(structrId)) {
										_Pages.expandTreeNode(structrId);
									} else {
										let treeEl = Structr.node(structrId);
										if (treeEl) {
											_Entities.highlightElement(treeEl);
										}
									}

									LSWrapper.setItem(_Entities.selectedObjectIdKey, structrId);

								}, 'Dismiss');
							}

							// show message
							builder.allowConfirmAll().show();
						});

					} else {
						new MessageBuilder().title('Server-side Scripting Error').warning(data.message).requiresConfirmation().allowConfirmAll().show();
					}
				}
				break;

			case "DEPRECATION": {

				if (showDeprecationWarningPopups) {

					let uniqueClass = 'deprecation-warning-' + data.nodeId;

					let builder = new MessageBuilder().uniqueClass(uniqueClass).incrementsUniqueCount(true).title(data.title).warning(data.message).requiresConfirmation();

					if (data.subtype === 'EDIT_MODE_BINDING') {

						if (data.nodeId) {

							Command.get(data.nodeId, 'id,type,name,content,ownerDocument', (obj) => {

								let title = '';

								switch (obj.type) {

									default:
										if (obj.ownerDocument) {
											if (obj.ownerDocument.type === 'ShadowDocument') {
												title = 'Shared component';
											} else {
												title = 'Page "' + obj.ownerDocument.name + '"';
											}
										}
										break;
								}

								if (title != '') {
									builder.warning(data.message + '<br><br>Soure: ' + title);
								}

								builder.specialInteractionButton('Go to element in page tree', function (btn) {

									// open and select element in tree
									let structrId = obj.id;
									_Entities.deselectAllElements();

									if (!Structr.node(structrId)) {
										_Pages.expandTreeNode(structrId);
									} else {
										let treeEl = Structr.node(structrId);
										if (treeEl) {
											_Entities.highlightElement(treeEl);
										}
									}

									LSWrapper.setItem(_Entities.selectedObjectIdKey, structrId);

								}, 'Dismiss');

								builder.allowConfirmAll().show();
							});
						} else {
							builder.allowConfirmAll().show();
						}
					} else {
						builder.allowConfirmAll().show();
					}
				}
				break;
			}

			default: {

				let text = `
					<p>No handler for generic message of type <b>${data.type}</b> defined - printing complete message data.</p>
					${Object.entries(data).map(([key, value]) => `<b>${key}</b>:${data[key]}<br>`).join('')}
				`;

				new MessageBuilder().title("GENERIC_MESSAGE").warning(text).requiresConfirmation().show();

			}
		}
	},
	activateCommentsInElement: function(elem, defaults) {

		$('[data-comment]', elem).each(function(idx, el) {

			let $el = $(el);

			if (!$el.data('commentApplied')) {

				$el.data('commentApplied', true);

				let config = {
					text: $el.data("comment"),
					element: $el,
					css: {
						"margin": "0 4px",
						"vertical-align": "top"
					}
				};

				let elCommentConfig = $el.data('commentConfig') || {};

				// base config is overridden by the defaults parameter which is overridden by the element config
				let infoConfig = Object.assign(config, defaults, elCommentConfig);
				Structr.appendInfoTextToElement(infoConfig);
			}
		});

	},
	blockUiGeneric: function(html, timeout) {
		Structr.loadingSpinnerTimeout = window.setTimeout(function() {

			$.blockUI({
				fadeIn: 0,
				fadeOut: 0,
				message: html,
				forceInput: true,
				css: Structr.defaultBlockUICss
			});
		}, timeout || 0);
	},
	unblockUiGeneric: function() {
		window.clearTimeout(Structr.loadingSpinnerTimeout);
		Structr.loadingSpinnerTimeout = undefined;

		$.unblockUI({
			fadeOut: 0
		});
	},
	showLoadingSpinner: () => {
		Structr.blockUiGeneric('<div id="structr-loading-spinner">' + _Icons.getSvgIcon('waiting-spinner', 36, 36) + '</div>');
	},
	hideLoadingSpinner: () => {
		Structr.unblockUiGeneric();
	},
	showLoadingMessage: (title, text, timeout) => {

		let messageTitle = title || 'Executing Task';
		let messageText  = text || 'Please wait until the operation has finished...';

		$('#tempInfoBox .infoMsg').html(`<div class="flex items-center justify-center">${_Icons.getSvgIcon('waiting-spinner', 24, 24, 'mr-2')}<b>${messageTitle}</b></div><br>${messageText}`);

		$('#tempInfoBox .closeButton').hide();
		Structr.blockUiGeneric($('#tempInfoBox'), timeout || 500);
	},
	hideLoadingMessage: () => {
		Structr.unblockUiGeneric();
	},

	nonBlockUIBlockerId: 'non-block-ui-blocker',
	nonBlockUIBlockerContentId: 'non-block-ui-blocker-content',
	showNonBlockUILoadingMessage: function(title, text) {

		let messageTitle = title || 'Executing Task';
		let messageText  = text || 'Please wait until the operation has finished...';

		let pageBlockerDiv = $('<div id="' + Structr.nonBlockUIBlockerId +'"></div>');
		let messageDiv     = $('<div id="' + Structr.nonBlockUIBlockerContentId +'"></div>');
		messageDiv.html(`<div class="flex items-center justify-center">${_Icons.getSvgIcon('waiting-spinner', 24, 24, 'mr-2')}<b>${messageTitle}</b></div><br>${messageText}`);

		$('body').append(pageBlockerDiv);
		$('body').append(messageDiv);
	},
	hideNonBlockUILoadingMessage: function() {
		$('#' + Structr.nonBlockUIBlockerId).remove();
		$('#' + Structr.nonBlockUIBlockerContentId).remove();
	},
	getDocumentationURLForTopic: function (topic) {
		switch (topic) {
			case 'security':       return 'https://docs.structr.com/docs/security';
			case 'schema-enum':    return 'https://docs.structr.com/docs/troubleshooting-guide#enum-property';
			case 'schema':         return 'https://docs.structr.com/docs/schema';
			case 'pages':          return 'https://docs.structr.com/docs/pages';
			case 'flows':          return 'https://docs.structr.com/docs/flow-engine---editor';
			case 'files':          return 'https://docs.structr.com/docs/files';
			case 'dashboard':      return 'https://docs.structr.com/docs/the-dashboard';
			case 'crud':           return 'https://docs.structr.com/docs/data';

			case 'contents':
			case 'crawler':
			case 'mail-templates':
			case 'virtual-types':
			case 'localization':
			case 'graph':
			default:
				return 'https://docs.structr.com/';
		}
	},
	getShadowPage: function(callback) {

		if (_Pages.shadowPage) {

			if (callback) {
				callback();
			}

		} else {

			// wrap getter for shadowdocument in listComponents so we're sure that shadow document has been created
			Command.listComponents(1, 1, 'name', 'asc', function(result) {
				Command.getByType('ShadowDocument', 1, 1, null, null, null, true, function(entities) {
					_Pages.shadowPage = entities[0];

					if (callback) {
						callback();
					}
				});
			});
		}
	},
	createSingleDOMElementFromHTML: (html) => {
		let elements = Structr.createDOMElementsFromHTML(html);
		return elements[0];
	},
	createDOMElementsFromHTML: (html) => {
		// use template element so we can create arbitrary HTML which is not parsed but not rendered (otherwise tr/td and some other elements would not work)
		let dummy = document.createElement('template');
		dummy.innerHTML = html;

		return dummy.content.children;
	},
	showAvailableIcons: () => {

		Structr.dialog('Icons');

		dialogText.html(`<div class="flex items-start">
			<div class="flex-grow">
				<h3>Sprite Icons</h3>
				<table>
					${Object.keys(_Icons).filter((key) => (typeof _Icons[key] === "string")).map((key) => `<tr><td>${key}</td><td><i class="${_Icons.getFullSpriteClass(_Icons[key])}"></i></td></tr>`).join('')}
				</table>
			</div>
			
			<div class="flex-grow">
				<h3>SVG Icons</h3>
				<table>
					${[...document.querySelectorAll('body > svg > symbol')].map(el => `<tr><td>${el.id}</td><td>${_Icons.getSvgIcon(el.id, 24, 24)}</td></tr>`).join('')}
				</table>
			</div>
		</div>`);
	},
	isImage: (contentType) => {
		return (contentType && contentType.indexOf('image') > -1);
	},
	isVideo: (contentType) => {
		return (contentType && contentType.indexOf('video') > -1);
	}
};

Structr.rootUrl = `${Structr.getPrefixedRootUrl('/structr/rest/')}`;
Structr.csvRootUrl = `${Structr.getPrefixedRootUrl('/structr/csv/')}`;
Structr.viewRootUrl = `${Structr.getPrefixedRootUrl('/')}`;
Structr.wsRoot = `${Structr.getPrefixedRootUrl('/structr/ws')}`;
Structr.deployRoot = `${Structr.getPrefixedRootUrl('/structr/deploy')}`;

let _TreeHelper = {
	initTree: function(tree, initFunction, stateKey) {
		$(tree).jstree({
			plugins: ["themes", "dnd", "search", "state", "types", "wholerow"],
			core: {
				animation: 0,
				async: true,
				data: initFunction
			},
			state: {
				key: stateKey
			}
		});
	},
	deepOpen: function(tree, element, parentElements, parentKey, selectedNodeId) {
		if (element && element.id) {

			parentElements = parentElements || [];
			parentElements.unshift(element);

			Command.get(element.id, parentKey, function(loadedElement) {
				if (loadedElement && loadedElement[parentKey]) {
					_TreeHelper.deepOpen(tree, loadedElement[parentKey], parentElements, parentKey, selectedNodeId);
				} else {
					_TreeHelper.open(tree, parentElements, selectedNodeId);
				}
			});
		}
	},
	open: function(tree, dirs, selectedNode) {
		if (dirs.length) {
			tree.jstree('deselect_all');

			let openRecursively = function(list) {

				if (list.length > 0) {

					let first = list.shift();

					tree.jstree('open_node', first.id, function() {
						openRecursively(list);
					});

				} else {
					tree.jstree('select_node', selectedNode);
				}
			};

			openRecursively(dirs);
		}

	},
	refreshTree: function(tree, callback) {
		$(tree).jstree('refresh');

		if (typeof callback === "function") {
			window.setTimeout(function() {
				callback();
			}, 500);
		}
	},
	refreshNode: function(tree, node, callback) {
		$(tree).jstree('refresh_node', node);

		if (typeof callback === "function") {
			window.setTimeout(function() {
				callback();
			}, 500);
		}
	},
	makeDroppable: function(tree, list) {
		window.setTimeout(function() {
			list.forEach(function(obj) {
				// only load data necessary for dnd. prevent from loading the complete folder (with its files)
				Command.get(obj.id, 'id,type,isFolder', function(data) {
					StructrModel.createOrUpdateFromData(data, null, false);
					_TreeHelper.makeTreeElementDroppable(tree, obj.id);
				});
			});
		}, 500);
	},
	makeTreeElementDroppable: function(tree, id) {
		let el = $('#' + id + ' > .jstree-wholerow', tree);
		_Dragndrop.makeDroppable(el);
	}
};

function MessageBuilder () {
	this.params = {
		// defaults
		text: 'Default message',
		furtherText: undefined,
		delayDuration: 3000,
		fadeDuration: 1000,
		confirmButtonText: 'Confirm',
		allowConfirmAll: false,
		confirmAllButtonText: 'Confirm all...',
		classNames: ['message'],
		uniqueClass: undefined,
		uniqueCount: 1,
		updatesText: false,
		updatesButtons: false,
		appendsText: false,
		appendSelector: '',
		incrementsUniqueCount: false
	};

	this.requiresConfirmation = function(confirmButtonText) {
		this.params.requiresConfirmation = true;

		if (confirmButtonText) {
			this.params.confirmButtonText = confirmButtonText;
		}

		return this;
	};

	this.allowConfirmAll = function(confirmAllButtonText) {
		this.params.allowConfirmAll = true;

		if (confirmAllButtonText) {
			this.params.confirmAllButtonText = confirmAllButtonText;
		}

		return this;
	};

	this.title = function(title) {
		this.params.title = title;
		return this;
	};

	this.text = function(text) {
		this.params.text = text;
		return this;
	};

	this.furtherText = function(furtherText) {
		this.params.furtherText = furtherText;
		return this;
	};

	this.error = function(text) {
		this.params.text = text;
		return this.className('error');
	};

	this.warning = function(text) {
		this.params.text = text;
		return this.className('warning');
	};

	this.info = function(text) {
		this.params.text = text;
		return this.className('info');
	};

	this.success = function(text) {
		this.params.text = text;
		return this.className('success');
	};

	this.delayDuration = function(delayDuration) {
		this.params.delayDuration = delayDuration;
		return this;
	};

	this.fadeDuration = function(fadeDuration) {
		this.params.fadeDuration = fadeDuration;
		return this;
	};

	this.className = function(className) {
		this.params.classNames.push(className);
		return this;
	};

	this.delayDuration = function(delayDuration) {
		this.params.delayDuration = delayDuration;
		return this;
	};

	this.getButtonHtml = function() {
		return (this.params.requiresConfirmation ? '<button class="confirm">' + this.params.confirmButtonText + '</button>' : '') +
			(this.params.requiresConfirmation && this.params.allowConfirmAll ? '<button class="confirmAll">' + this.params.confirmAllButtonText + '</button>' : '') +
			(this.params.specialInteractionButton ? '<button class="special">' + this.params.specialInteractionButton.text + '</button>' : '');
	};

	this.activateButtons = function(originalMsgBuilder, newMsgBuilder) {

		if (newMsgBuilder.params.requiresConfirmation === true) {

			$('#' + originalMsgBuilder.params.msgId).find('button.confirm').click(function() {
				$(this).remove();
				originalMsgBuilder.hide();
			});

			if (newMsgBuilder.params.allowConfirmAll === true) {

				$('#info-area button.confirmAll').click(function() {
					$('#info-area button.confirm').click();
				});
			}

		} else {

			window.setTimeout(function() {
				originalMsgBuilder.hide();
			}, this.params.delayDuration);

			$('#' + newMsgBuilder.params.msgId).click(function() {
				originalMsgBuilder.hide();
			});

		}

		if (newMsgBuilder.params.specialInteractionButton) {

			$('#' + originalMsgBuilder.params.msgId).find('button.special').click(function() {
				if (newMsgBuilder.params.specialInteractionButton) {
					newMsgBuilder.params.specialInteractionButton.action();

					originalMsgBuilder.hide();
				}
			});
		}
	};

	this.show = function() {

		var uniqueMessageAlreadyPresented = false;

		if (this.params.uniqueClass) {
			// find existing one
			var existingMsgBuilder = $('#info-area .message.' + this.params.uniqueClass).data('msgbuilder');
			if (existingMsgBuilder) {

				uniqueMessageAlreadyPresented = true;

				if (this.params.incrementsUniqueCount) {
					existingMsgBuilder.incrementUniqueCount();
				}

				$('#' + existingMsgBuilder.params.msgId).attr('class', this.params.classNames.join(' '));

				if (this.params.updatesText) {

					$('#info-area .message.' + this.params.uniqueClass + ' .title').html(this.params.title);
					$('#info-area .message.' + this.params.uniqueClass + ' .text').html(this.params.text);

				} else if (this.params.appendsText) {

					$('#info-area .message.' + this.params.uniqueClass + ' .title').html(this.params.title);

					var selector = '#info-area .message.' + this.params.uniqueClass + ' .text';
					if (this.params.appendSelector !== '') {
						selector += ' ' + this.params.appendSelector;
					}
					$(selector).append(this.params.text);

				}

				if (this.params.updatesButtons) {

					$('#info-area .message.' + this.params.uniqueClass + ' .message-buttons').empty().html(this.getButtonHtml());
					this.activateButtons(existingMsgBuilder, this);
				}
			}
		}

		if (uniqueMessageAlreadyPresented === false) {

			this.params.msgId = 'message_' + (Structr.msgCount++);

			$('#info-area').append(`
				<div class="${this.params.classNames.join(' ')}" id="${this.params.msgId}">
				${(this.params.title ? `<h3 class="title">${this.params.title}${this.getUniqueCountElement()}</h3>` : this.getUniqueCountElement())}
				<div class="text">${this.params.text}</div>
				${(this.params.furtherText ? `<div class="furtherText">${this.params.furtherText}</div>` : '')}
				<div class="message-buttons">${this.getButtonHtml()}</div>
				</div>
			`);

			$('#' + this.params.msgId).data('msgbuilder', this);

			this.activateButtons(this, this);
		}
	};

	this.hide = function() {
		$('#' + this.params.msgId).animate({
			opacity: 0,
			height: 0
		}, {
			duration: this.params.fadeDuration,
			complete: function() {
				$(this).remove();
			}
		});
	};

	this.specialInteractionButton = function(buttonText, callback, confirmButtonText) {

		this.params.specialInteractionButton = {
			text: buttonText,
			action: callback
		};

		if (confirmButtonText) {
			return this.requiresConfirmation(confirmButtonText);
		} else {
			this.params.requiresConfirmation = true;
			return this;
		}
	};

	this.uniqueClass = function(className) {
		if (className) {
			className = className.replace(/[\/\. ]/g, "_");
			this.params.uniqueClass = className;
			return this.className(className);
		}
		return this;
	};

	this.incrementsUniqueCount = function() {
		this.params.incrementsUniqueCount = true;
		return this;
	};

	this.updatesText = function() {
		this.params.updatesText = true;
		return this;
	};

	this.updatesButtons = function() {
		this.params.updatesButtons = true;
		return this;
	};

	this.appendsText = function(selector) {
		this.params.appendsText    = true;
		this.params.appendSelector = selector || '';
		return this;
	};

	this.getUniqueCountElement = function() {
		return ' <b class="uniqueCount">' + ((this.params.uniqueCount > 1) ? '(' + this.params.uniqueCount + ') ' : '') + '</b> ';
	};

	this.incrementUniqueCount = function() {
		this.params.uniqueCount++;
		$('#' + this.params.msgId).find('b.uniqueCount').replaceWith(this.getUniqueCountElement());
	};

	return this;
}

let UISettings = {
	getValueForSetting: (setting) => {
		return LSWrapper.getItem(setting.storageKey, setting.defaultValue);
	},
	setValueForSetting: (setting, value, container) => {
		LSWrapper.setItem(setting.storageKey, value);

		if (container) {
			blinkGreen(container);
			setting.onUpdate?.();
		}
	},
	getSettings: (section) => {

		if (!section) {
			// no section given - return all
			return [UISettings.global, UISettings.pages, UISettings.security, UISettings.importer];

		} else {

			let settings = UISettings[section];
			if (settings) {
				return settings;
			}
		}

		return null;
	},
	showSettingsForCurrentModule: () => {

		let moduleSettings = UISettings.getSettings(Structr.getActiveModuleName());
		if (moduleSettings) {

			let dropdown = Structr.createSingleDOMElementFromHTML(`<div id="ui-settings-popup" class="dropdown-menu darker-shadow-dropdown dropdown-menu-large">
				<button class="btn dropdown-select">
					${_Icons.getSvgIcon('ui_configuration_settings')}
				</button>
				<div class="dropdown-menu-container" style=display: none;"></div>
			</div>`);

			let container = dropdown.querySelector('.dropdown-menu-container');

			let globalSettings = UISettings.getSettings('global');

			UISettings.appendSettingsSectionToContainer(globalSettings, container);
			UISettings.appendSettingsSectionToContainer(moduleSettings, container);

			Structr.functionBar.appendChild(dropdown);
		}
	},
	appendSettingsSectionToContainer: (section, container) => {

		let sectionDOM = Structr.createSingleDOMElementFromHTML(`<div><div class="font-bold pt-4 pb-2">${section.title}</div></div>`);

		for (let [settingKey, setting] of Object.entries(section.settings)) {
			UISettings.appendSettingToContainer(setting, sectionDOM);
		}

		container.appendChild(sectionDOM);
	},
	appendSettingToContainer: (setting, container) => {

		switch (setting.type) {

			case 'checkbox': {

				let settingDOM = Structr.createSingleDOMElementFromHTML(`<label class="flex items-center p-1"><input type="checkbox"> ${setting.text}</label>`);

				let input = settingDOM.querySelector('input');
				input.checked = UISettings.getValueForSetting(setting);

				input.addEventListener('change', () => {
					UISettings.setValueForSetting(setting, input.checked, input.parentElement);
				});

				container.appendChild(settingDOM);

				break;
			}

			default: {
				console.log('ERROR! Unable to render setting:', setting, container);
			}
		}
	},
	global: {
		title: 'Global',
		settings: {
			showScriptingErrorPopupsKey: {
				text: 'Show popups for scripting errors',
				storageKey: 'showScriptinErrorPopups' + location.port,
				defaultValue: true,
				type: 'checkbox'
			},
			showDeprecationWarningPopupsKey: {
				text: 'Show popups for deprecation warnings',
				storageKey: 'showDeprecationWarningPopups' + location.port,
				defaultValue: true,
				type: 'checkbox'
			},
		}
	},
	pages: {
		title: 'Pages',
		settings: {
			inheritVisibilityFlagsKey: {
				text: 'Inherit Visibility Flags (when creating new elements from the context menu)',
				storageKey: 'inheritVisibilityFlags_' + location.port,
				defaultValue: false,
				type: 'checkbox'
			},
			favorEditorForContentElementsKey: {
				text: 'Always favor editor for content elements in Pages area (otherwise last used is picked)',
				storageKey: 'favorEditorForContentElements' + location.port,
				defaultValue: true,
				type: 'checkbox'
			},
			favorHTMLForDOMNodesKey: {
				text: 'Always favor HTML tab for DOM nodes in Pages area (otherwise last used is picked)',
				storageKey: 'favorHTMLForDOMNodes' + location.port,
				defaultValue: true,
				type: 'checkbox'
			}
		}
	},
	security: {
		title: 'Security',
		settings: {
			showVisibilityFlagsInGrantsTableKey: {
				text: 'Show visibility flags in Resource Access Grants table',
				storageKey: 'showVisibilityFlagsInResourceAccessGrantsTable' + location.port,
				defaultValue: false,
				type: 'checkbox',
				onUpdate: () => {
					if (Structr.isModuleActive(_Security)) {
						_ResourceAccessGrants.refreshResourceAccesses();
					}
				}
			}
		}
	},
	importer: {
		title: 'Importer',
		settings: {
			showNotificationsKey: {
				text: 'Show notifications for scheduled jobs',
				storageKey: 'structrImporterShowNotifications_' + location.port,
				defaultValue: true,
				type: 'checkbox'
			}
		}
	}
};

function formatKey(text) {
	// don't format custom 'data-*' attributes
	if (text.startsWith('data-')) {
		return text;
	}
	var result = '';
	for (var i = 0; i < text.length; i++) {
		var c = text.charAt(i);
		if (c === c.toUpperCase()) {
			result += ' ' + c;
		} else {
			result += (i === 0 ? c.toUpperCase() : c);
		}
	}
	return result;
}

var keyEventBlocked = true;
var keyEventTimeout;

window.addEventListener('beforeunload', (event) => {
	if (event.target === document) {

		let activeModule = Structr.getActiveModule();
		if (activeModule && activeModule.beforeunloadHandler && typeof activeModule.beforeunloadHandler === "function") {
			let ret = activeModule.beforeunloadHandler();
			if (ret) {
				event.returnValue = ret;
			}
			// persist last menu entry
			LSWrapper.setItem(Structr.lastMenuEntryKey, Structr.lastMenuEntry);
		}

		// Remove dialog data in case of page reload
		LSWrapper.removeItem(Structr.dialogDataKey);
		LSWrapper.save();
	}
});