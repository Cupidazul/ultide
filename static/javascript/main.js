document.onreadystatechange = function($) {
    console.log('@index:main: ', { readyState: document.readyState, this: globalThis });

    if (document.readyState === 'interactive') {
        require.config({
            map: {
                '*': {
                    'css': 'static/plugins/require-css/css',
                }
            },
            paths: {
                'text': 'static/plugins/require.js/lib/text',
                'json': 'static/plugins/require.js/lib/json',
                'jquery': 'static/plugins/jquery/jquery-2.2.4.min',
                'jquery-ui': 'static/plugins/jquery-ui/jquery-ui.min',
                'socket-io': 'static/javascript/socket.io.min',
                'bootstrap': 'static/plugins/bootstrap/js/bootstrap.min',

                'app': 'static/javascript/ult.app',
                'helper': 'static/javascript/ult.helper',
                'main-view': 'static/javascript/jquery.ult.main_view',
                'file_chooser': 'static/javascript/jquery.ult.file_chooser',
                'main-nav-bar': 'static/javascript/jquery.ult.main_nav_bar',
            }
        });

        require(['text', 'json!package.json', 'jquery', 'app', 'main-nav-bar', 'main-view'], function(undefined, pkg, $, app) {
            console.log('@static/main: init[' + app.request_id + ']:', { $: $, app: app, pkg: pkg, readyState: document.readyState });

            app.start(function() {
                console.log('@static/main: app.start[' + app.request_id + ']:', { $: $, app: app, pkg: pkg, readyState: document.readyState });

                if (!app.data.AppInited) {
                    var user = { username: '', avatar: './favicon.ico' };
                    try { user = app.user; } catch (er) {}

                    var $mainNavBar = $('.main-nav-bar');
                    $mainNavBar.main_nav_bar();
                    app.ui.mainNavBar = $mainNavBar;
                    app.pkg = pkg;

                    var $mainView = $('.main-view');
                    $mainView.main_view();
                    app.ui.mainView = $mainView;

                    var HelloUserMSg = '';
                    HelloUserMSg = 'Hello ' + user.username + '! ';
                    var WelcomeMessage = '<h1 style="align:center;">' + HelloUserMSg + 'Welcome to ' + pkg.ProductName + '!</h1>This is a WIP...';
                    $mainView.main_view('createView', 'welcome', $(`<div class="uf-process-main-infos"></div><div id="view_welcome" style="margin-left: 100px; margin-right:100px">${WelcomeMessage}</div>`));
                    $mainView.main_view('showView', 'welcome');

                    $mainNavBar.main_nav_bar('addButton', 'welcome', 'Welcome', '', 0, function() {
                        $mainView.main_view('showView', 'welcome');
                        $mainNavBar.main_nav_bar('activateButton', 'welcome');
                    });
                    $mainNavBar.main_nav_bar('activateButton', 'welcome');

                    $mainView.main_view('createUserBtn', user);

                    app.data.AppInited = true;
                }

                setTimeout(function() {
                    app.sendRequest('get_js', {}, function(data) {
                        require.config({ 'paths': data.require_paths });
                        console.log('@app.start: require:', { data: data });
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