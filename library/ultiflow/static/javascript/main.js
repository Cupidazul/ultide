define([
    'app',
    'ultiflow-design-view',
    'datatables',
    'json-editor',
    'css!static/modules/ultiflow/css/main',
    'css!static/modules/ultiflow/plugins/jstree/dist/themes/default/style.min',
    'css!static/modules/ultiflow/plugins/jquery.flowchart/jquery.flowchart.min.css',
    'css!static/modules/ultiflow/plugins/datatables/datatables.min.css',
    'css!static/modules/ultiflow/plugins/datatables/dataTables.bootstrap.min.css',
    'css!static/plugins/bootstrap-switch/css/bootstrap-switch.min.css',
], function(app) {
    if ($app.debug) console.log('@library/ultiflow/main: app:', app);
    var self = this;

    var $mainView = app.ui.mainView;
    var $mainNavBar = app.ui.mainNavBar;

    $designView = $('<div id="view_Flowchart" class="uf_design_view"></div>');
    $mainView.main_view('createView', 'flowchart', $designView);

    $mainNavBar.main_nav_bar('addButton', 'flowchart', 'Flowchart', '', 10, function() {
        $mainView.main_view('showView', 'flowchart');
        $mainNavBar.main_nav_bar('activateButton', 'flowchart');
    });

    $designView.uf_design_view();
    $mainView.main_view('showView', 'flowchart');
    $mainNavBar.main_nav_bar('activateButton', 'flowchart');

    $app.ultiflow.$designView = $designView;
    $app.ultiflow.$mainView = $mainView;
    $app.ultiflow.$mainNavBar = $mainNavBar;
});