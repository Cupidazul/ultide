define(['app', 'ultiflow', 'ultiflow-lib-jstree'], function(app, ultiflow) {
    $.widget("ultiflow.uf_tree", {
        options: {},

        // the constructor
        _create: function() {
            var self = this;

            //console.log('ultiflow.uf_tree:_create:', self);

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
            };

            var options = $.extend(true, defaultOptions, this.options);

            this.element.jstree(options)
                .on('ready.jstree', function(evt) {
                    var el = $(evt.target);
                    //console.log('ready.jstree:', el, el.find('ul.jstree-container-ul').find('li.jstree-node'));

                    setTimeout(function() {
                        //console.log('ready.jstree1:', el, $(document).find('ul.jstree-container-ul li.jstree-node ul.jstree-children').children());
                        el.jstree('open_all');
                        $("a.jstree-anchor").each(function(ElIdx, ElVal) {
                            //console.log('elm:', ElIdx, ElVal.id);
                            if (ElVal.id == 'custom::custom_process_anchor') { ElVal.click(); }
                        });
                        // $(document.getElementById('custom::custom_process_anchor')).click();
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
                            .on('resize', function() { $(this).css({ left: '' }); }); // bug-fix: https://bugs.jqueryui.com/ticket/4985

                        setTimeout(function() {
                            $('.uf-side-bar.right').css('right', String(-($('.uf-side-bar.right').width() + 8) + 'px'));
                            window.$flowchart.menuState = 0;
                            $('.uf-side-bar.left').css('left', '-245px');
                            $('.uf-side-bar.left')
                                .on('mouseover', function(evt) {
                                    $('.uf-side-bar.left').css('left', '');
                                })
                                .on('mouseout', function(evt) {
                                    //console.log('mouseout!!', evt.offsetX);
                                    if (evt.toElement && evt.toElement.className.baseVal === 'flowchart-links-layer' && !window.$flowchart.menuState) {
                                        setTimeout(function() {
                                            $('.uf-side-bar.left').css('left', '-245px');
                                        }, 350);
                                    }
                                });
                        }, 350);
                    }, 500);
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
                    .on('dnd_start.vakata', function(e, data) {
                        var data1 = { type: data.data.nodes[0] };
                        operatorHelper = ultiflow.ui.flowchart.getOperatorElement(data1);
                        defaultHelper = null;
                    })
                    .on('dnd_move.vakata', function(e, data) {
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
                    .on('dnd_stop.vakata', function(e, data) {
                        var t = $(data.event.target);
                        if (!t.closest('.jstree').length) {
                            if (t.closest('.uf-flowchart').length) {
                                var elOffset = data.helper.offset();

                                var $flowchart = ultiflow.ui.flowchart.els.flowchart;
                                var flowchartOffset = $flowchart.offset();

                                var relativeLeft = elOffset.left - flowchartOffset.left;
                                var relativeTop = elOffset.top - flowchartOffset.top;

                                var positionRatio = $flowchart.flowchart('getPositionRatio');
                                relativeLeft /= positionRatio;
                                relativeTop /= positionRatio;

                                var data1 = { type: data.data.nodes[0] };
                                data1.left = relativeLeft;
                                data1.top = relativeTop;
                                ultiflow.ui.flowchart.addOperator(data1);
                            }
                        }
                    });
            }





        }
    });
});