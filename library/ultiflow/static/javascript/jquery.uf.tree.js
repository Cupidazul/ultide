define(['app', 'ultiflow', '_', 'ultiflow-lib-jstree'], function(app, ultiflow, _) {
    $.widget("ultiflow.uf_tree", {
        options: {},

        // the constructor
        _create: function() {
            var self = this;
            //console.log('ultiflow.uf_tree:_create:' + self.eventNamespace, self);
            self.id = 'uf_tree' + self.uuid;
            $(self.element)[0].id = self.id;

            var defaultOptions = {
                'core': {
                    'animation': false,
                },
                'types': {
                    'default': {
                        'icon': 'static/modules/ultiflow/images/folder.png'
                    },
                    'operator': {
                        'icon': 'static/modules/ultiflow/images/gear.png'
                    },
                    'process': {
                        'icon': 'static/modules/ultiflow/images/gear_combination.png'
                    }
                },
                'plugins': ['types', 'dnd'],
                dnd: {
                    is_draggable: function(node) {
                        // https://stackoverflow.com/questions/31479640/jstree-prevent-drag-from-class
                        // console.log('is_draggable:', node, self);
                        return (node[0].type === 'operator'); // FIX: avoid dragging non operators
                    },
                },
                id: self.id,
                el: self,
            };

            var options = $.extend(true, defaultOptions, self.options);

            self.element.jstree(options)
                .on('ready.jstree', function(evt) {
                    // REMEMBER: ready.jstree Occurs Twice! : library-Demo + workspace-My Project

                    var el = $(evt.target);

                    var elDescendant = $('#' + el.prop('id') + ' >ul >li').first();

                    let checkExist = setInterval(function() {
                        elDescendant = $('#' + el.prop('id') + ' >ul >li').first();
                        if (elDescendant.length) {
                            self.jstreeInit();
                            clearInterval(checkExist);
                        }
                    }, 700);

                    self.jstreeInit = function(_evt) {
                        el.jstree('open_all'); // expand/open all jstree's
                        if ($app.debug) console.log('ready.jstree: [' + String(elDescendant.length) + ']:', options, el, this);

                        // # Click Only Once on Open Project, and resize/close views := Prepare User Environment
                        if (new RegExp('^workspace\-.*', 'g').test(elDescendant.prop('id'))) {
                            var LastId = '';
                            $("a.jstree-anchor").each(function(ElIdx, ElVal) {
                                var thisTree = this;
                                //console.dir(ElVal);
                                //console.log('ready.jstree.elm:', { id: ElVal.id, idx: ElIdx });
                                //if (!$app.ultiflow.flowchart._isStarted() && (new RegExp('^workspace\-.*', 'g').test(LastId))) { // Click Open Project on 1st Element after 'Workspace'
                                if (!$app.ultiflow.flowchart._isStarted()) $app.ultiflow.endLoading(ElVal, _evt);
                                //}
                                //LastId = ElVal;
                            });
                            $('.main-view').css('left', '0px');
                            $app.ultiflow.flowchart.menuState = 0;

                            //$('.uf-side-bar.right').css('right', '-245px');
                            $('.uf-side-bar.right')
                                .resizable({
                                    minWidth: $('.uf-side-bar.right').width(),
                                    maxWidth: 1000,
                                    disabled: true,
                                    handles: "w" // https://api.jqueryui.com/1.8/resizable/#option-handles
                                })
                                .on('resize', function(evt) { // bug-fix: https://bugs.jqueryui.com/ticket/4985
                                    $(evt.target).css('left', '');
                                });

                            $('.uf-side-bar.right').css('right', String(-($('.uf-side-bar.right').width() + 8) + 'px'));
                            $app.ultiflow.flowchart.menuState = 0;
                            $('.uf-side-bar.left').css('left', '-245px');
                            $('.uf-side-bar.left')
                                .on('mouseover', function(evt) {
                                    if (typeof(evt.offsetX) !== 'undefined') $('.uf-side-bar.left').css('left', '');
                                })
                                .on('mouseout', function(evt) {
                                    //console.log('mouseout!!', evt.offsetX);
                                    var evtToElement = (evt.toElement || evt.relatedTarget || evt.target);
                                    if (evtToElement && evtToElement.className.baseVal === 'flowchart-links-layer' && !($app.ultiflow.flowchart.menuState)) {
                                        setTimeout(function() {
                                            self.editTitleStop();
                                            $('.uf-side-bar.left').css('left', '-245px');
                                        }, 350);
                                    }
                                });

                            self.editTitleInit = function() { // Edit Project Title
                                var EditID = 0;
                                var IsEditing = false;
                                el.find('a>i').each(function(ElIdx, ElVal) {
                                    //console.log('ElVal:', $(ElVal), $(ElVal).parent().attr('role'));
                                    if ($(ElVal).parent().attr('aria-level') === '2') {
                                        var CurrID = $(ElVal).parent().parent().attr('id');
                                        var CurrIsActive = (cid) => { if ($app.ultiflow.processData) return (cid == $app.ultiflow.processData.id); };
                                        var NewID = CurrID.replace('::', '_');
                                        var thisObjID = NewID + '_s' + EditID;
                                        var delObjID = NewID + '_d' + EditID;
                                        var inputObjID = NewID + '_i' + EditID;

                                        //var isMouseOver = function() { return $(ElVal).parent().is(':hover'); };
                                        var isMouseOver = function() { return ($('#' + CurrID.replace('::', '\\:\\:') + ':hover').length != 0); };
                                        $(ElVal).attr('id', NewID + '_o' + String(EditID));

                                        var ElStyle = 'position: relative; right: 54px; font-size: 10px; vertical-align: top; background: white; border-radius: 5px; border: 2px solid lightblue; width: 15px; height: 15px; padding-left: 2px;' + String(Boolean(CurrIsActive(CurrID) || !isMouseOver()) ? 'display:none;' : '');
                                        $(ElVal).parent().after('<li id="' + delObjID + '" class="fa fa-times"' + ((String(EditID) === '0') ? ' disabled="disabled"' : '') + ' style="' + ElStyle + '"></li>');

                                        ElStyle = 'position: relative; right: 53px; vertical-align: top; background: white; border-radius: 5px; border: 2px solid lightblue; width: 15px; height: 15px; font-size: 8px; padding-left: 2px; padding-top: 1px;' + String(Boolean(CurrIsActive(CurrID) || !isMouseOver()) ? 'display:none;' : '');
                                        $(ElVal).parent().after('<li id="' + thisObjID + '" class="fa fa-pen" style="' + ElStyle + '"></li>');

                                        $('#' + thisObjID).parent().on('mouseover', function() {
                                            if (!IsEditing && CurrIsActive(CurrID)) { // dont edit other inactive Projects for now.
                                                $('#' + thisObjID).show();
                                                $('#' + delObjID).show();
                                            }
                                        });
                                        $('#' + thisObjID).parent().on('mouseout', function() {
                                            $('#' + thisObjID).hide();
                                            $('#' + delObjID).hide();
                                        });
                                        $('#' + thisObjID).parent().on('click', function(evt) {
                                            $app.triggerEvent('ultiflow::operator_unselect');
                                            if (IsEditing) {
                                                evt.stopImmediatePropagation();
                                                //evt.preventDefault();
                                            }
                                            setTimeout(function() {
                                                $app.ultiflow.flowchart.changeDetected(); // BugFix: uf-flowchart-mini-view-focus: update!
                                                if (!IsEditing && isMouseOver()) {
                                                    $('#' + thisObjID).show();
                                                    $('#' + delObjID).show();
                                                }
                                            }, 0);
                                        });
                                        self.editTitleStop = function() {
                                            if (IsEditing) {
                                                IsEditing = false;
                                                $('#' + self._editTitleID).remove();
                                                self._editTitleID = '';
                                            }
                                        };
                                        self.editTitleStart = function() {
                                            IsEditing = true;
                                            self._editTitleID = inputObjID;
                                            var prevText = $('#' + thisObjID).prev().text();

                                            $('#' + thisObjID).hide();
                                            $('#' + delObjID).hide();

                                            if (!$('#' + inputObjID).length) {
                                                $('#' + thisObjID).after('<input id="' + inputObjID + '" value="' + prevText + '" style="right: 6px;position: absolute;width: 165px;height: 24px;">');
                                                $('#' + inputObjID).focus();
                                                var fldLength = $('#' + inputObjID).val().length;
                                                $('#' + inputObjID)[0].setSelectionRange(fldLength, fldLength); // cursor to end!
                                            }
                                            $('#' + inputObjID).on('keyup', function(evt) {
                                                if (evt.key == 'Enter') {
                                                    var NewValue = $('#' + inputObjID).val();
                                                    if (NewValue !== prevText) {
                                                        $('#' + thisObjID).prev().html($('#' + thisObjID).prev().html().replace(new RegExp(prevText + '$', 'g'), NewValue));
                                                        if (CurrIsActive(CurrID)) {
                                                            // CurrID has now been Edited by User and, Yes! its the Active Project!
                                                            ultiflow.renameTitle(NewValue);
                                                            $('.uf-process-title').text(NewValue);
                                                        } else {
                                                            // CurrID has now been Edited by User and, NO! its Another Project!
                                                            console.log('Error: We should never get here!');
                                                        }
                                                    }
                                                    self.editTitleStop();
                                                } else if (evt.key == 'Escape') {
                                                    // Abort Edit
                                                    self.editTitleStop();
                                                } else {
                                                    if ($app.debug) console.log('@uf.tree: edit.Key:', evt.key);
                                                }
                                            });
                                            /*$('#' + thisObjID).prev().html(
                                                $('#' + thisObjID).prev().html().replace(new RegExp(prevText + '$', 'g'), prevText + '1')
                                            );*/
                                        };
                                        self.deleteProject = function(dEvt) {
                                            if ($(dEvt.target).attr('disabled')) { // If Button Disabled! Avoid deleting First Project!
                                                return false;
                                            } else {
                                                var delObj = $(dEvt.target).parent();
                                                //console.log('deleteProject:', { this: this, event: dEvt, parent: this.parent().attr('id') });
                                                var PrjFile = '';
                                                try { PrjFile = "\n\nProject:\n" + ultiflow.data.modulesInfos.operators.list[delObj.attr('id')].path; } catch (err) {}
                                                var dRes = confirm("Confirm delete " + delObj.attr('id') + ' := ' + delObj.text() + " !\n\n" + 'WARNING: Undo is impossible, because files and directories will be deleted!!!' + PrjFile);
                                                //console.log('deleteProject:', { result: dRes });
                                                if (dRes) {
                                                    ultiflow.deleteProject(delObj.attr('id'));
                                                }
                                            }
                                        };

                                        $('#' + thisObjID).on('click', self.editTitleStart);
                                        $('#' + delObjID).on('click', self.deleteProject);

                                        EditID++;
                                    }
                                });
                            };

                            self.editTitleInit();
                        }
                    };

                });

            // https://groups.google.com/forum/#!topic/jstree/BYppISuCFRE
            /*
            $('.drag')
            .on('mousedown', function (e) {
                console.log(e);
                return $.vakata.dnd.start(e, { 'jstree' : true, 'obj' : $(this), 'nodes' : [{ id : true, text: $(this).text() }] }, '<div id="jstree-dnd" class="jstree-default"><i class="jstree-icon jstree-er"></i>' + $(this).text() + ' (titi)</div>');
            });
            */

            var defaultHelper = null;
            var operatorHelper = null;

            if (typeof document.__uftreeInitialized == 'undefined')  {
                document.__uftreeInitialized = true;
                $(document)
                    .on('dnd_start.vakata', function(evt, data) {
                        //console.log('ultiflow.uf_tree:dnd_start.vakata:', evt, data);
                        var data1 = { type: data.data.nodes[0] };
                        operatorHelper = $app.ultiflow.flowchart.getOperatorElement(data1);
                        defaultHelper = null;
                    })
                    .on('dnd_move.vakata', function(evt, data) {
                        //console.log('ultiflow.uf_tree:dnd_move.vakata:', evt, data);
                        if (defaultHelper == null) {
                            defaultHelper = data.helper.html();
                        }
                        var t = $(data.event.target);
                        if (!t.closest('.jstree').length) {
                            if (t.closest('.uf-flowchart').length) {
                                //data.helper.find('.jstree-icon').removeClass('jstree-er').addClass('jstree-ok');
                                data.helper.html(operatorHelper);
                            } else {
                                data.helper.html(defaultHelper);
                                //data.helper.find('.jstree-icon').removeClass('jstree-ok').addClass('jstree-er');
                            }
                        }
                    })
                    .on('dnd_stop.vakata', function(evt, data) {
                        //console.log('ultiflow.uf_tree:dnd_stop.vakata:', evt, data);
                        var t = $(data.event.target);
                        if (!t.closest('.jstree').length) {
                            if (t.closest('.uf-flowchart').length) {
                                var elOffset = data.helper.offset();

                                var $flowchart = $app.ultiflow.flowchart.els.flowchart;
                                var flowchartOffset = $flowchart.offset();

                                var relativeLeft = elOffset.left - flowchartOffset.left;
                                var relativeTop = elOffset.top - flowchartOffset.top;

                                var positionRatio = $flowchart.flowchart('getPositionRatio');
                                relativeLeft /= positionRatio;
                                relativeTop /= positionRatio;

                                var data1 = { type: data.data.nodes[0] };
                                data1.left = relativeLeft;
                                data1.top = relativeTop;
                                $app.ultiflow.flowchart.addOperator(data1);
                            }
                        }
                    });
            }

            app.ultiflow.$uf_tree = Object.assign(app.ultiflow.$uf_tree || {}, {
                [self.id]: self
            });

        }
    });
});