define(['app', '_', 'bootstrap'], function(app, _) {
    var self = this;
    let ultiflow = { data: {}, versions: {}, ui: {} };
    if ($app.debug) console.log('@library/ultiflow: app:', { app: app, ultiflow: ultiflow, _: _ });
    app.ultiflow = ultiflow;

    ultiflow.timeoutChangeLength = 200;

    ultiflow.endLoading = async function(ElVal) {
        let ElVal_id = $(ElVal).parent().prop('id');
        let LastProject = app.user.last_op;
        if (LastProject == null) LastProject = '';

        if ($app.debug) console.log('@library/ultiflow: ultiflow.endLoading:', { 'ElVal_id': ElVal_id, 'LastProject': LastProject });

        if (!LastProject || LastProject == '') LastProject = 'custom::custom_process';
        if (typeof($app.ultiflow.data.modulesInfos.operators.list[LastProject]) === 'undefined') LastProject = 'custom::custom_process';

        if (String(ElVal_id) === String(LastProject)) {
            _.debounce(function(oElVal) {
                //$('#userMenuBtn1').parent().show();
                if (typeof(oElVal) !== 'undefined') oElVal.click(); // Click on Last Opened Project (LastProject)
                $app.ultiflow.flowchart.changeDetected(); // BugFix: uf-flowchart-mini-view-focus: update!
                $app.ultiflow.flowchart._isStarted(true);
                $app.flowchart.menuHide();
                $("#loadingDiv").fadeOut(500, function() {
                    // fadeOut complete. Remove the loading div
                    //$("#loadingDiv").remove(); //makes page more lightweight 
                    $('body').removeAttr("style");
                });
            }, 1000, { trailing: true })(ElVal);
        }

    };
    // get_os_config : #Security: Avoid exposing ServerConfig for Security Reasons !
    /*ultiflow.getAppConfig = () => {
        return new Promise(function(resolve, reject) {
            app.sendRequest('get_os_config', {}, function(res, err) {
                if (err) {
                    //console.log('ERROR!!!', err);
                    return reject(err);
                }
                //console.log('resolve!!!', res);
                return resolve(res);
            });
        });
    };*/

    ultiflow.getAppVersions = async function() {
        await app.sendRequest('get_os_versions', {}, function(response) {
            //alert(response['demo_response']);
            return setTimeout(function() {
                window.$app.versions = app.versions = Object.assign(app.versions || {}, { os: response });
                try { app.versions.Browser = ((typeof(uaData.brands) !== 'undefined') ? (uaData.brands[2].brand + ' ' + uaData.brands[2].version) : navigator.appVersion); } catch (err) { console.log('err:', err); }
                try { app.versions.jstree = jQuery.jstree.version; } catch (err) { console.log('err:', err); }
                try { app.versions.jquery = jQuery.fn.jquery; } catch (err) { console.log('err:', err); }
                try { app.versions['jquery-ui'] = jQuery.ui.version; } catch (err) { console.log('err:', err); }
                try { app.versions.requirejs = requirejs.version; } catch (err) { console.log('err:', err); }
                try { app.versions.bootstrap = jQuery.fn.tooltip.Constructor.VERSION; } catch (err) { console.log('err:', err); }
                try { app.versions.lodash = _.VERSION; } catch (err) { console.log('err:', err); }
                try { app.versions.mousewheel = $.event.special.mousewheel.version; } catch (err) { console.log('err:', err); }
                try { app.versions.JSONSafeStringify = app.JSONSafeStringify.version; } catch (err) { console.log('err:', err); }
                try { app.versions.lzString = app.lzString.version; } catch (err) { console.log('err:', err); }

                try { app.versions.os['perl-Modules'] = app.versions.os['perl-Modules'] || ''; } catch (err) { console.log('err:', err); }
                try { app.versions.os['python-Modules'] = app.versions.os['python-Modules'] || ''; } catch (err) { console.log('err:', err); }

                if (app.versions.os['perl-Modules'].charAt(0) === '{') { // if is json
                    app.versions.os['perl-Modules'] = JSON.parse(app.versions.os['perl-Modules']);
                }
                if (app.versions.os['python-Modules'].charAt(0) === '{') { // if is json
                    app.versions.os['python-Modules'] = JSON.parse(app.versions.os['python-Modules']);
                }
                if ($app.debug) console.log('@library/ultiflow: app.ultiflow.versions:', app.versions);
                ultiflow.versions = app.versions;
                ultiflow.app = app;
                //window.$app.config = Object.assign(window.$app.config, app.versions.os.config);
                return app;
            }, 10);
        });
    };
    ultiflow.getAppVersions();

    ultiflow.getModulesInfos = async function(cb) {
        var _self = this;
        //console.log('@library/ultiflow.getModulesInfos:', _self);
        if (typeof this.data.modulesInfos == 'undefined') {
            await app.sendRequest('modules_infos', {}, async function(response) {
                if ($app.debug) console.log('@library/ultiflow.getModulesInfos: res:', response);
                _self.data.modulesInfos = response;
                await cb(_self.data.modulesInfos);
            });
        } else {
            await cb(_self.data.modulesInfos);
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
        //if ($app.debug) console.log('@library/ultiflow: openProcess:', { processId: processId });

        /* RESET flowchart 
        $app.flowchart.flowchartMethod('setData', { operators: {}, links: {}, operatorTypes: {} });
        $app.flowchart.flowchartMethod('destroyLinks');
        $app.flowchart._refreshMiniViewContent();*/
        //$app.flowchart.reset();

        this.setOpenedProcess(processId);
        this.processData = this.getOpenedProcessData();
        app.triggerEvent('ultiflow::process_open', this.processData);
    };

    ultiflow.setOpenedProcess = function(processId) {
        //if ($app.debug) console.log('@library/ultiflow: setOpenedProcess:', { processId: processId });
        this.openedProcess = processId;
        var _self = this;
        app.setUserProperty('ultiflow::opened_process', processId, function(success) {});
    };

    ultiflow.getOpenedProcessData = function() {
        if (ultiflow.data.modulesInfos) return ultiflow.data.modulesInfos.operators.list[this.openedProcess];
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
        if ($app.debug && operatorData) console.log('operatorData:', operatorData);
    };

    ultiflow.renameTitle = function(NewTitle, processId) {
        if (typeof(processId) == 'undefined') processId = ultiflow.openedProcess;
        var operatorData = ultiflow.data.modulesInfos.operators.list[processId];
        operatorData.title = NewTitle;
        ultiflow.saveProcess(processId, () => {});
    };

    ultiflow.deleteProject = function(processId) {
        if (typeof(processId) == 'undefined') processId = ultiflow.openedProcess;
        var operatorData = ultiflow.data.modulesInfos.operators.list[processId];
        if ($app.debug) console.log('ultiflow.deleteProject:', { processId: processId, operatorData, opList: ultiflow.data.modulesInfos.operators.list });
        app.sendRequest('deleteProject', operatorData, function(response) {
            if ($app.debug) console.log('deleteProject: ', response);
            window.location.reload(true); // refresh / reload page
        });
    };

    ultiflow.CompileCode = function(_data, StartOpID) {
        let _Code = '';
        let _linkTree = {};
        // # Generate LinkTree basics with operators and parameters
        for (let [lKey, lVal] of Object.entries(_data.links)) {

            _linkTree[lVal.fromOperator] = Object.assign({
                id: lVal.fromOperator,
                //fid: lKey,
                o: _data.operators[lVal.fromOperator],
                p: _data.parameters[lVal.fromOperator],
                _depth: 0,
            }, _linkTree[lVal.fromOperator] || {});
            if (typeof(_linkTree[lVal.fromOperator].tl) === 'undefined') _linkTree[lVal.fromOperator].tl = [];
            _linkTree[lVal.fromOperator].tl.push(lVal);

            _linkTree[lVal.toOperator] = Object.assign({
                id: lVal.toOperator,
                //tid: lKey,
                o: _data.operators[lVal.toOperator],
                p: _data.parameters[lVal.toOperator],
                _depth: 0,
            }, _linkTree[lVal.toOperator] || {});
            if (typeof(_linkTree[lVal.toOperator].fl) === 'undefined') _linkTree[lVal.toOperator].fl = [];
            _linkTree[lVal.toOperator].fl.push(lVal);
        }

        // # Generate add children and parents to basic LinkTree 
        for (let [lKey, lVal] of Object.entries(_data.links)) {

            if (typeof(_linkTree[lVal.toOperator].parents) === 'undefined') _linkTree[lVal.toOperator].parents = [];
            _linkTree[lVal.toOperator].parents.push(_linkTree[lVal.fromOperator]);

            // Children object not needed in Compile
            //if (typeof(_linkTree[lVal.fromOperator].children) === 'undefined') _linkTree[lVal.fromOperator].children = [];
            //_linkTree[lVal.fromOperator].children.push(_linkTree[lVal.toOperator]);
        }

        // # Start in StartOpID and run Process, then Start in Other Parents and run Process. while there are (un)runned children repeat.
        // # Definition: root parents dont have parent

        /*let rootProcessTree = [];
        rootProcessTree.push(_linkTree[StartOpID]); // # 1st: StartOpID
        for (let [lKey, lVal] of Object.entries(_linkTree)) {
            //console.log('CompileCode:', { lKey: lKey, lVal: lVal });
            if (!rootProcessTree.includes(lVal) && (typeof(lVal.parents) === 'undefined')) { // if not in rootProcessTree, and no Parents, ADD!
                rootProcessTree.push(lVal);
            }
        }*/

        let finalProcessList = []; // Sequencial List of Processes to run
        let Iteration = 0; // Incremental Value that defines when the Process was run
        let Level = 0; // Incremental Value that defines when the Process should be run

        Object.getPrototypeOf(finalProcessList).insert = function(item, index) {
            this.splice(index, 0, item);
        };

        /*{
            let CurrPos = {};
            let _fn0 = (hasParents, elm) => {
                if (typeof(elm.parents) !== 'undefined') hasParents = true;
                if (typeof(elm.level) === 'undefined') elm.level = Level++;
                if (!hasParents && !finalProcessList.includes(elm)) {
                    finalProcessList.push(elm);
                }
            };

            // # Iterate rootProcessTree
            for (let Idx = 0; Idx < rootProcessTree.length; Idx++) {
                CurrPos = [rootProcessTree[Idx]];
                let hasParents = false;
                do {
                    hasParents = false;
                    CurrPos.forEach(_fn0.bind(this, hasParents));
                    CurrPos = CurrPos.children || [];
                } while (!hasParents && CurrPos.length > 0);
            }
        }

        {
            let CurrPos = {};
            let _fn1 = (elm) => {
                if (typeof(elm.children) !== 'undefined') {
                    if (typeof(elm.level) === 'undefined') elm.level = Level++;
                    if (!finalProcessList.includes(elm)) {
                        finalProcessList.push(elm);
                    }
                }
                CurrPos = elm;
            };

            // # Iterate all Children in rootProcessTree
            for (let Idx = 0; Idx < rootProcessTree.length; Idx++) {
                CurrPos = rootProcessTree[Idx];
                do {
                    CurrPos = CurrPos.children;
                    CurrPos.forEach(_fn1.bind(this));
                } while (typeof(CurrPos.children) !== 'undefined' && CurrPos.children.length > 0);
            }
        }

        // # ADD all other Children not in finalProcessList
        // # Note: in the future: we could simply rely on lVal.level and create finalProcessList, only here, from scratch
        let pos = 0;
        let ElCnt = Object.entries(_linkTree).length;
        for (let [lKey, elm] of Object.entries(_linkTree)) {
            //console.log('Get all other Children:', lKey, elm);
            if (typeof(elm.level) === 'undefined') elm.level = Level++;
            if (!finalProcessList.includes(elm)) {
                finalProcessList.insert(elm, elm.level - pos); // insert in correspondent Level (reverse last Items)
                elm.level = elm.level + (ElCnt - finalProcessList.length - 1) - pos + 1;
                pos++;
            }
        }*/

        // # Tests with depth : not in use for now...
        /*finalProcessList.forEach(async function(elm) {
            if (typeof(elm.parents) !== 'undefined') elm._depth = elm.parents[0]._depth + 1;
        }.bind(this));*/

        let max_depth = 0;
        for (let i = 0; i < max_depth + 1; i++) {
            for (let [lKey, elm] of Object.entries(_linkTree)) {
                if (typeof(elm.parents) !== 'undefined') elm._depth = elm.parents[0]._depth + 1;
                if (elm._depth > max_depth) max_depth = elm._depth;
            }
        }

        for (let CurrDepth = 0; CurrDepth <= max_depth; CurrDepth++) {
            for (let [lKey, elm] of Object.entries(_linkTree)) {
                if (CurrDepth == elm._depth) finalProcessList.push(elm);
            }
        }

        let finalProcessListJSON = [];
        var JSONSize = 0;
        // # Iterate All Children and Call: RunProcess 
        var promises = [];

        let RunProcess = async function(elm) {
            elm.res = '';
            elm.date = new Date().toISOString();
            elm.iter = Iteration;
            // #WIP: Process each type of operantor
            if ($app.debug) console.log('RunProcess[' + Iteration + ']:', elm.o.type, elm);
            Iteration++;
        };

        Object.entries(finalProcessList).forEach(async function([idx, elm]) {
            promises.push((async() => {
                let _J = await $app.JSONSafeStringify(elm);
                //await RunProcess(elm); // **1 - Migrate to Python! for Cron offline workflow execution to be possible...
                if ($app.debug) console.log('CompileCode Process[' + idx + '] Size:' + String(JSONSize + _J.length));
                JSONSize += _J.length;
                finalProcessListJSON.push(_J);
                return await _J;
            })());
        }.bind(this));

        Promise.all(promises).then(async() => {
            let _J = $app.JSONSafeStringify(finalProcessListJSON);
            _Jlz = $app.lzString.compressToBase64(_J);
            if ($app.debug) console.log('CompileCode finalProcessListJSON Sizes: JSONstr:' + _J.length + ' Lz:' + _Jlz.length + ' CompressRate:' + parseInt(((_J.length - _Jlz.length) / _J.length) * 100) + '%');

            // **1 - Migrate to Python! for Cron offline workflow execution to be possible...
            // START: HERE!
            app.sendRequest('execWorkflowProcess', { 'lz': _Jlz /*, 'opts': { del_script: 0 } */ }, function(response) {
                if ($app.debug) console.log('execWorkflowProcess: ', response);
                app.data.versions = Object.assign(app.data.versions || {}, { os: response });
            });
        });

        //if ($app.debug) console.log('CompileCode Process:', { _linkTree: _linkTree, StartOpID: StartOpID, rootProcessTree: rootProcessTree, finalProcessList: finalProcessList });
        if ($app.debug) console.log('CompileCode Process:', { _linkTree: _linkTree, StartOpID: StartOpID, finalProcessList: finalProcessList });

        return _Code;
    };

    ultiflow.PerlCodeRun = function() {
        var _self = this;
        var _data = null;
        try { _data = ultiflow.data.modulesInfos.operators.list[ultiflow.openedProcess].process; /*$app.ultiflow.flowchart.data; # TooMuch Data to jsonStringify*/ } catch (er) {}
        if ($app.debug) console.log('jsonPerlCodeRun: processData:', _data);
        if (_data !== null) {
            ultiflow.CompileCode(_data, '');
            // var jsonPerlCodeRun = '';
            // Object.entries(_data.operators).forEach(elm => {
            //     const [oKey, oVal] = elm;
            // 
            //     if ($app.debug) console.log('jsonPerlCodeRun:', { operatorId: oKey, code: jsonPerlCodeRun, oper: oVal || {}, param: _data.parameters[oKey] || {} });
            //     if (oVal) {
            //         if (oVal.type && (oVal.type === 'perl_procs::perl_init')) {
            //             // Run through Hierarchy:
            //             // window.infos = contains info from last dropped object
            //             ultiflow.CompileCode(_data, oKey);
            //             jsonPerlCodeRun = JSON.stringify(_data.parameters[oKey]);
            //         }
            //     }
            // });
            // 
            // if (jsonPerlCodeRun !== '' && jsonPerlCodeRun !== '{}') {
            //     app.sendRequest('perl_CodeRun', { 'cmd': jsonPerlCodeRun /*, 'opts': { del_script: 0 } */ }, function(response) {
            //         if ($app.debug) console.log('PerlCodeRun: ', response);
            //         //app.data.versions = Object.assign(app.data.versions || {}, { os: response });
            //     });
            // } else {
            //     alert('Perl Init not Found!');
            // }
        }
    };

    ultiflow.anyCodeRun = function() {
        var _self = this;
        var _data = null;
        try { _data = ultiflow.processData.process; } catch (er) {}
        if ($app.debug) console.log('jsonCodeRun: processData:', _data);
        if (_data !== null) {
            ultiflow.CompileCode(_data, '');
        }
    };

    ultiflow.PythonCodeRun = function() {
        var _self = this;
        var _data = null;
        try { _data = ultiflow.processData.process; } catch (er) {}
        if ($app.debug) console.log('jsonPythonCodeRun: processData:', _data);
        if (_data !== null) {
            ultiflow.CompileCode(_data, '');
            //var jsonPythonCodeRun = '';
            //Object.entries(_data.operators).forEach(elm => {
            //    const [oKey, oVal] = elm;
            //
            //    if ($app.debug) console.log('jsonPythonCodeRun:', { operatorId: oKey, code: jsonPythonCodeRun, oper: oVal || {}, param: _data.parameters[oKey] || {} });
            //    if (oVal) {
            //        if (oVal.type && (oVal.type === 'python_procs::python_init')) {
            //            // Run through Hierarchy:
            //            // window.infos = contains info from last dropped object
            //            jsonPythonCodeRun = JSON.stringify(_data.parameters[oKey]);
            //        }
            //    }
            //});
            //
            //if (jsonPythonCodeRun !== '' && jsonPythonCodeRun !== '{}') {
            //    app.sendRequest('python_CodeRun', { 'cmd': jsonPythonCodeRun /*, 'opts': { del_script: 0 } */ }, function(response) {
            //        if ($app.debug) console.log('PythonCodeRun: ', response);
            //        //app.data.versions = Object.assign(app.data.versions || {}, { os: response });
            //    });
            //} else {
            //    alert('Python Init not Found!');
            //}
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
<div class="modal fade" id="addLibModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
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

            var Title = 'New Workspace / Project';
            var str = `
<div class="modal fade" id="addWksModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="myModalLabel">${Title}</h4>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer" style="min-height: 60px;">
                <div style="float: left;text-align: left;min-width: 400px;">
                <div class="operator-id"></div>
            </div>
            <div style="float: right;position: fixed;bottom: 16px;right: 16px;">
                <button type="button" class="btn btn-default btn-cancel" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary disabled">Add</button>
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
            $tree.on('select_node.jstree', function(evt, data) {
                //console.log('select_node.jstree:', { event: evt, data: data });
                if (data.node.type === 'default') {
                    $primaryButton.removeClass('disabled');
                    selectedOperatorId = data.node.id;
                    $operatorId.html('<p>' + data.node.id + '</p>');
                    //console.log('select_node.jstree:', { data: data });

                    if (data.node.parent !== "#") {
                        //$operatorId.append($('<input id="addiPrj" parent="' + data.node.parent + '" class="form-control form-control-sm" type="text" placeholder="New Project Name" style="float: left;">'));
                        $operatorId.append($(`<input id="addiPrj" data-parent="${data.node.parent}" class="form-control form-control-sm" type="text" placeholder="New Project Name" style="float: left;width: 200px;">
<div class="btn-group" role="group" data-children-count="1" style="float: right;">
    <button type="button" class="btn btn-default" data-children-count="1" style="margin-left: 4px;">Copy <input id="addiCopyTF" type="checkbox" tabindex="-1" style="position: relative;margin-top: 0px;top: 2px;"></button>
    <div class="btn-group" role="group">
        <button id="addiPrjItemDrop1" type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="min-width: 150px;text-align: left;max-width: 150px;overflow: hidden;">
        Dropdown
        <span class="caret"></span>
        </button>
        <ul id="addiPrjItemList1" class="dropdown-menu" aria-labelledby="addiPrjItemDrop1">
        </ul>
    </div>
</div>`));
                        $modal.edit_objDATA = data.instance._model.data[data.node.id];
                        $modal.copy_Obj = Object.assign({}, $modal.copy_Obj || {});
                        $modal.copy_Obj.isCopy = $('#addiCopyTF').prop('checked');

                        data.node.children.forEach(function(ElVal, ElIdx) {
                            //console.log('forEach:', { ElIdx: ElIdx, ElVal: ElVal });
                            $('#addiPrjItemList1').append('<li><a id="prj_item' + ElIdx + '" data-id="' + ElVal + '" href="#">' + data.instance._model.data[ElVal].text + '</a></li>');
                        });
                        $('#addiPrjItemList1 li a').on('click', (evt) => {
                            $('#addiPrjItemDrop1').html(' ' + evt.target.text + ' <span class="caret"></span>');
                            $modal.copy_Obj = Object.assign($modal.copy_Obj, {
                                event: evt.target,
                                id: evt.target.id,
                                dataID: evt.target.dataset.id,
                                isCopy: $('#addiCopyTF').prop('checked'),
                                data: app.ultiflow.data.modulesInfos.operators.list[evt.target.dataset.id]
                            });

                            if ($app.debug) console.log('evt.target:', { target: evt.target, copy_Obj: $modal.copy_Obj });
                        });
                        $('#addiCopyTF').on('click', (evt) => {
                            evt.stopImmediatePropagation();
                            $modal.copy_Obj.isCopy = $('#addiCopyTF').prop('checked');
                        });
                        $('#addiCopyTF').parent().on('click', (evt) => {
                            $('#addiCopyTF').click();
                        });
                    } else {
                        // WIP
                        $primaryButton.addClass('disabled');
                        selectedOperatorId = null;
                        $operatorId.text('');
                        $('#addiPrj').remove();
                        // WIP
                        // $operatorId.append($('<input id="addiPrj" data-parent="' + data.node.parent + '" class="form-control form-control-sm" type="text" placeholder="New Workspace Name" style="float: left;">'));
                    }
                } else {
                    $primaryButton.addClass('disabled');
                    selectedOperatorId = null;
                    $operatorId.text('');
                    $('#addiPrj').remove();
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
                //console.log($tree.attr('id'));
                var tID = $tree.attr('id');
                $tree.jstree('destroy');
                $tree.remove();
                $tree = null;
                if (typeof(app.ultiflow.$uf_tree[tID]) !== 'undefined') delete app.ultiflow.$uf_tree[tID];
            });

            $primaryButton.click(function() {
                var $this = $(this);
                if (!$this.hasClass('disabled')) {

                    if ($('#addiPrj').val().trim() === '') {
                        alert('Please define a new Project Name!!!');
                        return;
                    }

                    //selectedPath = $body.file_chooser('getPath');
                    app.sendRequest('getDefaultConfig', {}, function(response) {
                        // Get Default JSON Template
                        if ($app.debug) console.log('getDefaultConfig: ', response);
                        //app.data.versions = Object.assign(app.data.versions || {}, { os: response });
                        var cfg = response.json;
                        if ($modal.copy_Obj.isCopy) cfg = $modal.copy_Obj.data;

                        // Build New Project Object
                        cfg.title = $('#addiPrj').val().trim();

                        /*
                        cfg.fs.workspace_dir = app.ultiflow.processData.fs.workspace_dir; // "workspaces"
                        cfg.fs.operators_dir = app.ultiflow.processData.fs.operators_dir; //"operators";
                        cfg.fs.work_dir = app.ultiflow.processData.fs.config_filework_dir; // = "workspaces\\1"
                        cfg.fs.oper_path = cfg.fs.work_dir + '\\' + cfg.fs.proj_name + '\\' + cfg.fs.operators_dir; // = "workspaces\\1\\My Project\\operators"
                        cfg.fs.oper_name = ''; // = "prj0_operator"
                        cfg.fs.user_id = app.session.user.id; // = 0 
                        */

                        if ($modal.edit_objDATA) {
                            cfg.fs = app.ultiflow.processData.fs;
                            cfg.fs.proj_name = $modal.edit_objDATA.original.text; // = "My Project"

                            var NewProjID = 0;
                            //app.ultiflow.data.modulesInfos.operators.tree.workspace[ cfg.fs.proj_name ];

                            // Check for non duplicate prj99::custom_process
                            Object.keys(app.ultiflow.data.modulesInfos.operators.tree.workspace).forEach(function(wk) {
                                Object.keys(app.ultiflow.data.modulesInfos.operators.tree.workspace[wk]).forEach(function(prj) {
                                    if (prj === 'prj' + NewProjID + '::custom_process') ++NewProjID;
                                });
                            });

                            cfg.id = 'prj' + NewProjID + '::custom_process';
                            cfg.fs.oper_name = 'prj' + NewProjID + '::custom_process';

                            cfg.path = cfg.fs.oper_path + "\\" + 'prj' + NewProjID + '_operator' + "\\config.json"; // "workspaces\\1\\My Project\\operators\\prj0_operator\\config.json";

                            if ($app.debug) console.log('Save: cfg:', { cfg: cfg, EDIT_OBJ: $modal.edit_objDATA });
                            app.sendRequest('saveNewProject', { cfg: cfg, EDIT_OBJ: $modal.edit_objDATA }, function(response) {
                                window.location.reload(true); // refresh / reload page
                            });

                        } else {
                            console.log('ERROR: edit_objDATA:undefined:', { $modal: $modal });
                        }
                    });
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

    //window.$ultiflow = Object.assign(window.$ultiflow || {}, ultiflow);
    window.$app = Object.assign(window.$app || {}, app);

    return ultiflow;
});