define([
    'app',
    'ultiflow-design-view',
    'ultiflow-process-main-infos',
    'ultiflow-propbar',
    'ultiflow-toolbar',
    'ultiflow-flowchart'
], function(app) {
    $(function() {
        $.widget("ultiflow.uf_design_view", {
            options: {},
            els: {
                toolBar: null,
                flowchart: null,
                propBar: null,
                processMainInfos: null
            },
            state: null,

            // the constructor
            _create: function() {
                var self = this;
                if ($app.debug) console.log('@ultiflow.uf_design_view: create! readyState:', document.readyState);

                app.ultiflow.uf_design_view = self;

                this.els.toolBar = $('<div class="uf-side-bar left uf-toolbar"></div>');
                this.els.toolBar.appendTo(this.element);
                this.els.toolBar.uf_toolbar();

                this.els.processMainInfos = $('<div class="uf-process-main-infos"></div>');
                this.els.processMainInfos.appendTo(this.element);
                this.els.processMainInfos.uf_process_main_infos();

                this.els.flowchart = $('<div class="uf-flowchart-container"></div>');
                this.els.flowchart.appendTo(this.element);
                this.els.flowchart.uf_flowchart();

                this.els.propBar = $('<div class="uf-side-bar right uf-propbar"></div>');
                this.els.propBar.appendTo(this.element);
                this.els.propBar.uf_propbar();

                this.els.flowchartNoFile = $('<div class="uf-flowchart-no-file"></div>');
                this.els.flowchartNoFile.append('<div class="inside"><span class="main_text">No process is loaded. Please open a process in your workspace.</span></div>');
                this.els.flowchartNoFile.appendTo(this.element);

                this.changeState('unopened');

                app.onEvent('ultiflow::process_open', function(_evt, _processData) {
                    self.changeState('opened');
                    //$('.ui-draggable-handle').on('mousemove',  function(evt) { evt.stopPropagation(); $app.ultiflow.ufPanzoom.disable(); })
                    //                        .on('mouseleave', function(evt) { evt.stopPropagation(); $app.ultiflow.ufPanzoom.enable();  });

                    /* _DRAG_ Loaded Objects */
                    $('.ui-draggable-handle')
                        .on('mousemove', function(evt) {
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

                });

                $('#btn_add_library').on('click', function(evt) {
                    // console.log('btn_add_library.click:', evt);
                    Object.keys(app.ultiflow.$uf_tree).forEach(function(el) { try { app.ultiflow.$uf_tree[el].editTitleStop(); } catch (err) {} });
                    app.triggerEvent('ultiflow::operator_unselect');
                    $app.ultiflow.addLibraryOp();
                });

                $('#btn_add_workspace').on('click', function(evt) {
                    // console.log('btn_add_workspace.click:', evt);
                    Object.keys(app.ultiflow.$uf_tree).forEach(function(el) { try { app.ultiflow.$uf_tree[el].editTitleStop(); } catch (err) {} });
                    app.triggerEvent('ultiflow::operator_unselect');
                    $app.ultiflow.addWorkspaceOp();
                });

                //console.log('uf_design_view:', self);
                $('#btn_play').on('click', function(evt) {
                    //console.log('btn_play:', evt);
                    //var whatCode = $('#btn_code_lang').val();
                    //if (whatCode == 'Perl') $app.ultiflow.PerlCodeRun();
                    //if (whatCode == 'Python') $app.ultiflow.PythonCodeRun();

                    // Clear: codeInfo previous Results.
                    Object.keys($app.ultiflow.flowchart.data.operators).forEach(function(elIdx) { $('#codeInfo' + String(elIdx)).remove(); });
                    $app.ultiflow.CodeRunning(); // Rotate cog
                    $app.ultiflow.anyCodeRun(); // RUN !

                    // Alert: if Running time exceeds 5 secs !!!
                    setTimeout(function() {
                        if ($app.ultiflow.Codeisrunning) {
                            var codeInfoAlert = $('<li class="btn fa fa-exclamation-triangle code-info-btn-alert"></li>');
                            codeInfoAlert.appendTo($('.uf-process-main-infos >nobr .input-group').first());
                            codeInfoAlert.on('click', function(evt) {
                                evt.stopImmediatePropagation();
                                return false;
                            });
                            $('#btn_play').prop('disabled', false);
                        }
                    }, 5000);
                });
                app.ultiflow.CodeRunning = function() {
                    $app.ultiflow.Codeisrunning = true;
                    $('#btn_play').prop('disabled', true);
                    $('#btn_play').children().removeClass('fa-play').addClass('fa-cog fa-spin');
                };
                app.ultiflow.CodeFinished = function(codeResult) {
                    $app.ultiflow.Codeisrunning = false;
                    $('.code-info-btn-alert').remove();
                    $('#btn_play').prop('disabled', false);
                    var flowchartFullData = $app.ultiflow.flowchart.getFullData();
                    Object.keys(codeResult).forEach(function(elIdx) {
                        if (Number.isInteger(Number(elIdx))) {
                            $('#codeInfo' + String(elIdx)).remove();
                            var codeInfo = $('<li id="codeInfo' + String(elIdx) + '" class="btn fa fa-info-circle code-info-btn-info"></li>');
                            codeInfo.appendTo(flowchartFullData.operators[elIdx].internal.els.title);
                            codeInfo.data('opID', elIdx);
                            codeInfo.on('click', function(evt) {
                                evt.stopImmediatePropagation();
                                var evtToElement = (evt.toElement || evt.relatedTarget || evt.target);
                                $app.ultiflow.showCodeRunInfo($(evtToElement).data('opID'));
                                return false;
                            });
                        }
                    });
                    $('#btn_play').children().removeClass('fa-cog fa-spin').addClass('fa-play');
                };

                $('#btn_save').on('click', function(evt) {
                    //console.log('btn_save:', evt);
                    $app.ultiflow.saveCurrentProcess(function(success) {
                        app.triggerEvent('ultiflow::process_saved', success);
                    });
                });

                $('#btn_settings').on('click', function(evt) {
                    $('#main_navBar_welcome').click();
                });

            },

            changeState: function(newState) {
                this.element.removeClass(this.state).addClass(newState);
                this.state = newState;
            },
        });
    });
});