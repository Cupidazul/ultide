define(['app', 'ultiflow', '_', 'ultiflow-lib-jstree'], function(app, ultiflow, _) {
    $.widget("ultiflow.uf_tree", {
        options: {},

        // the constructor
        _create: function() {
            var self = this;
            //console.log('ultiflow.uf_tree:_create:' + self.eventNamespace, self);
            self.id = 'uf_tree' + self.uuid;
            $(self.element)[0].id = self.id;

            window.$ultiflow.$uf_tree = Object.assign(window.$ultiflow.$uf_tree || {}, {
                [self.id]: self
            });

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

                    //console.log('ready.jstree', options, el, this);

                    _.debounce(() => {
                        //console.log('ready.jstree:', el); //, el.find('ul.jstree-container-ul').find('li.jstree-node'));

                        setTimeout(function() {

                            //console.log('ready.jstree1:', el, $(document).find('ul.jstree-container-ul li.jstree-node ul.jstree-children').children());
                            el.jstree('open_all'); // expand/open all jstree's

                            var elDescendant = $('#' + el.prop('id') + ' >ul >li').first().prop('id');

                            // # Click Only Once on Open Project, and resize/close views := Prepare User Environment
                            if (new RegExp('^workspace\-.*', 'g').test(elDescendant)) {

                                var LastId = '';
                                $("a.jstree-anchor").each(function(ElIdx, ElVal) {
                                    var thisTree = this;
                                    //console.dir(ElVal);
                                    //console.log('ready.jstree.elm:', { id: ElVal.id, idx: ElIdx });
                                    if (new RegExp('^workspace\-.*', 'g').test(LastId)) { // Click Open Project on 1st Element after 'Workspace'
                                        _.debounce(function(oElVal) {
                                            console.log('OpenProjDebounced:', { id: oElVal.id, idx: ElIdx });
                                            oElVal.click();
                                            $flowchart.changeDetected(); // BugFix: uf-flowchart-mini-view-focus: update!
                                        }, 1000, { trailing: true })(ElVal);
                                    }
                                    LastId = ElVal.id;
                                    //OpenProjDebounced();
                                    //} // open project
                                });
                                $('.main-view').css('left', '0px');
                                window.$flowchart.menuState = 0;

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

                                setTimeout(function() {
                                    $('.uf-side-bar.right').css('right', String(-($('.uf-side-bar.right').width() + 8) + 'px'));
                                    window.$flowchart.menuState = 0;
                                    $('.uf-side-bar.left').css('left', '-245px');
                                    $('.uf-side-bar.left')
                                        .on('mouseover', function(evt) {
                                            if (typeof(evt.offsetX) !== 'undefined') $('.uf-side-bar.left').css('left', '');
                                        })
                                        .on('mouseout', function(evt) {
                                            //console.log('mouseout!!', evt.offsetX);
                                            if (evt.toElement && evt.toElement.className.baseVal === 'flowchart-links-layer' && !(window.$flowchart.menuState)) {
                                                setTimeout(function() {
                                                    $('.uf-side-bar.left').css('left', '-245px');
                                                }, 350);
                                            }
                                        });
                                }, 350);

                                setTimeout(function() { // Edit Project Title
                                    var EditID = 0;
                                    el.find('a>i').each(function(ElIdx, ElVal) {
                                        console.log('ElVal:', $(ElVal), $(ElVal).parent().attr('role'));
                                        if ($(ElVal).parent().attr('aria-level') === '2') {
                                            var CurrID = $(ElVal).parent().parent().attr('id');
                                            var CurrIsActive = (cid) => { return (cid == $app.ultiflow.processData.id); };
                                            var NewID = CurrID.replace('::', '_');
                                            var thisObjID = NewID + '_s' + EditID;
                                            var inputObjID = NewID + '_i' + EditID;

                                            $(ElVal).attr('id', NewID + '_o' + String(EditID));
                                            $(ElVal).parent().after('<li id="' + thisObjID + '" class="fa fa-pen" style="position: relative;right: 40px;' + String((!CurrIsActive(CurrID)) ? 'display:none;' : '') + '"></li>');

                                            $('#' + thisObjID).parent().on('mouseover', function() {
                                                if (CurrIsActive(CurrID) && // dont edit other inactive Projects for now.
                                                    !$('#' + inputObjID).length) {
                                                    $('#' + thisObjID).show();
                                                }
                                            });
                                            $('#' + thisObjID).parent().on('mouseout', function() {
                                                $('#' + thisObjID).hide();
                                            });
                                            $('#' + thisObjID).parent().on('click', function(evt) {
                                                setTimeout(function() {
                                                    $flowchart.changeDetected(); // BugFix: uf-flowchart-mini-view-focus: update!
                                                    $('#' + thisObjID).show();
                                                }, 0);
                                            });
                                            $('#' + thisObjID).on('click', function() {
                                                var prevText = $('#' + thisObjID).prev().text();
                                                $('#' + thisObjID).hide();
                                                if (!$('#' + inputObjID).length) $('#' + thisObjID).after('<input id="' + inputObjID + '" value="' + prevText + '" style="right: 6px;position: absolute;width: 165px;height: 24px;">');
                                                $('#' + inputObjID).on('keyup', function(evt) {
                                                    if (evt.key == 'Enter') {
                                                        var NewValue = $('#' + inputObjID).val();
                                                        $('#' + thisObjID).prev().html($('#' + thisObjID).prev().html().replace(new RegExp(prevText + '$', 'g'), NewValue));
                                                        $('#' + inputObjID).remove();

                                                        if (CurrIsActive(CurrID)) {
                                                            // CurrID has now been Edited by User and, Yes! its the Active Project!
                                                            ultiflow.editTitle(NewValue);
                                                            $('.uf-process-title').text(NewValue);
                                                        } else {
                                                            // CurrID has now been Edited by User and, NO! its Another Project!
                                                        }
                                                    }
                                                });
                                                /*$('#' + thisObjID).prev().html(
                                                    $('#' + thisObjID).prev().html().replace(new RegExp(prevText + '$', 'g'), prevText + '1')
                                                );*/
                                            });

                                            EditID++;
                                        }
                                    });
                                }, 1000);
                            }

                        }, 500);

                    }, 700, { trailing: true })();

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
                        operatorHelper = window.$flowchart.getOperatorElement(data1);
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

                                var $flowchart = window.$flowchart.els.flowchart;
                                var flowchartOffset = $flowchart.offset();

                                var relativeLeft = elOffset.left - flowchartOffset.left;
                                var relativeTop = elOffset.top - flowchartOffset.top;

                                var positionRatio = $flowchart.flowchart('getPositionRatio');
                                relativeLeft /= positionRatio;
                                relativeTop /= positionRatio;

                                var data1 = { type: data.data.nodes[0] };
                                data1.left = relativeLeft;
                                data1.top = relativeTop;
                                window.$flowchart.addOperator(data1);
                            }
                        }
                    });
            }

        }
    });
});