document.onreadystatechange = function() {

    if (document.readyState === 'interactive') {
        console.log('@index: doc.readyState:' + document.readyState + ' this:', this);
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

        require(['jquery', 'app', 'json!package.json', 'main-nav-bar', 'main-view'], function($, app, pkg) {

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
                console.log('@static/main: app.start:', app, document.readyState);
                setTimeout(function() {
                    app.sendRequest('get_js', {}, function(data) {
                        require.config({ 'paths': data.require_paths });
                        console.log('@app.start: require:', data.require_paths, data.main_js, document.readyState);
                        require(data.main_js);
                    });
                }, 100);
            });

        });
    }

};