define([
    'app',
    'ultiflow',
    'ultiflow-lib-mousewheel',
    'ultiflow-lib-panzoom',
    'ultiflow-lib-flowchart'
], function(app) {
    $.widget("ultiflow.uf_flowchart", {
        options: {

        },
        els: {
            flowchart: null,
            flowchartMiniView: null,
            flowchartMiniViewFocus: null,
            flowchartMiniContent: null
        },
        cx: null,
        cy: null,
        timeoutChangeId: null,
        timeoutChangeLength: 500,
        isSettingData: false,
        possibleZooms: [0.5, 1, 1.5, 2, 2.5, 3],
        defaultZoom: 1,
        currentZoom: 1,
        currentZoomRatio: 1,
        $ufPanzoom: null,
        menuState: 1,
        isStarted: false,
        isMousewheel: false,
        deltaMousewheel: 0,
        data: {},
        VARS: { inputs: [], outputs: [] },
        operatorsPositions: {},
        menuShow: function(evt) {
            // Show
            this.menuState = 1;
            $('.main-view').css('left', '100px');
            $('.navbar-fixed-left').css('z-index', '1');
            setTimeout(function() { $('.navbar-fixed-left').css('left', ''); }, 400);
            $('.navbar-fixed-left').css('left', '-100px');
            $('.navbar-fixed-left').animate({ left: "+=100" }, 300);
        },
        menuHide: function(evt) {
            // Hide
            this.menuState = 0;
            $('.navbar-fixed-left').css('z-index', '');
            $('.main-view').css('left', '0px');
            setTimeout(function() { $('.navbar-fixed-left').css('left', '-245px'); }, 400);
            $('.navbar-fixed-left').css('left', '');
            $('.navbar-fixed-left').animate({ left: "-=100" }, 300);
        },
        _isStarted: function(val) {
            if (typeof(val) !== 'undefined') this.isStarted = val;
            return this.isStarted;
        },
        // the constructor
        _create: function() {
            let self = this;

            if ($app.debug) console.log('@ultiflow.uf_flowchart: create! readyState:', document.readyState);

            let $flowchart = $('<div class="uf-flowchart"></div>');
            this.els.flowchart = $flowchart;
            this.element.append(this.els.flowchart);

            let $flowchartMiniView = $('<div class="uf-flowchart-mini-view"></div>');
            this.els.flowchartMiniView = $flowchartMiniView;
            this.element.append(this.els.flowchartMiniView);

            this.els.flowchartMiniViewContent = $('<svg class="uf-flowchart-mini-view-content"></svg>');
            this.els.flowchartMiniViewContent.appendTo(this.els.flowchartMiniView);

            let $flowchartMiniViewFocus = $('<div class="uf-flowchart-mini-view-focus"></div>');
            this.els.flowchartMiniViewFocus = $flowchartMiniViewFocus;
            this.els.flowchartMiniView.append(this.els.flowchartMiniViewFocus);

            let $container = this.element;

            // Panzoom initialization...
            //$flowchart.panzoom({

            self.$ufPanzoom = $.Panzoom($('.uf-flowchart')[0], {
                minScale: 0.5,
                maxScale: 3,
                increment: 0.5,
                linearZoom: true,
                isSVG: true,
                animate: true,
                //$zoomIn: $(".zoom-in"),
                //$zoomOut: $(".zoom-out"),
                //$zoomRange: $(".zoom-range"),
                //$reset: $(".zoom-reset"),
                //onPan: self.els.onPan,
                //onStart: function(evt) {
                //    console.log('$flowchart.panzoom.onStart',self,evt);
                //},
                onChange: function(e) {
                    self._refreshMiniViewPosition();
                }
            });

            $(".zoom-range").val(self.currentZoomRatio);

            // Centering panzoom
            self.centerView();

            // Panzoom zoom handling...
            $container.on('mousewheel.focal', function(evt) {
                self.isMousewheel = true;
                evt.preventDefault();
                var rcnt = 0;
                var repeatr = setInterval(() => {
                    if (++rcnt < 5) {
                        self._refreshMiniViewPosition();
                    } else {
                        self.isMousewheel = false;
                        self._refreshMiniViewPosition();
                        clearInterval(repeatr);
                    }
                }, 50);
                let delta = self.deltaMousewheel = (evt.delta || evt.originalEvent.wheelDelta) || evt.originalEvent.detail;
                let zoomOut = !(delta ? delta < 0 : evt.originalEvent.deltaY > 0);
                self.currentZoom = Math.max(0, Math.min(self.possibleZooms.length - 1, (self.currentZoom + (zoomOut * 2 - 1))));
                self.currentZoomRatio = self.possibleZooms[self.currentZoom];
                $flowchart.panzoom('zoom', self.currentZoomRatio, { animate: true, focal: evt });
                $flowchart.flowchart('setPositionRatio', self.currentZoomRatio);
                $(".zoom-range").val(self.currentZoomRatio);
            });

            $(".zoom-out").on('click', function(evt) {
                evt.preventDefault();
                let zoomInOut = false;
                self.currentZoom = Math.max(0, Math.min(self.possibleZooms.length - 1, (self.currentZoom + (zoomInOut * 2 - 1))));
                self.currentZoomRatio = self.possibleZooms[self.currentZoom];
                $flowchart.flowchart('setPositionRatio', self.currentZoomRatio);
                $flowchart.panzoom('zoom', self.currentZoomRatio, { animate: true, focal: evt });
                //self.centerView();
                $(".zoom-range").val(self.currentZoomRatio);
            });

            $(".zoom-in").on('click', function(evt) {
                evt.preventDefault();
                let zoomInOut = true;
                self.currentZoom = Math.max(0, Math.min(self.possibleZooms.length - 1, (self.currentZoom + (zoomInOut * 2 - 1))));
                self.currentZoomRatio = self.possibleZooms[self.currentZoom];
                $flowchart.flowchart('setPositionRatio', self.currentZoomRatio);
                $flowchart.panzoom('zoom', self.currentZoomRatio, { animate: true, focal: evt });
                //self.centerView();
                $(".zoom-range").val(self.currentZoomRatio);
            });

            $(".zoom-range").on('change', function(evt) {
                evt.preventDefault();
                let delta = parseInt(self.possibleZooms.indexOf(parseFloat(this.value)));
                //let zoomInOut = delta < self.currentZoom;
                if (delta !== -1 && self.currentZoom !== delta) {
                    self.currentZoom = delta;
                    self.currentZoomRatio = self.possibleZooms[self.currentZoom];
                    $flowchart.panzoom('zoom', self.currentZoomRatio, { animate: true, focal: evt });
                    $app.ultiflow.ufPanzoom.zoom(self.currentZoomRatio);
                }
                //self.centerView();
                self._refreshMiniViewPosition();
            });

            $(".zoom-reset").on('click', function(evt) {
                evt.preventDefault();
                let delta = self.defaultZoom;
                //let zoomInOut = delta < self.currentZoom;
                if (delta !== -1 && self.currentZoom !== delta) {
                    self.currentZoom = delta;
                    self.currentZoomRatio = self.possibleZooms[self.currentZoom];
                    $flowchart.flowchart('setPositionRatio', self.currentZoomRatio);
                    $flowchart.panzoom('zoom', self.currentZoomRatio, { animate: true, focal: evt });
                    $(".zoom-range").val(self.currentZoomRatio);
                }
                self.centerView();
            });

            $("#menu_btn").on('click', function(evt) {
                //console.log('menuState:', self.menuState, evt);
                if (!self.menuState) {
                    self.menuShow(evt);
                } else {
                    self.menuHide(evt);
                }
            });

            let options = self.options;
            options.linkVerticalDecal = 1;
            options.data = this.data;
            options.onAfterChange = function() {
                self.changeDetected();
            };
            options.onOperatorSelect = function(operatorId) {
                app.triggerEvent('ultiflow::operator_select', operatorId);
                return true;
            };
            options.onOperatorUnselect = function() {
                app.triggerEvent('ultiflow::operator_unselect');
                return true;
            };
            options.onLinkSelect = function(linkId) {
                app.triggerEvent('ultiflow::link_select', linkId);
                return true;
            };
            options.onLinkUnselect = function() {
                app.triggerEvent('ultiflow::link_unselect');
                return true;
            };

            //window.ultiflow = ultiflow.ui.flowchart = self;

            // Apply the plugin on a standard, empty div...
            $app.ultiflow.$flowchart = $flowchart.flowchart(options);
            //$flowchart.flowchart('setPositionRatio', self.currentZoomRatio);
            //window.$ufPanzoom.zoom(self.currentZoomRatio);

            $(document).keydown(function(evt) { if (evt.keyCode == 8 && $(':focus').length == 0) { evt.preventDefault(); } });
            $(document).keyup(function(evt) {
                if (evt.keyCode == 8 && $(':focus').length == 0) {
                    self.els.flowchart.flowchart('deleteSelected');
                }
            });
            app.onEvent('ultiflow::process_open', function(evt, processData) {
                //console.log('@ultiflow.uf_flowchart: ultiflow::process_open', processData);
                self.setData(processData.process);
            });
            app.onEvent('ultiflow::delete_selected', function() {
                //console.log('@ultiflow.uf_flowchart: ultiflow::delete_selected: id:', self.flowchartMethod('getSelectedLinkId'));
                self.els.flowchart.flowchart('deleteSelected');
            });

            //$flowchart.$ufPanzoom = $ufPanzoom;
            //ultiflow.flowchart = self;

            $app.ultiflow.flowchart = Object.assign(self, $app.ultiflow.flowchart || {});
            $app.ultiflow.ufPanzoom = Object.assign(self.$ufPanzoom, $app.ultiflow.ufPanzoom || {});
        },

        reset: function() {
            // Destroy/Cleanup all Flowchart Objects
            //console.log('@ultiflow.uf_flowchart: reset!');
            this.setData({ operators: {}, links: {}, operatorTypes: {} });
            //this.els.flowchart.flowchart('destroyLinks');
            this._refreshMiniViewContent();
        },

        centerView: function() {
            this.cx = this.els.flowchart.width() / 2;
            this.cy = this.els.flowchart.height() / 2;
            this.els.flowchart.panzoom('pan', -this.cx + this.element.width() / 2, -this.cy + this.element.height() / 2);
            this._refreshMiniViewPosition();
        },

        _refreshMiniViewPosition: function() {
            _.debounce(() => {
                let elementOffset = this.element.offset();
                let flowchartOffset = this.els.flowchart.offset();
                let flowchartWidth = this.els.flowchart.width();
                let flowchartHeight = this.els.flowchart.height();
                let rTop = (elementOffset.top - flowchartOffset.top) / (flowchartHeight * this.currentZoomRatio);
                let rLeft = (elementOffset.left - flowchartOffset.left) / (flowchartWidth * this.currentZoomRatio);
                let rWidth = this.element.width() / (flowchartWidth * this.currentZoomRatio);
                let rHeight = this.element.height() / (flowchartHeight * this.currentZoomRatio);
                let miniViewWidth = this.els.flowchartMiniView.width();
                let miniViewHeight = this.els.flowchartMiniView.height();
                let _left = ((this.isMousewheel === true) ? ((rLeft * miniViewWidth) + (this.deltaMousewheel * 2)) : (rLeft * miniViewWidth));
                let _top = ((this.isMousewheel === true) ? ((rTop * miniViewHeight) + (this.deltaMousewheel * 2)) : (rTop * miniViewHeight));
                this.els.flowchartMiniViewFocus.css({
                    left: _left,
                    top: _top,
                    width: rWidth * miniViewWidth,
                    height: rHeight * miniViewHeight
                });
            }, 50)();
        },

        _refreshMiniViewContent: function(__data, forcexy = false) {
            //console.log('refreshMiniViewContent:', { this: this, data: __data });
            this.els.flowchartMiniViewContent.empty();

            let flowchartWidth = this.els.flowchart.width();
            let flowchartHeight = this.els.flowchart.height();

            let miniViewWidth = this.els.flowchartMiniView.width();
            let miniViewHeight = this.els.flowchartMiniView.height();

            let operatorsPositions = this.operatorsPositions;

            if (typeof __data != 'undefined') {
                if (typeof __data.operators != 'undefined') {
                    for (let operatorId in __data.operators) {

                        // Save Inputs and Outputs in VARS
                        let _inputs = this.VARS.inputs;
                        let _outputs = this.VARS.outputs;

                        let operator = __data.operators[operatorId];
                        try { _inputs[operatorId] = operator.internal.properties.inputs; } catch (err) {}
                        try { _outputs[operatorId] = operator.internal.properties.outputs; } catch (err) {}

                        if (typeof(operatorsPositions[operatorId]) == 'undefined') operatorsPositions[operatorId] = { opLeft: 0, opTop: 0, left: 0, top: 0 };
                        let operatorPosition = operatorsPositions[operatorId];
                        operatorPosition.opLeft = operator.left;
                        operatorPosition.opTop = operator.top;

                        let operatorElement = this.els.flowchart.flowchart('getOperatorElement', operator); // $app.ultiflow.flowchart.data.operators[operatorId].internal.els.operator;

                        // Restore Inputs and Outputs from VARS
                        operator.internal.properties.inputs = {..._inputs[operatorId], ...operator.internal.properties.inputs };
                        operator.internal.properties.outputs = {..._outputs[operatorId], ...operator.internal.properties.outputs };
                        operator.left = operatorPosition.opLeft;
                        operator.top = operatorPosition.opTop;

                        //if (operator.top > miniViewHeight) { return; } // BugFix: miniview wrong postition
                        //let rLeft = (operator.left + this.cx + operatorElement.width() / 2) / flowchartHeight;
                        //let rTop = (operator.top + this.cy + operatorElement.height() / 2) / flowchartWidth;

                        let rLeft = (operator.left + ((forcexy || !app.ultiflow.flowchart._isStarted()) ? this.cx : 0) + operatorElement.width() / 2) / flowchartHeight;
                        let rTop = (operator.top + ((forcexy || !app.ultiflow.flowchart._isStarted()) ? this.cy : 0) + operatorElement.height() / 2) / flowchartWidth;

                        operatorPosition.left = rLeft * miniViewWidth;
                        operatorPosition.top = rTop * miniViewHeight;

                        let shapeR = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                        shapeR.setAttribute("stroke", "none");
                        shapeR.setAttribute("x", operatorPosition.left - 1);
                        shapeR.setAttribute("y", operatorPosition.top - 1);
                        shapeR.setAttribute("width", 3);
                        shapeR.setAttribute("height", 3);
                        this.els.flowchartMiniViewContent[0].appendChild(shapeR);
                    }
                }

                if (typeof __data.links != 'undefined') {
                    for (let linkId in __data.links) {
                        let link = __data.links[linkId];

                        let fromPosition = operatorsPositions[link.fromOperator];
                        let toPosition = operatorsPositions[link.toOperator];

                        if (typeof(fromPosition) !== 'undefined' && typeof(toPosition) !== 'undefined') {
                            let shapeL = document.createElementNS("http://www.w3.org/2000/svg", "line");
                            shapeL.setAttribute("x1", fromPosition.left);
                            shapeL.setAttribute("y1", fromPosition.top);
                            shapeL.setAttribute("x2", toPosition.left);
                            shapeL.setAttribute("y2", toPosition.top);
                            shapeL.setAttribute("stroke-width", "1");
                            shapeL.setAttribute("stroke", "black");
                            shapeL.setAttribute("fill", "none");
                            this.els.flowchartMiniViewContent[0].appendChild(shapeL);
                        }
                    }
                }
            }

        },

        setData: function(originalData) {
            this.isSettingData = true;
            let self = this;
            self.data = $.extend(true, {}, originalData);
            //self.data.links = ultiflow.data.modulesInfos.operators.list[ultiflow.openedProcess].process.links;

            if (typeof self.data.operators !== 'undefined') {
                for (let operatorId in self.data.operators) {
                    let operator = self.data.operators[operatorId];
                    operator.left += self.cx;
                    operator.top += self.cy;
                    //this.postProcessOperatorData(operator);
                }
            }
            app.ultiflow.getOperators(function(operators) {
                self.data.operatorTypes = operators.list;
                self.els.flowchart.flowchart('setData', self.data);
            });
            self.isSettingData = false;

            self._refreshMiniViewContent(self.data);
            self.centerView();
        },

        getFullData: function() {
            return this.els.flowchart.flowchart('getFullData');
        },
        getData: function() {
            let data = $.extend(true, {}, this.els.flowchart.flowchart('getData'));
            delete data.operatorTypes;
            if (typeof data.operators != 'undefined') {
                for (let operatorId in data.operators) {
                    let operator = data.operators[operatorId];
                    operator.left -= this.cx;
                    operator.top -= this.cy;
                }
            }

            //console.log('getData:', JSON.stringify(data));

            return data;
        },

        addOperator: function(operatorData) {
            this.isSettingData = true;
            if ($app.debug) console.log('@ultiflow.uf_flowchart.addOperator:', JSON.stringify(operatorData), this.els.flowchart);
            //this.postProcessOperatorData(operatorData);
            // todo: check same ids ?

            this.els.flowchart.flowchart('addOperator', operatorData);
            let elm = operatorData.internal.els.operator[0].children[0];

            let currentProcessData = $app.ultiflow.getOpenedProcessData();
            //let flowchartData = this.getData();
            let flowchartData = this.getFullData();

            //console.log('@ultiflow.uf_flowchart.addOperator: currentProcessData:', JSON.stringify(currentProcessData));
            //console.log('@ultiflow.uf_flowchart.addOperator: flowchartData:', JSON.stringify(flowchartData));

            let operatorObjs = Object.assign(Object.keys(flowchartData.operators), Object.keys(currentProcessData.process.parameters));

            for (let operatorId in operatorObjs) {
                //console.log('operatorId:', operatorId);
                let iOperator = flowchartData.operators;
                let iParameter = currentProcessData.process.parameters || [];
                if (typeof iParameter[operatorId] == 'undefined') {
                    let operatorProperties = '';
                    try {
                        if (typeof(iOperator[operatorId]) !== 'undefined') operatorProperties = $app.ultiflow.getOperatorInfos(iOperator[operatorId].type);
                    } catch (err) {
                        console.error('err:', { err: err, iOperator: iOperator, operatorId: operatorId });
                    }
                    currentProcessData.process.parameters[operatorId] = {};
                    let operatorParameters = operatorProperties.parameters;
                    if (typeof(operatorParameters) !== 'undefined') {
                        let propKeys = Object.keys(operatorParameters);
                        for (let propId in propKeys) {
                            //console.log('addOperator:' + operatorId, operatorParameters[propId].id + " := " + operatorParameters[propId].config.default);
                            currentProcessData.process.parameters[operatorId][operatorParameters[propId].id] = (operatorParameters[propId].config) ? (operatorParameters[propId].config.default || '') : '';
                        }
                    }
                }
            }

            /* _DRAG_ Loaded Objects */
            $(elm).on('mousemove', function(evt) {
                    $(this).isDragging = true;
                    if ($(this).isDragging === true && $(this).ismouseDown === true) {
                        $app.ultiflow.ufPanzoom.disable();
                    } else { $app.ultiflow.ufPanzoom.enable(); }
                })
                .on('pointerdown', function(evt) {
                    $(this).isDragging = false;
                    $(this).ismouseDown = true;
                    $app.ultiflow.ufPanzoom.disable();
                })
                .on('pointerup', function(evt) {
                    $(this).isDragging = false;
                    $(this).ismouseDown = false;
                    $app.ultiflow.ufPanzoom.enable();
                })
                .on('mouseup mouseleave touchend', function(evt) {
                    $(this).isDragging = false;
                    $(this).ismouseDown = false;
                    $app.ultiflow.ufPanzoom.enable();
                });

            this.isSettingData = false;
            this.changeDetected();
        },

        getOperatorElement: function(operatorData) {
            //this.postProcessOperatorData(operatorData);
            return this.els.flowchart.flowchart('getOperatorElement', operatorData);
        },

        getOperatorCompleteData: function(operatorData) {
            //this.postProcessOperatorData(operatorData);
            return this.els.flowchart.flowchart('getOperatorCompleteData', operatorData);
        },

        miniViewShow: function() {
            this.els.flowchartMiniViewContent.show();
        },
        miniViewHide: function() {
            this.els.flowchartMiniViewContent.hide();
        },
        changeDetected: function() {
            let self = this;
            let currentProcessData = app.ultiflow.getOpenedProcessData();

            if (this.isSettingData || typeof(currentProcessData) == 'undefined') {
                return;
            }

            let flowchartData = this.getData();
            let flowchartFullData = this.getFullData();
            //let flowchartProcess = $.extend(true, {}, flowchartData);

            currentProcessData.process.operators = flowchartData.operators;
            currentProcessData.process.links = flowchartData.links;

            let operatorObjs = Object.assign(Object.keys(flowchartData.operators), Object.keys(currentProcessData.process.parameters));

            for (let operatorId in operatorObjs) {
                let iOperator = currentProcessData.process.operators;
                if (typeof iOperator[operatorId] == 'undefined') {
                    delete currentProcessData.process.parameters[operatorId];
                } else {
                    let iParameter = currentProcessData.process.parameters;
                    if (typeof iParameter[operatorId] == 'undefined') {
                        let operatorProperties = this.getOperatorInfos(iOperator[operatorId].type);
                        currentProcessData.process.parameters[operatorId] = {};
                        let operatorParameters = operatorProperties.parameters;
                        let propKeys = Object.keys(operatorParameters);
                        for (let propId in propKeys) {
                            //console.log('addOperator:' + operatorId, operatorParameters[propId].id + " := " + operatorParameters[propId].config.default);
                            currentProcessData.process.parameters[operatorId][operatorParameters[propId].id] = (operatorParameters[propId].config) ? (operatorParameters[propId].config.default || '') : '';
                        }
                        //this.data.parameters[operatorId] = currentProcessData.process.parameters[operatorId];
                    }
                    if (this.data.operators[operatorId] || {} !== flowchartFullData.operators[operatorId]) this.data.operators[operatorId] = flowchartFullData.operators[operatorId];
                    if (this.data.links[operatorId] || {} !== flowchartFullData.links[operatorId]) this.data.links[operatorId] = flowchartFullData.links[operatorId];
                }
            }

            // Not needed: solved above in 'BugFix: Update links'
            //self.data.links = Object.assign(self.data.links, currentProcessData.process.links); // # MERGE/UPDATE flowchart.data with new data, but keep internals

            // console.log('changeDetected!', currentProcessData);
            app.triggerEvent('ultiflow::process_change_detected');

            this._refreshMiniViewContent(flowchartData, true);
        },

        flowchartMethod: function(methodName, data) {
            return this.els.flowchart.flowchart(methodName, data);
        }
    });
});