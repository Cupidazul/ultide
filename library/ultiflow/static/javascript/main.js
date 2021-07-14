define([
    'app',
    'ultiflow-design-view',
    'css!static/modules/ultiflow/css/main',
    'css!static/modules/ultiflow/plugins/jstree/dist/themes/default/style.min',
    'css!static/modules/ultiflow/plugins/jquery.flowchart/jquery.flowchart.min.css'
], function(app) {
    console.log('@library/ultiflow/main: app:', app);
    var self = this;

    var $mainView = app.ui.mainView;
    var $mainNavBar = app.ui.mainNavBar;

    $designView = $('<div class="uf_design_view"></div>');
    $mainView.main_view('createView', 'flowchart', $designView);

    $mainNavBar.main_nav_bar('addButton', 'flowchart', 'Flowchart', '', 10, function() {
        $mainView.main_view('showView', 'flowchart');
        $mainNavBar.main_nav_bar('activateButton', 'flowchart');
    });

    $designView.uf_design_view();
    $mainView.main_view('showView', 'flowchart');
    $mainNavBar.main_nav_bar('activateButton', 'flowchart');

    window.$ultiflow.$designView = $designView;
    window.$ultiflow.$mainView = $mainView;
    window.$ultiflow.$mainNavBar = $mainNavBar;
});

var helper = {};
helper.createPanel = function(title, content) {
    var self = this;
    console.log('@library/ultiflow/main: createPanel:', { title: title, content: content });

    var $panel = $('<div class="panel panel-default"></div>');

    var AddButton = '';

    if (title == 'Library') {
        AddButton = `<button id="btn_add_library" class="fas fa-plus" style="float: right;"></button>`;
    }

    if (title == 'Workspace') {
        AddButton = `<button id="btn_add_workspace" class="fas fa-plus" style="float: right;"></button>`;
    }

    var $heading = $('<div class="panel-heading">' + AddButton + '<div>');
    $heading.appendTo($panel);

    var $title = $('<h3 class="panel-title"></h3>');
    $title.text(title);
    $title.appendTo($heading);

    var $content = $('<div class="panel-content"></div>');
    $content.append(content);
    $content.appendTo($panel);

    window.$ultiflow.$panel = [...window.$ultiflow.$panel || [], ...$panel];
    return $panel;
};

helper.treeDataFromOperatorData = function(tree, operators, path) {
    var res = [];
    for (var key in tree) {
        if (tree[key] == true) {
            res.push({
                id: key,
                text: operators[key].title,
                type: operators[key].type
            });
        } else {
            var newPath = path + '-' + key;
            res.push({
                id: newPath,
                text: key,
                children: this.treeDataFromOperatorData(tree[key], operators, newPath)
            });
        }
    }
    window.$ultiflow.$treeData = [...[], ...window.$ultiflow.$treeData || [], ...res];
    return res;
};