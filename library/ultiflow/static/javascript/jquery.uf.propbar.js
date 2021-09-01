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
            var $mainPanel = helper.createPanel('Main parameters', $parametersList);
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
            this.operatorId = operatorId;
            this.linkId = null;
            this.paramKeyToModule = {};
            this.els.nothing.Hide(this.els);
            var processData = ultiflow.getOpenedProcessData();
            var operatorData = processData.process.operators[operatorId];
            var operatorType = operatorData.type;
            var operatorProperties = $app.ultiflow.flowchart.flowchartMethod('getOperatorFullProperties', operatorData);
            var operatorTypeData = ultiflow.getOperatorInfos(operatorType);

            this.els.content.empty();
            var $parametersList = $('<div class="uf-parameters-list"></div>');
            var $mainPanel = helper.createPanel('Main parameters', $parametersList);
            $mainPanel.appendTo(this.els.content);

            var $titleInput = $('<input type="text" class="form-control"/>');
            $titleInput.val($app.ultiflow.flowchart.flowchartMethod('getOperatorTitle', operatorId));
            var $titleParameter = this.generateParameterField('Title:', $titleInput);
            $titleParameter.appendTo($parametersList);

            var $typeParameter = this.generateParameterField('Type:', operatorTypeData.title);
            $typeParameter.appendTo($parametersList);

            var $deleteButton = $('<button type="button" class="btn btn-danger">Delete operator</button>');
            var $actionsParameter = this.generateParameterField('Actions:', $deleteButton);

            $actionsParameter.appendTo($parametersList);

            $deleteButton.click(function() {
                app.triggerEvent('ultiflow::delete_selected');
            });

            $titleInput.keyup(function() {
                $app.ultiflow.flowchart.els.flowchart.flowchart('setOperatorTitle', operatorId, $titleInput.val());
            });

            if ($app.user.is_admin) // #SecurityRoles: Avoid non Admins from viewing/editing parameters
                if (typeof operatorTypeData.parameters != 'undefined') {
                    var operatorTypeParameters = this.processParameters(operatorTypeData.parameters);
                    for (var i = 0; i < operatorTypeParameters.length; i++) {
                        var panelInfos = operatorTypeParameters[i];
                        var $parametersList1 = $('<div class="uf-parameters-list"></div>');
                        var $panel = helper.createPanel(panelInfos.title, $parametersList1);

                        for (var j = 0; j < panelInfos.fields.length; j++) {
                            var propInfos = panelInfos.fields[j];
                            var propKey = propInfos.id;

                            var $divs = this.generateEmptyParameterField(propInfos.label);
                            $parametersList1.append($divs.parameter);
                            this.fillPropertyContent(operatorId, propKey, propInfos, $divs);
                        }

                        $panel.appendTo(this.els.content);
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
                        console.error('@ultiflow.uf_propbar: Error: ' + String(propInfos.type), { inst: inst, value: value, module: module });
                    }

                    if (value !== null) {
                        try {
                            inst.setValue(value);
                        } catch (err) {
                            console.error('@ultiflow.uf_propbar: Error: ' + String(propInfos.type), { inst: inst, value: value, module: module });
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