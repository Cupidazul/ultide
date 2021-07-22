document.onreadystatechange = function($) {
    console.log('@index:main: ', { readyState: document.readyState, this: this });

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
                'jquery-exist': 'static/plugins/jquery/jquery-plugin-exist.min',
                'socket-io': 'static/javascript/socket.io.min',
                'bootstrap': 'static/plugins/bootstrap/js/bootstrap.min',

                'app': 'static/javascript/ult.app',
                'helper': 'static/javascript/ult.helper',
                'main-view': 'static/javascript/jquery.ult.main_view',
                'file_chooser': 'static/javascript/jquery.ult.file_chooser',
                'main-nav-bar': 'static/javascript/jquery.ult.main_nav_bar',
            }
        });

        require(['jquery', 'app', 'json!package.json', 'jquery-exist', 'main-nav-bar', 'main-view'], function($, app, pkg) {
            console.log('@static/main: init[' + app.request_id + ']:', { $: $, app: app, pkg: pkg, readyState: document.readyState });

            var $mainNavBar = $('.main-nav-bar');
            $mainNavBar.main_nav_bar();
            app.ui.mainNavBar = $mainNavBar;
            app.pkg = pkg;

            var $mainView = $('.main-view');
            $mainView.main_view();
            app.ui.mainView = $mainView;

            var WelcomeMessage = '<h1 style="align:center;">Welcome to ' + pkg.ProductName + '!</h1>This is a WIP...';
            $mainView.main_view('createView', 'welcome', $(`<div style="margin-left: 100px; margin-right:100px">${WelcomeMessage}</div>`));
            $mainView.main_view('showView', 'welcome');

            $mainNavBar.main_nav_bar('addButton', 'welcome', 'Welcome', '', 0, function() {
                $mainView.main_view('showView', 'welcome');
                $mainNavBar.main_nav_bar('activateButton', 'welcome');
            });
            $mainNavBar.main_nav_bar('activateButton', 'welcome');

            app.start(function() {
                console.log('@static/main: app.start:', { app: app, readyState: document.readyState });
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
            alert('@main: onError: type:' + err.requireType + ' modules: ' + err.requireModules + "\n" + JSON.stringify(err));
            //throw err;
            setTimeout(function() { document.location.reload(); }, 1000);
        };
    }

};