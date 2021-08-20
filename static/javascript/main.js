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
            app = Object.assign(app || {}, app, $app || {}, {
                JSONSafeStringify: JSONSafeStringify,
                lzString: lzString
            });

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
                    setTimeout(function() { addSettingsView.show(); }, 1000);

                    app.data.AppInited = true;
                }

                setTimeout(function() {
                    app.sendRequest('get_js', {}, function(data) {
                        require.config({ 'paths': data.require_paths });
                        if ($app.debug) console.log('@app.start: require:', { data: data });
                        require(data.main_js);
                    });
                }, 1);

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