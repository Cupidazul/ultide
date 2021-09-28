document.onreadystatechange = function($) {
    if ($app.debug) console.log('@index:main: ', { readyState: document.readyState, this: globalThis });

    if (document.readyState === 'interactive') {
        require.config({
            map: {
                '*': {
                    'css': 'static/plugins/require-css/css.min',
                }
            },
            paths: {
                //'text': 'static/plugins/require.js/lib/text',
                //'json': 'static/plugins/require.js/lib/json',
                'jquery': 'static/plugins/jquery/jquery-2.2.4.min',
                'jquery-ui': 'static/plugins/jquery-ui/jquery-ui.min',
                'socket-io': 'static/javascript/socket.io.min',
                'bootstrap': 'static/plugins/bootstrap/js/bootstrap.min',
                'bootstrap-switch': 'static/plugins/bootstrap-switch/js/bootstrap-switch.min',
                'JSONSafeStringify': 'static/plugins/fast-safe-stringify/index.min',
                'lzString': 'static/plugins/lz-string/libs/lz-string.min',

                'app': 'static/javascript/ult.app',
                'helper': 'static/javascript/ult.helper',
                'main-view': 'static/javascript/jquery.ult.main_view',
                'file_chooser': 'static/javascript/jquery.ult.file_chooser',
                'main-nav-bar': 'static/javascript/jquery.ult.main_nav_bar',
            }
        });

        //require(['text', 'json!package.json', 'jquery', 'app', 'main-nav-bar', 'main-view'], function(undefined, pkg, $, app) {
        //    console.log('@static/main: init[' + app.request_id + ']:', { $: $, app: app, pkg: pkg, readyState: document.readyState });
        require(['jquery', 'app', 'JSONSafeStringify', 'lzString', 'main-nav-bar', 'main-view', 'helper'], function($, app, JSONSafeStringify, lzString) {

            if ($app.debug) console.log('@static/main: init[' + app.request_id + ']:', { $: $, app: app, /*pkg: pkg,*/ readyState: document.readyState });

            app.start(function() {
                if ($app.debug) console.log('@static/main: app.start[' + app.request_id + ']:', { $: $, app: app, /*pkg: pkg,*/ readyState: document.readyState });

                if (!app.data.AppInited) {
                    var user = { username: '', avatar: './favicon.ico' };
                    try { user = app.user; } catch (er) {}

                    var $mainNavBar = $('.main-nav-bar');
                    $mainNavBar.main_nav_bar();
                    app.ui.mainNavBar = $mainNavBar;
                    //app.pkg = pkg;

                    var $mainView = $('.main-view');
                    $mainView.main_view();
                    app.ui.mainView = $mainView;

                    $mainTopBar = $('<div id="rowTopBarRow" class="row"></div>');
                    $mainTopBar.appendTo($mainView);
                    $mainAdminView = $('<div id="rowAdminViewRow" class="row"></div>');
                    $mainAdminView.appendTo($mainView);

                    var HelloUserMSg = '';
                    HelloUserMSg = 'Hello ' + user.username + '! ';
                    var WelcomeMessage = '<h1 style="align:center;">' + HelloUserMSg + 'Welcome to ' + app.pkg.ProductName + '!</h1>This is a WIP...';
                    $mainView.main_view('createViewWelcome', 'welcome', $(`<div class="row mx-auto"><div id="view_welcome" style="margin-left: 100px; margin-right:100px">${WelcomeMessage}</div></div>`));
                    $mainView.main_view('showView', 'welcome');

                    $mainNavBar.main_nav_bar('addButton', 'welcome', 'Settings', '', 0, function() {
                        $mainView.main_view('showView', 'welcome');
                        $mainNavBar.main_nav_bar('activateButton', 'welcome');
                    });
                    $mainNavBar.main_nav_bar('activateButton', 'welcome');

                    $mainView.main_view('createUserBtn', user); // username & avatar info goes in here

                    $mainView.main_view('createViewTopBar', 'TopBar', $(`<div class="uf-process-main-infos" style="position: absolute;z-index:-1;"></div>`));

                    let addSettingsView = $mainView.main_view('addSettingsView', user);

                    setTimeout(async() => {
                        await addSettingsView.show();
                        app.data.AppInited = true;
                    }, 1000);

                }

                setTimeout(function() {
                    app.sendRequest('get_js', {}, function(data) {
                        require.config({ 'paths': data.require_paths });
                        if ($app.debug) console.log('@app.start: require:', { data: data });
                        require(data.main_js);
                    });
                }, 1);

            });

            app.fn = {
                _printAvatar: function(name, _user) {
                    let _avatar_name = (imgSrc) => {
                        try {
                            let imgNm = imgSrc.split('/');
                            let imgID0 = imgNm[imgNm.length - 1].split('.')[0].replace('img_avatar', '');
                            let imgID = String(parseInt(imgID0) + 1);
                            if (imgID0.length > 0) return ' Avatar ' + imgID;
                        } catch (err) {}
                        return '-Avatar-';
                    };
                    let str = '';
                    str += '<div class="dropdown">';
                    str += '   <button id="' + name + '_avatar" type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="min-width: 150px;text-align: left;overflow: hidden;max-height: 34px;">';
                    str += '       <span id="' + name + '_avatar_selected" style="color: darkgray;">' + ((_user.avatar.length > 0) ? '<img class="avatar" src="' + _user.avatar + '">' + (_avatar_name(_user.avatar)) : '-Avatar-') + '</span>';
                    str += '       <span class="caret" style="float: right;margin-top: 5px;"></span>';
                    str += '   </button>';
                    str += '   <ul id="' + name + '_avatar_list" class="dropdown-menu" aria-labelledby="' + name + '_avatar">';
                    str += '       <li><a id="' + name + '_img_avatar0"><img class="avatar" src="./static/modules/ultiflow/images/img_avatar0.png"> Avatar 1</a></li>';
                    str += '       <li><a id="' + name + '_img_avatar1"><img class="avatar" src="./static/modules/ultiflow/images/img_avatar1.png"> Avatar 2</a></li>';
                    str += '       <li><a id="' + name + '_img_avatar2"><img class="avatar" src="./static/modules/ultiflow/images/img_avatar2.png"> Avatar 3</a></li>';
                    str += '       <li><a id="' + name + '_img_avatar3"><img class="avatar" src="./static/modules/ultiflow/images/img_avatar3.png"> Avatar 4</a></li>';
                    str += '       <li><a id="' + name + '_img_avatar4"><img class="avatar" src="./static/modules/ultiflow/images/img_avatar4.png"> Avatar 5</a></li>';
                    str += '       <li><a id="' + name + '_img_avatar5"><img class="avatar" src="./static/modules/ultiflow/images/img_avatar5.png"> Avatar 6</a></li>';
                    str += '   </ul>';
                    str += '</div>';
                    return str;
                },
                _onChangeUpdateAvatar: function(elmName) {
                    $(`#${elmName}_avatar_list > li > a`).each((Idx, element) => {
                        //console.log('@ult.main_view: AvatarList.each', { 'Idx': Idx, 'element': element });
                        $(element).on('click', function(evt) {
                            //let CurrAvatar = (evt.currentTarget.id || evt.currentTarget.nodeName);
                            //console.log('@ult.main_view: Avatar OnClick.each', { '_Idx': _Idx, 'elmName': elmName, 'Idx': Idx, 'element': element, 'evt': evt, 'CurrAvatar': CurrAvatar });
                            $(`#${elmName}_avatar_selected`).html(element.innerHTML);
                            $(`#${elmName}_avatar`).val($('#' + (element.id) + ' > img').attr('src')); // get: $('#settings_avatar').data('avatar_selected')
                            $(`#${elmName}_avatar`).dropdown('toggle');
                            return false;
                        });
                    });
                }
            };

            $app = Object.assign(app || {}, $app || {}, {
                JSONSafeStringify: JSONSafeStringify,
                lzString: lzString
            });

        }, function(err) {
            console.log('@static/main: fn.error:', { error: err });
        });

        requirejs.onError = function(err) {
            console.log('@main: onError:', { error: err });
            //alert('@main: onError: type:' + err.requireType + ' modules: ' + err.requireModules + "\n" + JSON.stringify(err));
            //throw err;
            setTimeout(function() { document.location.reload(); }, 30000);
        };
    }

};