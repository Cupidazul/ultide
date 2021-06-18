console.log('@index: this:', this);
require.config({
    map: {
        '*': {
            'css': 'static/plugins/require-css/css'
        }
    },
    paths: {
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

require(['jquery', 'app', 'main-nav-bar', 'main-view'], function($, app) {
    var $mainNavBar = $('.main-nav-bar');
    $mainNavBar.main_nav_bar();
    app.ui.mainNavBar = $mainNavBar;

    var $mainView = $('.main-view');
    $mainView.main_view();
    app.ui.mainView = $mainView;

    $mainView.main_view('createView', 'welcome', $('<div style="margin-left: 100px; margin-right:100px"><h1 style="align:center;">Welcome to this Alpha version of UltIDE!</h1>This is a WIP, but since some people asked me to access it, I published it.<br><br>There is nothing to see here for the moment, just click on Flowchart at the left bar.</div>'));
    $mainView.main_view('showView', 'welcome');

    $mainNavBar.main_nav_bar('addButton', 'welcome', 'Welcome', '', 0, function() {
        $mainView.main_view('showView', 'welcome');
        $mainNavBar.main_nav_bar('activateButton', 'welcome');
    });
    $mainNavBar.main_nav_bar('activateButton', 'welcome');


    app.start(function() {
        console.log('@static/main: app.start:', app);
        app.sendRequest('get_js', {}, function(data) {
            require.config({ 'paths': data.require_paths });
            require(data.main_js);
        });
    });
});