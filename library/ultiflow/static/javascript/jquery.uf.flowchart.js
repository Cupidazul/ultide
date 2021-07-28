define([
    'app',
    'ultiflow',
    'ultiflow-lib-mousewheel',
    'ultiflow-lib-panzoom',
    'ultiflow-lib-flowchart'
], function(app, ultiflow) {
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

        _isStarted: function(val) {
            if (typeof(val)) this.isStarted = val;
            return this.isStarted;
        },
        // the constructor
        _create: function() {
            console.log('@ultiflow.uf_flowchart: create! readyState:', document.readyState);

            var $flowchart = $('<div class="uf-flowchart"></div>');
            this.els.flowchart = $flowchart;
            this.element.append(this.els.flowchart);

            var $flowchartMiniView = $('<div class="uf-flowchart-mini-view"></div>');
            this.els.flowchartMiniView = $flowchartMiniView;
            this.element.append(this.els.flowchartMiniView);

            this.els.flowchartMiniViewContent = $('<svg class="uf-flowchart-mini-view-content"></svg>');
            this.els.flowchartMiniViewContent.appendTo(this.els.flowchartMiniView);

            var $flowchartMiniViewFocus = $('<div class="uf-flowchart-mini-view-focus"></div>');
            this.els.flowchartMiniViewFocus = $flowchartMiniViewFocus;
            this.els.flowchartMiniView.append(this.els.flowchartMiniViewFocus);

            var $container = this.element;
            var self = this;

            // Panzoom initialization...
            //$flowchart.panzoom({

            self.$ufPanzoom = $.Panzoom($('.uf-flowchart')[0], {
                minScale: 0.5,
                maxScale: 3,
                increment: 0.5,
                linearZoom: true,
                isSVG: true,
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

            //$flowchart.$ufPanzoom = $ufPanzoom;
            window.$flowchart = self;
            window.$ufPanzoom = self.$ufPanzoom;
            $(".zoom-range").val(self.currentZoomRatio);

            // Centering panzoom
            self.centerView();

            // Panzoom zoom handling...
            $container.on('mousewheel.focal', function(evt) {
                evt.preventDefault();
                var delta = (evt.delta || evt.originalEvent.wheelDelta) || evt.originalEvent.detail;
                var zoomOut = !(delta ? delta < 0 : evt.originalEvent.deltaY > 0);
                self.currentZoom = Math.max(0, Math.min(self.possibleZooms.length - 1, (self.currentZoom + (zoomOut * 2 - 1))));
                self.currentZoomRatio = self.possibleZooms[self.currentZoom];
                $flowchart.flowchart('setPositionRatio', self.currentZoomRatio);
                $flowchart.panzoom('zoom', self.currentZoomRatio, {
                    animate: false,
                    focal: evt
                });
                $(".zoom-range").val(self.currentZoomRatio);
            });

            $(".zoom-out").on('click', function(evt) {
                evt.preventDefault();
                var zoomInOut = false;
                self.currentZoom = Math.max(0, Math.min(self.possibleZooms.length - 1, (self.currentZoom + (zoomInOut * 2 - 1))));
                self.currentZoomRatio = self.possibleZooms[self.currentZoom];
                self.centerView();
                $flowchart.flowchart('setPositionRatio', self.currentZoomRatio);
                $flowchart.panzoom('zoom', self.currentZoomRatio, {
                    animate: false,
                    focal: evt
                });
                $(".zoom-range").val(self.currentZoomRatio);
            });

            $(".zoom-in").on('click', function(evt) {
                evt.preventDefault();
                var zoomInOut = true;
                self.currentZoom = Math.max(0, Math.min(self.possibleZooms.length - 1, (self.currentZoom + (zoomInOut * 2 - 1))));
                self.currentZoomRatio = self.possibleZooms[self.currentZoom];
                self.centerView();
                $flowchart.flowchart('setPositionRatio', self.currentZoomRatio);
                $flowchart.panzoom('zoom', self.currentZoomRatio, {
                    animate: false,
                    focal: evt
                });
                $(".zoom-range").val(self.currentZoomRatio);
            });

            $(".zoom-range").on('change', function(evt) {
                evt.preventDefault();
                var delta = parseInt(self.possibleZooms.indexOf(parseFloat(this.value)));
                //var zoomInOut = delta < self.currentZoom;
                if (delta !== -1 && self.currentZoom !== delta) {
                    self.currentZoom = delta;
                    self.currentZoomRatio = self.possibleZooms[self.currentZoom];
                    self.centerView();
                    $flowchart.flowchart('setPositionRatio', self.currentZoomRatio);
                    /*$flowchart.panzoom('zoom', self.currentZoomRatio, {
                        animate: false,
                        focal: evt
                    });*/
                    window.$ufPanzoom.zoom(self.currentZoomRatio);
                }
                self._refreshMiniViewPosition();
            });

            $(".zoom-reset").on('click', function(evt) {
                evt.preventDefault();
                var delta = self.defaultZoom;
                //var zoomInOut = delta < self.currentZoom;
                self.centerView();
                if (delta !== -1 && self.currentZoom !== delta) {
                    self.currentZoom = delta;
                    self.currentZoomRatio = self.possibleZooms[self.currentZoom];
                    $flowchart.flowchart('setPositionRatio', self.currentZoomRatio);
                    /*$flowchart.panzoom('zoom', self.currentZoomRatio, {
                        animate: false,
                        focal: evt
                    });*/
                    window.$ufPanzoom.zoom(self.currentZoomRatio);
                    $(".zoom-range").val(self.currentZoomRatio);
                }
            });

            $("#menu_btn").on('click', function(evt) {
                //console.log('menuState:', self.menuState, evt);
                if (!self.menuState) {
                    // Show
                    self.menuState = 1;
                    $('.main-view').css('left', '100px');
                    $('.navbar-fixed-left').css('z-index', '1');
                    setTimeout(function() { $('.uf-side-bar.left').css('left', ''); }, 400);
                    if (!$('#view_welcome').is(':hidden')) $('.navbar.navbar-fixed-left').animate({ left: "+=100" }, 300);
                } else {
                    // Hide
                    self.menuState = 0;
                    $('.navbar-fixed-left').css('z-index', '');
                    $('.main-view').css('left', '0px');
                    setTimeout(function() { $('.uf-side-bar.left').css('left', '-245px'); }, 400);
                    if (!$('#view_welcome').is(':hidden')) $('.navbar.navbar-fixed-left').animate({ left: "-=100" }, 300);
                }
            });

            this.data = {};

            var options = self.options;
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
            $flowchart.flowchart(options);
            //$flowchart.flowchart('setPositionRatio', self.currentZoomRatio);
            //window.$ufPanzoom.zoom(self.currentZoomRatio);

            $(document).keydown(function(evt) { if (evt.keyCode == 8 && $(':focus').length == 0) { evt.preventDefault(); } });
            $(document).keyup(function(evt) { if (evt.keyCode == 8 && $(':focus').length == 0) { self.els.flowchart.flowchart('deleteSelected'); } });
            app.onEvent('ultiflow::process_open', function(evt, processData) { self.setData(processData.process); });
            app.onEvent('ultiflow::delete_selected', function() { self.els.flowchart.flowchart('deleteSelected'); });

        },

        centerView: function() {
            this.cx = this.els.flowchart.width() / 2;
            this.cy = this.els.flowchart.height() / 2;
            this.els.flowchart.panzoom('pan', -this.cx + this.element.width() / 2, -this.cy + this.element.height() / 2);
            this._refreshMiniViewPosition();
        },

        _refreshMiniViewPosition: function() {
            var elementOffset = this.element.offset();
            var flowchartOffset = this.els.flowchart.offset();
            var flowchartWidth = this.els.flowchart.width();
            var flowchartHeight = this.els.flowchart.height();
            var rTop = (elementOffset.top - flowchartOffset.top) / (flowchartHeight * this.currentZoomRatio);
            var rLeft = (elementOffset.left - flowchartOffset.left) / (flowchartWidth * this.currentZoomRatio);
            var rWidth = this.element.width() / (flowchartWidth * this.currentZoomRatio);
            var rHeight = this.element.height() / (flowchartHeight * this.currentZoomRatio);
            var miniViewWidth = this.els.flowchartMiniView.width();
            var miniViewHeight = this.els.flowchartMiniView.height();
            this.els.flowchartMiniViewFocus.css({
                left: rLeft * miniViewWidth,
                top: rTop * miniViewHeight,
                width: rWidth * miniViewWidth,
                height: rHeight * miniViewHeight
            });
        },

        _refreshMiniViewContent: function(data) {
            //console.log('refreshMiniViewContent:', { this: this, data: data });
            this.els.flowchartMiniViewContent.empty();

            var flowchartWidth = this.els.flowchart.width();
            var flowchartHeight = this.els.flowchart.height();

            var miniViewWidth = this.els.flowchartMiniView.width();
            var miniViewHeight = this.els.flowchartMiniView.height();

            var operatorsPositions = {};
            var numOp = 0;

            if (typeof data.operators != 'undefined') {
                for (var operatorId in data.operators) {
                    //console.log('numOp:', numOp);
                    var operator = data.operators[operatorId];
                    var operatorElement = this.getOperatorElement(operator);
                    if (operator.top > miniViewHeight) { return; } // BugFix: miniview wrong postition
                    var rLeft = (operator.left + this.cx + operatorElement.width() / 2) / flowchartHeight;
                    var rTop = (operator.top + this.cy + operatorElement.height() / 2) / flowchartWidth;

                    operatorPosition = { left: rLeft * miniViewWidth, top: rTop * miniViewHeight };
                    operatorsPositions[operatorId] = operatorPosition;

                    var shapeR = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    shapeR.setAttribute("stroke", "none");
                    shapeR.setAttribute("x", operatorPosition.left - 1);
                    shapeR.setAttribute("y", operatorPosition.top - 1);
                    shapeR.setAttribute("width", 3);
                    shapeR.setAttribute("height", 3);
                    this.els.flowchartMiniViewContent[0].appendChild(shapeR);
                    numOp++;
                }
            }

            if (typeof data.links != 'undefined') {
                for (var linkId in data.links) {
                    var link = data.links[linkId];

                    var fromPosition = operatorsPositions[link.fromOperator];
                    var toPosition = operatorsPositions[link.toOperator];

                    if (typeof(fromPosition) !== 'undefined' && typeof(toPosition) !== 'undefined') {
                        var shapeL = document.createElementNS("http://www.w3.org/2000/svg", "line");
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

        },

        setData: function(originalData) {
            //console.log('setData:', JSON.stringify(originalData));
            this.isSettingData = true;
            var self = this;
            self.data = $.extend(true, {}, originalData);

            if (typeof self.data.operators != 'undefined') {
                for (var operatorId in self.data.operators) {
                    var operator = self.data.operators[operatorId];
                    operator.left += self.cx;
                    operator.top += self.cy;
                    //this.postProcessOperatorData(operator);
                }
            }
            ultiflow.getOperators(function(operators) {
                self.data.operatorTypes = operators.list;
                self.els.flowchart.flowchart('setData', self.data);
            });
            self.isSettingData = false;

            self._refreshMiniViewContent(self.data);
            self.centerView();
        },

        getData: function() {
            var data = this.els.flowchart.flowchart('getData');
            delete data.operatorTypes;
            if (typeof data.operators != 'undefined') {
                for (var operatorId in data.operators) {
                    var operator = data.operators[operatorId];
                    operator.left -= this.cx;
                    operator.top -= this.cy;
                }
            }

            //console.log('getData:', JSON.stringify(data));

            return data;
        },

        addOperator: function(operatorData) {
            this.isSettingData = true;
            console.log('addOperator:', JSON.stringify(operatorData));
            //this.postProcessOperatorData(operatorData);
            // todo: check same ids ?

            this.els.flowchart.flowchart('addOperator', operatorData);
            var elm = operatorData.internal.els.operator[0].children[0];

            var currentProcessData = ultiflow.getOpenedProcessData();
            var flowchartData = this.getData();

            //console.log('currentProcessData:', JSON.stringify(currentProcessData));
            //console.log('flowchartData:', JSON.stringify(flowchartData));

            var operatorObjs = Object.keys(flowchartData.operators);
            if (Object.keys(currentProcessData.process.parameters).length > operatorObjs.length) { operatorObjs = Object.keys(currentProcessData.process.parameters); }

            for (var operatorId in operatorObjs) {
                //console.log('operatorId:', operatorId);
                var iOperator = flowchartData.operators;
                var iParameter = currentProcessData.process.parameters || [];
                if (typeof iParameter[operatorId] == 'undefined') {
                    var operatorProperties = '';
                    try {
                        operatorProperties = ultiflow.getOperatorInfos(iOperator[operatorId].type);
                    } catch (err) {
                        console.error('err:', { err: err, iOperator: iOperator, operatorId: operatorId });
                    }
                    currentProcessData.process.parameters[operatorId] = {};
                    var operatorParameters = operatorProperties.parameters;
                    if (typeof(operatorParameters) !== 'undefined') {
                        var propKeys = Object.keys(operatorParameters);
                        for (var propId in propKeys) {
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
                        $ufPanzoom.disable();
                    } else { $ufPanzoom.enable(); }
                })
                .on('pointerdown', function(evt) {
                    $(this).isDragging = false;
                    $(this).ismouseDown = true;
                    $ufPanzoom.disable();
                })
                .on('pointerup', function(evt) {
                    $(this).isDragging = false;
                    $(this).ismouseDown = false;
                    $ufPanzoom.enable();
                })
                .on('mouseup mouseleave touchend', function(evt) {
                    $(this).isDragging = false;
                    $(this).ismouseDown = false;
                    $ufPanzoom.enable();
                });

            this.isSettingData = false;
            this.changeDetected();
        },

        getOperatorElement: function(operatorData) {
            //this.postProcessOperatorData(operatorData);
            return this.els.flowchart.flowchart('getOperatorElement', operatorData);
        },

        miniViewShow: function() {
            this.els.flowchartMiniViewContent.show();
        },
        miniViewHide: function() {
            this.els.flowchartMiniViewContent.hide();
        },
        changeDetected: function() {
            var self = this;
            var currentProcessData = ultiflow.getOpenedProcessData();

            if (this.isSettingData || typeof(currentProcessData) == 'undefined') {
                return;
            }

            var flowchartData = this.getData();
            var flowchartProcess = $.extend(true, {}, flowchartData);

            currentProcessData.process.operators = flowchartData.operators;
            currentProcessData.process.links = flowchartData.links;

            var operatorObjs = Object.keys(currentProcessData.process.operators);
            if (Object.keys(currentProcessData.process.parameters).length > operatorObjs.length) { operatorObjs = Object.keys(currentProcessData.process.parameters); }
            for (var operatorId in operatorObjs) {
                var iOperator = currentProcessData.process.operators;
                var iParameter = currentProcessData.process.parameters;
                if (typeof iOperator[operatorId] == 'undefined') {
                    delete currentProcessData.process.parameters[operatorId];
                } else if (typeof iParameter[operatorId] == 'undefined') {
                    var operatorProperties = ultiflow.getOperatorInfos(iOperator[operatorId].type);
                    currentProcessData.process.parameters[operatorId] = {};
                    var operatorParameters = operatorProperties.parameters;
                    var propKeys = Object.keys(operatorParameters);
                    for (var propId in propKeys) {
                        //console.log('addOperator:' + operatorId, operatorParameters[propId].id + " := " + operatorParameters[propId].config.default);
                        currentProcessData.process.parameters[operatorId][operatorParameters[propId].id] = (operatorParameters[propId].config) ? (operatorParameters[propId].config.default || '') : '';
                    }

                }
            }

            // console.log('changeDetected!', currentProcessData);
            app.triggerEvent('ultiflow::process_change_detected');

            this._refreshMiniViewContent(flowchartData);
        },

        flowchartMethod: function(methodName, data) {
            return this.els.flowchart.flowchart(methodName, data);
        }
    });
});