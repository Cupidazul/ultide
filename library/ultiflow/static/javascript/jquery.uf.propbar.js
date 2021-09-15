define(['app', 'ultiflow'], function(app, ultiflow) {
    $.widget("ultiflow.uf_propbar", {
        options: {
            labels: {
                nothingSelected: 'Nothing is selected. Click an operator\'s title to select it.'
            }
        },

        els: {
            content: null,
            nothing: null
        },
        operatorId: null,
        linkId: null,
        paramKeyToModule: null,

        // the constructor
        _create: function() {
            var self = this;
            if ($app.debug) console.log('@ultiflow.uf_propbar: create! readyState:', document.readyState);

            $app.ultiflow.uf_propbar = self;

            this.els.content = $('<div class="uf-propbar-content"></div>');
            this.els.content.appendTo(this.element);

            this.els.nothing = $('<div class="nothing_selected"><span>' + this.options.labels.nothingSelected + '</span></div>');
            this.els.nothing.appendTo(this.element);

            this.els.nothing.Show = function(el) {
                // Show: DIV: nothing_selected
                this.show();
                // Hide: side-bar.right
                $('.uf-side-bar.right')
                    .css('right', String(-($('.uf-side-bar.right').width() + 8) + 'px'))
                    .resizable("option", { disabled: true });
            };
            this.els.nothing.Hide = function(el) {
                // Hide: DIV: nothing_selected
                this.hide();
                // Show: side-bar.right
                $('.uf-side-bar.right')
                    .css('right', '0px')
                    .resizable("option", { disabled: false });
            };

            app.onEvent('ultiflow::operator_select', function(evt, operatorId) {
                self.displayOperatorParameters(operatorId);
            });

            app.onEvent('ultiflow::operator_unselect', function(evt) {
                if (self.operatorId != null) {
                    self.regenerateParameters();
                    self.els.content.empty();
                    self.els.nothing.Show(self.els);
                    self.operatorId = null;
                }
            });

            app.onEvent('ultiflow::link_select', function(evt, linkId) {
                self.displayLinkParameters(linkId);
            });

            app.onEvent('ultiflow::link_unselect', function(evt) {
                if (self.linkId != null) {
                    self.els.content.empty();
                    self.els.nothing.Show(self.els);
                    self.linkId = null;
                }
            });

            if (typeof document.__ufPropertyNum == 'undefined') {
                document.__ufPropertyNum++;
            }
        },

        displayLinkParameters: function(linkId) {
            this.linkId = linkId;
            this.operatorId = null;
            this.els.nothing.Hide(this.els);
            var processData = ultiflow.getOpenedProcessData();
            var linkData = processData.process.links[linkId];

            this.els.content.empty();
            var $parametersList = $('<div class="uf-parameters-list"></div>');
            var $mainPanel = app.helper.createPanel('Main parameters (Link)', $parametersList, this.linkId);
            $mainPanel.appendTo(this.els.content);

            var $colorInput = $('<input type="color" class="form-control"/>');
            $colorInput.val($app.ultiflow.flowchart.flowchartMethod('getLinkMainColor', linkId));
            var $colorParameter = this.generateParameterField('Color:', $colorInput);
            $colorParameter.appendTo($parametersList);

            var $deleteButton = $('<button type="button" class="btn btn-danger">Delete link</button>');
            var $actionsParameter = this.generateParameterField('Actions:', $deleteButton);

            $actionsParameter.appendTo($parametersList);

            $deleteButton.click(function() {
                app.triggerEvent('ultiflow::delete_selected');
            });

            $colorInput.change(function() {
                $app.ultiflow.flowchart.els.flowchart.flowchart('setLinkMainColor', linkId, $colorInput.val());
            });


        },

        displayOperatorParameters: function(operatorId) {
            var self = this;
            self.operatorId = operatorId;
            self.linkId = null;
            self.paramKeyToModule = {};
            self.els.nothing.Hide(self.els);
            var processData = ultiflow.getOpenedProcessData();
            var operatorData = processData.process.operators[operatorId];
            var operatorType = operatorData.type;
            var operatorProperties = $app.ultiflow.flowchart.flowchartMethod('getOperatorFullProperties', operatorData);
            var operatorTypeData = ultiflow.getOperatorInfos(operatorType);
            var operatorFullData = ultiflow.flowchart.getFullData();

            //if ($app.debug) console.log('@ultiflow.uf_propbar.displayOperatorParameters:', { operatorId: operatorId, processData: processData, operatorData: operatorData, operatorType: operatorType, operatorTypeData: operatorTypeData });

            self.els.content.empty();
            var $parametersList = $('<div class="uf-parameters-list"></div>');
            var $mainPanel = app.helper.createPanel('Main parameters', $parametersList, self.operatorId);
            $mainPanel.appendTo(self.els.content);

            var $titleInput = $('<input type="text" class="form-control"/>');
            $titleInput.val($app.ultiflow.flowchart.flowchartMethod('getOperatorTitle', operatorId));
            var $titleParameter = self.generateParameterField('Title:', $titleInput);
            $titleParameter.appendTo($parametersList);

            var $typeParameter = self.generateParameterField('Type:', operatorTypeData.title);
            $typeParameter.appendTo($parametersList);

            var $deleteButton = $('<button type="button" class="btn btn-danger">Delete operator</button>');
            var $actionsParameter = self.generateParameterField('Actions:', $deleteButton);

            $actionsParameter.appendTo($parametersList);

            if ($app.user.is_admin) {

                var addInOutList = function(obj) {
                    $htmlStr = '';
                    for (var keyStr in obj) {
                        lblStr = obj[keyStr].label;
                        $htmlStr +=
                            `<div class="uf-parameter row vars-box">` +
                            `   VAR [ ]` +
                            `   <input type="text" class="form-control vars-item" value="${keyStr}">` +
                            `   Label ` +
                            `   <input type="text" class="form-control vars-item" value="${lblStr}">` +
                            `</div>`;
                    }
                    return $htmlStr;
                };

                $('#btn_edit_main_parameters').on('click', function() {
                    if ($('#uf_op_settings').length > 0) {
                        // Hide
                        $('#uf_op_settings').remove();
                    } else {
                        // Show
                        var InputsNr = function(opData) { return Object.keys((opData || operatorData).internal.properties.inputs).length; };
                        var OutputsNr = function(opData) { return Object.keys((opData || operatorData).internal.properties.outputs).length; };
                        var $Settings = $(
                            `<div class="uf-parameter">` +
                            `    <div class="col-md-6">` +
                            `        <label>Inputs:</label>` +
                            `        <div class="uf-parameter-content">` +
                            `        <input id="uf_op_sIn" type="number" min="0" max="999" class="form-control" style="max-width: 60px;" value="${InputsNr()}">` +
                            `        ` + addInOutList(operatorData.internal.properties.inputs) +
                            `        </div>` +
                            `    </div>` +
                            `    <div class="col-md-6">` +
                            `    <label>Outputs</label>` +
                            `    <div class="uf-parameter-content">` +
                            `        <input id="uf_op_sOut" type="number" min="0" max="999" class="form-control" style="max-width: 60px;" value="${OutputsNr()}">` +
                            `        ` + addInOutList(operatorData.internal.properties.outputs) +
                            `    </div>` +
                            `</div>`);

                        var $settingsParameter = self.generateParameterField('Settings:', $Settings);
                        $($settingsParameter).attr('id', 'uf_op_settings');
                        //$($settingsParameter).addClass('WiP');

                        $settingsParameter.appendTo($parametersList);

                        var hasInputLink = function(obj, currVal) {
                            for (let lnk0 in Object.keys($app.ultiflow.processData.process.links)) {
                                let currLnk = $app.ultiflow.processData.process.links[lnk0];
                                // 0: {fromOperator: '1', fromConnector: 'data', toOperator: '0', toConnector: 'input_1'}
                                if (typeof(currLnk) !== 'undefined' && String(currLnk.toOperator) == String(operatorId) && String(currLnk.toConnector) == String(obj)) {
                                    // console.log('hasInputLink', { tf: true, currVal: currVal, obj: obj, currLnk: JSON.stringify(currLnk) });
                                    return true;
                                }
                            }
                            return false;
                        };
                        var hasOutputLink = function(obj, currVal) {
                            for (let lnk0 in Object.keys($app.ultiflow.processData.process.links)) {
                                let currLnk = $app.ultiflow.processData.process.links[lnk0];
                                // 0: {fromOperator: '1', fromConnector: 'data', toOperator: '0', toConnector: 'input_1'}
                                if (typeof(currLnk) !== 'undefined' && String(currLnk.fromOperator) == String(operatorId) && String(currLnk.fromConnector) == String(obj)) {
                                    // console.log('hasOutputLink', { tf: true, currVal: currVal, obj: obj, currLnk: JSON.stringify(currLnk) });
                                    return true;
                                }
                            }
                            return false;
                        };

                        var delLastObj = function(obj, maxSize, isInput) {
                            if (maxSize == -1) maxSize = Object.keys(obj).length;
                            while (Object.keys(obj).length > maxSize) {
                                delete obj[Object.keys(obj)[Object.keys(obj).length - 1]];
                            }
                        };

                        $('#uf_op_sIn').on('input', function(evt) {
                            let currVal = parseInt(evt.currentTarget.value);
                            //console.log('uf_op_sIn', { InputsNr: InputsNr(operatorData), value: currVal, evt: evt.currentTarget });
                            //$app.ultiflow.flowchart.getOperatorElement(data1);
                            if (currVal > InputsNr(operatorData)) {
                                // ADD VAR
                                operatorData.internal.properties.inputs['input_' + String(currVal)] = { 'label': 'Input ' + String(currVal) };
                                operatorFullData.operators[self.operatorId].internal.properties.inputs['input_' + String(currVal)] = { 'label': 'Input ' + String(currVal) };
                            } else {
                                // DEL VAR
                                let _obj = $app.ultiflow.flowchart.VARS.inputs[self.operatorId];
                                if (!hasInputLink(Object.keys(_obj)[currVal], currVal)) {
                                    delLastObj($app.ultiflow.flowchart.VARS.inputs[self.operatorId], currVal, true);
                                    delLastObj(operatorData.internal.properties.inputs, currVal, true);
                                    delLastObj(operatorFullData.operators[self.operatorId].internal.properties.inputs, currVal, true);
                                } else {
                                    alert('You cannot delete Operators with Links connected!!!');
                                    this.value = String(currVal + 1);
                                    return false;
                                }
                            }

                            let $html = addInOutList(operatorData.internal.properties.inputs);
                            $('#uf_op_sIn').parent().find('.uf-parameter').remove();
                            $($html).appendTo($('#uf_op_sIn').parent());

                            app.triggerEvent('ultiflow::process_change_detected');
                            app.ultiflow.openProcess(ultiflow.openedProcess);
                            //console.log('uf_op_sIn.oninput:', { operatorId: self.operatorId, evt: evt, value: currVal, operatorData: operatorData, operatorFullData: operatorFullData, $html: $html });
                        });
                        $('#uf_op_sOut').on('input', function(evt) {
                            let currVal = parseInt(evt.currentTarget.value);
                            //console.log('uf_op_sOut', { OutputsNr: OutputsNr(operatorData), value: currVal, evt: evt.currentTarget });
                            if (currVal > OutputsNr(operatorData)) {
                                // ADD VAR
                                operatorData.internal.properties.outputs['output_' + String(currVal)] = { 'label': 'Output ' + String(currVal) };
                                operatorFullData.operators[self.operatorId].internal.properties.outputs['output_' + String(currVal)] = { 'label': 'Output ' + String(currVal) };
                            } else {
                                // DEL VAR
                                let _obj = $app.ultiflow.flowchart.VARS.outputs[self.operatorId];
                                if (!hasOutputLink(Object.keys(_obj)[currVal], currVal)) {
                                    delLastObj($app.ultiflow.flowchart.VARS.outputs[self.operatorId], currVal, false);
                                    delLastObj(operatorData.internal.properties.outputs, currVal, false);
                                    delLastObj(operatorFullData.operators[self.operatorId].internal.properties.outputs, currVal, false);
                                } else {
                                    alert('You cannot delete Operators with Links connected!!!');
                                    this.value = String(currVal + 1);
                                    return false;
                                }
                            }

                            let $html = addInOutList(operatorData.internal.properties.outputs);
                            $('#uf_op_sOut').parent().find('.uf-parameter').remove();
                            $($html).appendTo($('#uf_op_sOut').parent());

                            app.triggerEvent('ultiflow::process_change_detected');
                            app.ultiflow.openProcess(ultiflow.openedProcess);
                            //console.log('uf_op_sOut.oninput:', { operatorId: self.operatorId, evt: evt, value: currVal, operatorData: operatorData, operatorFullData: operatorFullData, $html: $html });
                        });
                    }
                });
            }

            $deleteButton.click(function() {
                app.triggerEvent('ultiflow::delete_selected');
            });

            $titleInput.keyup(function() {
                $app.ultiflow.flowchart.els.flowchart.flowchart('setOperatorTitle', operatorId, $titleInput.val());
            });

            if ($app.user.is_admin) // #SecurityRoles: Avoid non Admins from viewing/editing parameters
                if (typeof operatorTypeData.parameters != 'undefined') {
                    var operatorTypeParameters = self.processParameters(operatorTypeData.parameters);
                    for (var i = 0; i < operatorTypeParameters.length; i++) {
                        var panelInfos = operatorTypeParameters[i];
                        var $parametersList1 = $('<div class="uf-parameters-list"></div>');
                        var $panel = app.helper.createPanel(panelInfos.title, $parametersList1, i);

                        for (var j = 0; j < panelInfos.fields.length; j++) {
                            var propInfos = panelInfos.fields[j];
                            var propKey = propInfos.id;

                            var $divs = self.generateEmptyParameterField(propInfos.label);
                            $parametersList1.append($divs.parameter);
                            self.fillPropertyContent(operatorId, propKey, propInfos, $divs);
                        }

                        $panel.appendTo(self.els.content);
                    }
                }


        },

        fillPropertyContent: function(operatorId, propKey, propInfos, $divs) {
            var self = this;
            var processData = ultiflow.getOpenedProcessData().process;

            var config = {};
            if (typeof propInfos.config != 'undefined') {
                config = propInfos.config;
            }
            var value = null;
            if (typeof processData.parameters != 'undefined' &&
                typeof processData.parameters[operatorId] != 'undefined' &&
                typeof processData.parameters[operatorId][propKey] != 'undefined') {
                value = processData.parameters[operatorId][propKey];
            }

            ultiflow.loadFieldType(propInfos.type, function(module) {

                var cbReady = function(inst) {
                    if (value === null) {
                        if (typeof config.default != 'undefined') {
                            value = config.default;
                        }
                    }

                    try {
                        if (typeof(value.undefined) !== 'undefined') delete value.undefined;
                    } catch (err) {
                        console.log('@ultiflow.uf_propbar: Error: ' + String(propInfos.type), { propInfos: propInfos, inst: inst, value: value, module: module, config: config });
                    }

                    if (value !== null) {
                        try {
                            inst.setValue(value);
                        } catch (err) {
                            console.log('@ultiflow.uf_propbar: Error: ' + String(propInfos.type), { propInfos: propInfos, inst: inst, value: value, module: module, config: config });
                        }
                    }
                };

                var cbChange = function() {
                    self.regenerateParameters();
                };

                self.paramKeyToModule[propKey] = new module(propKey, $divs, config, cbReady, cbChange, propInfos);

            });


        },

        regenerateParameters: function() {
            if (this.operatorId != null) {
                var processData = ultiflow.getOpenedProcessData().process;
                var parameters = {};
                for (var paramKey in this.paramKeyToModule) {
                    parameters[paramKey] = this.paramKeyToModule[paramKey].getValue();
                }
                if (typeof processData.parameters == 'undefined') {
                    processData.parameters = {};
                }

                processData.parameters[this.operatorId] = parameters;
                app.triggerEvent('ultiflow::process_change_detected');
            }
        },

        processParameters: function(parameters) {
            if (parameters.length > 0 && typeof parameters[0].fields == 'undefined') {
                return [{ title: 'Parameters', fields: parameters }];
            }
            return parameters;
        },

        generateParameterField: function(label, content) {
            var $divs = this.generateEmptyParameterField(label);
            $divs.content.append(content);
            return $divs.parameter;
        },

        generateEmptyParameterField: function(label) {
            var $parameter = $('<div class="uf-parameter"></div>');
            var $label = $('<label></label>').text(label);
            var $content = $('<div class="uf-parameter-content"></div>');
            $label.appendTo($parameter);
            $content.appendTo($parameter);
            return { parameter: $parameter, label: $label, content: $content };
        },

    });
});