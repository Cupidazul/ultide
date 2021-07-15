define(['app', '_', 'bootstrap'], function(app, _, bootstrap) {
    var self = this;
    console.log('@library/ultiflow: app:', app);
    var ultiflow = { data: {}, versions: {}, ui: {} };
    app.ultiflow = ultiflow;

    ultiflow.timeoutChangeLength = 200;

    ultiflow.getAppVersions = function() {
        return app.sendRequest('get_os_versions', {}, function(response) {
            //alert(response['demo_response']);
            setTimeout(function() {
                app.versions = Object.assign(app.versions || {}, { os: response });
                try { app.versions.Browser = navigator.appVersion; } catch (err) { console.log('err:', err); }
                try { app.versions.jstree = jQuery.jstree.version; } catch (err) { console.log('err:', err); }
                try { app.versions.jquery = jQuery.fn.jquery; } catch (err) { console.log('err:', err); }
                try { app.versions['jquery-ui'] = jQuery.ui.version; } catch (err) { console.log('err:', err); }
                try { app.versions.requirejs = requirejs.version; } catch (err) { console.log('err:', err); }
                try { app.versions.bootstrap = jQuery.fn.tooltip.Constructor.VERSION; } catch (err) { console.log('err:', err); }
                try { app.versions.lodash = _.VERSION; } catch (err) { console.log('err:', err); }
                try { app.versions.mousewheel = $.event.special.mousewheel.version; } catch (err) { console.log('err:', err); }

                try { app.versions.os['perl-Modules'] = app.versions.os['perl-Modules'] || ''; } catch (err) { console.log('err:', err); }
                try { app.versions.os['python-Modules'] = app.versions.os['python-Modules'] || ''; } catch (err) { console.log('err:', err); }

                if (app.versions.os['perl-Modules'].charAt(0) === '{') { // if is json
                    app.versions.os['perl-Modules'] = JSON.parse(app.versions.os['perl-Modules']);
                }
                if (app.versions.os['python-Modules'].charAt(0) === '{') { // if is json
                    app.versions.os['python-Modules'] = JSON.parse(app.versions.os['python-Modules']);
                }
                $("#loadingDiv").fadeOut(500, function() {
                    // fadeOut complete. Remove the loading div
                    //$("#loadingDiv").remove(); //makes page more lightweight 
                });
                console.log('@library/ultiflow: app.versions:', app.versions);
                ultiflow.versions = app.versions;
            }, 500);
        });
    };
    ultiflow.getAppVersions();

    ultiflow.getModulesInfos = function(cb) {
        var _self = this;
        if (typeof this.data.modulesInfos == 'undefined') {
            app.sendRequest('modules_infos', {}, function(response) {
                console.log('@library/ultiflow.getModulesInfos:', response);

                _self.data.modulesInfos = response;
                cb(_self.data.modulesInfos);
            });
        } else {
            cb(_self.data.modulesInfos);
        }
    };

    ultiflow.getOperators = function(cb) {
        var _self = this;
        this.getModulesInfos(function() {
            cb(_self.data.modulesInfos.operators);
        });
    };

    ultiflow.isOperatorDefined = function(operator) {
        return typeof this.data.modulesInfos.operators.list[operator] != 'undefined';
    };

    ultiflow.openProcess = function(processId) {
        this.setOpenedProcess(processId);
        this.processData = this.getOpenedProcessData();
        app.triggerEvent('ultiflow::process_open', this.getOpenedProcessData());
    };

    ultiflow.setOpenedProcess = function(processId) {
        this.openedProcess = processId;
        var _self = this;
        app.setUserProperty('ultiflow::opened_process', processId, function(success) {});
    };

    ultiflow.getOpenedProcessData = function() {
        return this.data.modulesInfos.operators.list[this.openedProcess];
    };

    ultiflow.getOperatorInfos = function(operator) {
        return this.data.modulesInfos.operators.list[operator];
    };

    ultiflow.loadFieldType = function(fullname, cb) {
        var _self = this;
        var splittedFullname = fullname.split('::');
        var module = splittedFullname[0];
        var name = splittedFullname[1];
        require(['static/modules/' + module + '/fieldtypes/' + name + '/main'], function(module) {
            if (module == true) {
                cb(_self.getErrorModule());
            } else {
                cb(module);
            }
        });
    };

    ultiflow.treeDataFromOperatorData = function(tree, operators, path) {
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
        return res;
    };

    ultiflow.writeFile = function(path, content, cb) {
        app.sendRequest('write_file', { path: path, content: content }, function(data) {
            if (typeof(data) == 'undefined' || data.error) {
                cb(false);
            } else {
                cb(true);
            }
        });
    };

    ultiflow.saveProcess = function(processId, cb) {
        var operatorData = ultiflow.data.modulesInfos.operators.list[processId];
        //console.log(operatorData);
        if (typeof(operatorData) !== 'undefined') this.writeFile(operatorData.path, JSON.stringify(operatorData), function(success) {
            cb(success);
        });
    };

    ultiflow.saveCurrentProcess = function(cb) {
        this.saveProcess(ultiflow.openedProcess, cb);
    };

    ultiflow.showCurrentProcess = function() {
        var processId = ultiflow.openedProcess;
        var operatorData = ultiflow.data.modulesInfos.operators.list[processId];
        if (operatorData) console.log('operatorData:', operatorData);
    };

    ultiflow.PerlCodeRun = function() {
        var _self = this;
        console.log('jsonPerlCodeRun: processData:', ultiflow.processData);
        if (ultiflow.processData) {
            var data = ultiflow.processData.process; //window.$ultiflow.processData.process;
            var jsonPerlCodeRun = '';

            var operatorObjs = Object.keys(data.operators);
            for (var operatorId in operatorObjs) {
                if (data.operators[operatorId].type && (data.operators[operatorId].type === 'perl_procs::perl_init')) {
                    jsonPerlCodeRun = JSON.stringify(data.parameters[operatorId]);
                    console.log('jsonPerlCodeRun:', { code: jsonPerlCodeRun, oper: data.parameters[operatorId] });
                }
            }

            if (jsonPerlCodeRun !== '' && jsonPerlCodeRun !== '{}') {
                app.sendRequest('perl_CodeRun', { 'cmd': jsonPerlCodeRun /*, 'opts': { del_script: 0 } */ }, function(response) {
                    console.log('PerlCodeRun: ', response);
                    //app.data.versions = Object.assign(app.data.versions || {}, { os: response });
                });
            } else {
                alert('Perl Init not Found!');
            }
        }
    };

    ultiflow.PythonCodeRun = function() {
        var _self = this;
        console.log('jsonPythonCodeRun: processData:', ultiflow.processData);
        if (ultiflow.processData) {
            var data = ultiflow.processData.process; //window.$ultiflow.processData.process;
            var jsonPythonCodeRun = '';

            var operatorObjs = Object.keys(data.operators);
            for (var operatorId in operatorObjs) {
                if (data.operators[operatorId].type && (data.operators[operatorId].type === 'python_procs::python_init')) {
                    jsonPythonCodeRun = JSON.stringify(data.parameters[operatorId]);
                    console.log('jsonPythonCodeRun:', { code: jsonPythonCodeRun, oper: data.parameters[operatorId] });
                }
            }

            if (jsonPythonCodeRun !== '' && jsonPythonCodeRun !== '{}') {
                app.sendRequest('python_CodeRun', { 'cmd': jsonPythonCodeRun /*, 'opts': { del_script: 0 } */ }, function(response) {
                    console.log('PythonCodeRun: ', response);
                    //app.data.versions = Object.assign(app.data.versions || {}, { os: response });
                });
            } else {
                alert('Python Init not Found!');
            }
        }
    };

    app.onEvent('ultiflow::process_change_detected', function(e) {
        if (ultiflow.timeoutChangeId != null) {
            clearTimeout(ultiflow.timeoutChangeId);
        }

        ultiflow.timeoutChangeId = setTimeout(function() {

            ultiflow.timeoutChangeId = null;
            ultiflow.saveCurrentProcess(function(success) {
                app.triggerEvent('ultiflow::process_saved', success);
            });
        }, ultiflow.timeoutChangeLength);
    });

    ultiflow.operatorChooser = function(customOptions) {
        var _self = this;
        this.getOperators(function(data) {

            var keys = ['library', 'workspace'];
            var texts = ['Library', 'Workspace'];
            var treeData = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];

                var partTreeData = _self.treeDataFromOperatorData(data.tree[key], data.list, key);
                treeData.push({
                    id: key,
                    text: texts[i],
                    children: partTreeData
                });
            }

            var originalOptions = {
                operatorId: null,
                onSelected: function(path) {}
            };

            var options = $.extend({}, originalOptions, customOptions);

            var Title = 'Choose operator';
            var str = `
<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="myModalLabel">${Title}</h4>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer">
                <div style="float: left; line-height: 31px;">
                <div class="operator-id"></div>
            </div>
            <div style="float: right;">
                <button type="button" class="btn btn-default btn-cancel" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary disabled">Choose</button>
            </div>
            </div>
        </div>
    </div>
</div>`;

            var $modal = $(str);
            var $title = $modal.find('.modal-title');
            var $body = $modal.find('.modal-body');
            var $primaryButton = $modal.find('.btn-primary');
            var $cancelButton = $modal.find('.btn-cancel');
            var $operatorId = $modal.find('.operator-id');

            var $tree = $('<div style="height: 200px; overflow-y: auto;"></div>');
            $tree.appendTo($body);

            $tree.uf_tree({ core: { data: treeData } });

            var selectedOperatorId = null;
            $tree.on('select_node.jstree', function(e, data) {
                if (data.node.type != 'default') {
                    $primaryButton.removeClass('disabled');
                    selectedOperatorId = data.node.id;
                    $operatorId.text(data.node.id);
                } else {
                    $primaryButton.addClass('disabled');
                    selectedOperatorId = null;
                    $operatorId.text('');
                }
            });

            $tree.on('loaded.jstree', function(e, data) {
                if (options.operatorId != null) {
                    $tree.jstree('select_node', options.operatorId);
                }
            });

            $cancelButton.click(function() {
                selectedOperatorId = null;
            });

            $primaryButton.click(function() {
                var $this = $(this);
                if (!$this.hasClass('disabled')) {
                    //selectedPath = $body.file_chooser('getPath');
                    $modal.modal('hide');
                }
            });

            $modal.modal();
            $modal.on('hidden.bs.modal', function() {
                options.onSelected(selectedOperatorId);
                $modal.remove();
            });
        });
    };

    ultiflow.addLibraryOp = function(customOptions) {
        var _self = this;
        this.getOperators(function(data) {

            var keys = ['library'];
            var texts = ['Library'];
            var treeData = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];

                var partTreeData = _self.treeDataFromOperatorData(data.tree[key], data.list, key);
                treeData.push({
                    id: key,
                    text: texts[i],
                    children: partTreeData
                });
            }

            var originalOptions = {
                operatorId: null,
                onSelected: function(path) {}
            };

            var options = $.extend({}, originalOptions, customOptions);

            var Title = 'New Library Operator';
            var str = `
<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="myModalLabel">${Title}</h4>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer">
                <div style="float: left; line-height: 31px;">
                <div class="operator-id"></div>
            </div>
            <div style="float: right;">
                <button type="button" class="btn btn-default btn-cancel" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary disabled">Choose</button>
            </div>
            </div>
        </div>
    </div>
</div>`;

            var $modal = $(str);
            var $title = $modal.find('.modal-title');
            var $body = $modal.find('.modal-body');
            var $primaryButton = $modal.find('.btn-primary');
            var $cancelButton = $modal.find('.btn-cancel');
            var $operatorId = $modal.find('.operator-id');

            var $tree = $('<div style="height: 200px; overflow-y: auto;"></div>');
            $tree.appendTo($body);

            $tree.uf_tree({ core: { data: treeData } });

            var selectedOperatorId = null;
            $tree.on('select_node.jstree', function(e, data) {
                if (data.node.type == 'default') {
                    $primaryButton.removeClass('disabled');
                    selectedOperatorId = data.node.id;
                    $operatorId.text(data.node.id);
                } else {
                    $primaryButton.addClass('disabled');
                    selectedOperatorId = null;
                    $operatorId.text('');
                }
            });

            $tree.on('loaded.jstree', function(e, data) {
                if (options.operatorId != null) {
                    //$tree.jstree('select_node', options.operatorId);
                    $tree.jstree('open_all');
                }
            });

            $cancelButton.click(function() {
                selectedOperatorId = null;
            });

            $primaryButton.click(function() {
                var $this = $(this);
                if (!$this.hasClass('disabled')) {
                    //selectedPath = $body.file_chooser('getPath');
                    $modal.modal('hide');
                }
            });

            $modal.modal();
            $modal.on('hidden.bs.modal', function() {
                options.onSelected(selectedOperatorId);
                $modal.remove();
            });
        });
    };

    ultiflow.addWorkspaceOp = function(customOptions) {
        var _self = this;
        //ultiflow.showCurrentProcess(); // Test
        this.getOperators(function(data) {

            var keys = ['workspace'];
            var texts = ['Workspace'];
            var treeData = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];

                var partTreeData = _self.treeDataFromOperatorData(data.tree[key], data.list, key);
                treeData.push({
                    id: key,
                    text: texts[i],
                    children: partTreeData
                });
            }

            var originalOptions = {
                operatorId: null,
                onSelected: function(path) {}
            };

            var options = $.extend({}, originalOptions, customOptions);

            var Title = 'New Workspace Project';
            var str = `
<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="myModalLabel">${Title}</h4>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer">
                <div style="float: left; line-height: 31px;">
                <div class="operator-id"></div>
            </div>
            <div style="float: right;">
                <button type="button" class="btn btn-default btn-cancel" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary disabled">Choose</button>
            </div>
            </div>
        </div>
    </div>
</div>`;

            var $modal = $(str);
            var $title = $modal.find('.modal-title');
            var $body = $modal.find('.modal-body');
            var $primaryButton = $modal.find('.btn-primary');
            var $cancelButton = $modal.find('.btn-cancel');
            var $operatorId = $modal.find('.operator-id');

            var $tree = $('<div style="height: 200px; overflow-y: auto;"></div>');
            $tree.appendTo($body);

            $tree.uf_tree({ core: { data: treeData } });

            var selectedOperatorId = null;
            $tree.on('select_node.jstree', function(e, data) {
                console.log('select_node.jstree:', data.node.type);
                if (data.node.type == 'default') {
                    $primaryButton.removeClass('disabled');
                    selectedOperatorId = data.node.id;
                    $operatorId.text(data.node.id);
                } else {
                    $primaryButton.addClass('disabled');
                    selectedOperatorId = null;
                    $operatorId.text('');
                }
            });

            $tree.on('loaded.jstree', function(e, data) {
                if (options.operatorId != null) {
                    //$tree.jstree('select_node', options.operatorId);
                    $tree.jstree('open_all');
                }
            });

            $cancelButton.click(function() {
                selectedOperatorId = null;
            });

            $primaryButton.click(function() {
                var $this = $(this);
                if (!$this.hasClass('disabled')) {
                    //selectedPath = $body.file_chooser('getPath');
                    $modal.modal('hide');
                }
            });

            $modal.modal();
            $modal.on('hidden.bs.modal', function() {
                options.onSelected(selectedOperatorId);
                $modal.remove();
            });
        });
    };

    window.$ultiflow = {...window.$ultiflow, ...ultiflow };
    window.$app = {...window.$app, ...app };

    return ultiflow;
});