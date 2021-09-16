define(['app', 'ultiflow', 'ultiflow-tree'], function(app, ultiflow) {
    $.widget("ultiflow.uf_toolbar", {
        options: {

        },
        els: {
            trees: {
                library: null,
                workspace: null
            }
        },

        // the constructor
        _create: function() {
            var self = this;
            if ($app.debug) console.log('@ultiflow.uf_toolbar: create! readyState:', document.readyState);

            $app.ultiflow.uf_toolbar = self;

            //console.log('ultiflow.uf_toolbar._create:', self);

            this.els.trees.library = $('<div></div>');
            this.element.append(app.helper.createPanel('Library', this.els.trees.library, -1));
            this.els.trees.library.uf_tree();

            this.els.trees.workspace = $('<div></div>');
            this.element.append(app.helper.createPanel('Workspace', this.els.trees.workspace, -1));
            this.els.trees.workspace.uf_tree();

            this.els.trees.workspace.on('select_node.jstree', function(node, selectedInfos, event) {
                var selected = selectedInfos.selected[0];
                if (ultiflow.isOperatorDefined(selected)) {
                    ultiflow.openProcess(selected);
                }
            });

            $(window).resize(function() {
                self._refresh();
            });

            this.element.closest('.uf_design_view').on('on_view_show', function() {
                self._refresh();
            });

            this._refresh();
            setTimeout(() => { this.refreshTrees(); }, 10);
        },

        refreshTrees: function() {
            var self = this;
            ultiflow.getOperators(function(data) {
                var keys = ['library', 'workspace'];
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];

                    var treeData = app.helper.treeDataFromOperatorData(data.tree[key], data.list, key);

                    self.els.trees[key].jstree(true).settings.core.data = treeData;
                    self.els.trees[key].jstree(true).refresh(true);
                }
            });
        },

        _refresh: function() {
            var $leftbar = this.element;
            var $panels = $leftbar.find('.panel');
            var takenHeight = 0;
            var panelsMarginBottom = parseInt($panels.css('margin-bottom'));
            $panels.each(function()  {
                var $this = $(this);
                takenHeight += parseInt($this.find('.panel-heading').outerHeight()) + panelsMarginBottom;
            });
            takenHeight += parseInt($leftbar.css('padding-top')) + parseInt($leftbar.css('padding-bottom')) - panelsMarginBottom;
            var heightPerPanel = (parseInt($leftbar.height()) - takenHeight) / $panels.length;

            $leftbar.find('.panel-content').css('height', heightPerPanel);
        }
    });
});