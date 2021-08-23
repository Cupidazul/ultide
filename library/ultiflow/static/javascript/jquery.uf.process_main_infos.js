define(['app'], function(app) {
    $.widget("ultiflow.uf_process_main_infos", {
        options: {},
        els: {
            title: null,
            path: null,
            state: null
        },
        timeoutId: null,

        // the constructor
        _create: function() {
            var self = this;
            if ($app.debug) console.log('@ultiflow.uf_process_main_infos: create! readyState:', document.readyState);

            $app.ultiflow.uf_process_main_infos = self;

            self.els.title = $('<span class="uf-process-title"></span>');
            //this.els.title.appendTo(this.element);

            var BtnCron = `` +
                `        <button id="btn_cronsave" type="button" class="btn btn-default input-group-addon border-left-0" title="Build to Cron" style="max-width: 39px;padding-left: 11px;">` +
                `            <li class="fa fa-box-open"></li>` +
                `        </button>`;

            if (!app.user.is_admin) BtnCron = '';

            var BtnStatus = '<button id="btn_ioStatus" class="btn">PyServer</button>';
            var Btns = $(`` +
                `<div class="col-md-4">` +
                `    <div class="input-group" style="float: left;left: -6px;top: -1px;">` +
                `        <button type="button" class="btn btn-default input-group-addon" title="Settings" onclick="$app.main_view.showView('welcome');">` +
                `            <li class="fa fa-cog"></li>` +
                `        </button>` +
                `        <button id="btn_save" type="button" class="btn btn-default input-group-addon" title="Save">` +
                `            <li class="fa fa-save"></li>` +
                `        </button>` +
                `` + BtnCron +
                `        <button id="btn_play" type="button" class="btn btn-default input-group-addon" title="Run">` +
                `            <li class="fa fa-play"></li>` +
                `        </button>` +
                `    </div>` +
                `    <div class="input-group">` +
                `        <button id="" type="button" class="btn btn-default input-group-addon menuicnBtnfix active" title="Flowchart" style="position: relative;top: -4px;left: -2px;" onclick="$app.main_view.showView('welcome');">` +
                `            <li class="glyphicon glyphicon-blackboard"></li>` +
                `        </button>` +
                `    </div>` +
                `</div>`);
            var BtnSettings = '<button id="btn_settings" title="Settings" class="fa fa-cog" style="width: 30px;font-size: 20px;padding-left: 4px;padding-top: 2px;"></button>';
            var BtnSave = '<button id="btn_save" title="Save" class="fa fa-save" style="width: 30px;font-size: 20px;padding-left: 4px;padding-top: 2px;"></button>';
            var BtnPlay = '<button id="btn_play" title="Run" class="fa fa-play" style="width: 30px;font-size: 20px;padding-left: 4px;padding-top: 2px;"></button>';
            var BtnSelect = ''; //'<select id="btn_code_lang" class="selectpicker" style="font-size: 14px;"><option>Perl</option><option>Python</option></select>';
            self.els.buttons = $(`` +
                `<nobr>` +
                `   <div class="col-md-2">` +
                `       ${BtnStatus}` +
                `   </div>` +
                `</nobr>` +
                `<nobr>` +
                `   <div class="col-md-3" style="float: right;display: flex;top: -1px;">` +
                `       <button title="Zoom Out" class="zoom-out btn btn-default input-group-addon">` +
                `           <li class="glyphicon glyphicon-zoom-out"></li>` +
                `       </button>` +
                `       <button title="Zoom In" class="zoom-in btn btn-default input-group-addon">` +
                `           <li class="glyphicon glyphicon-zoom-in"></li>` +
                `       </button>` +
                `       <button class="input-group-addon" style="width: auto;border-left: none;max-height: 30px;display: flex;">` +
                `           <input type="range" class="zoom-range" step="0.5" min="0.5" max="3" style="max-width: 144px;">` +
                `       </button>` +
                `       <button title="Zoom Reset" class="zoom-reset btn btn-default input-group-addon" style="max-height: 30px;">` +
                `           <li class="glyphicon glyphicon glyphicon-search"></li>` +
                `       </button>` +
                `   </div>` +
                `</nobr>` +
                ``);
            self.els.buttons.appendTo(self.element);
            Btns.prependTo(self.element.children('nobr')[0]);
            self.els.title.appendTo(self.element.children('nobr')[0]); // 'Process Title': should go inside first nobr, topmost position.
            self.els.title.appendTo(self.element.children('nobr').children('div').children('div')[1]);

            self.els.state = $('<span class="uf-process-state" style="position: relative;top: 5px;"><span class="uf-process-state-saving">Saving changes...</span><span class="uf-process-state-saved">Changes saved.</span><span class="uf-process-state-error">Error!</span></span>');
            self.els.state.appendTo(self.element.children('nobr').children('div')[1]);

            //self.els.path = $('<span class="uf-process-path"></span>');
            //self.els.path.appendTo(self.element);

            app.onEvent('ultiflow::process_open', function(evt, operatorData) {
                self.setProcess(operatorData);
            });

            app.onEvent('ultiflow::process_change_detected', function(evt) {
                self.setState('saving');
            });

            app.onEvent('ultiflow::process_saved', function(evt, success) {
                if (success) {
                    self.setState('saved', 3000);
                } else {
                    self.setState('error');
                }
            });

            $('#btn_cronsave').on('mouseover', function() { $('#btn_cronsave').children().first().removeClass('fa-box-open').addClass('fa-box'); });
            $('#btn_cronsave').on('mouseout', function() { $('#btn_cronsave').children().first().removeClass('fa-box').addClass('fa-box-open'); });

            $('#btn_cronsave').click(function() {
                $app.helper.fileChooser({
                    action: 'save',
                    onSelected: function(_fileName) {
                        console.log('btn_cronsave:', { fileName: _fileName });
                        $app.ultiflow.anyCodeSaveCron(_fileName);
                    }
                });
            });
        },

        setProcess: function(process) {
            this.els.title.text(process.title);
            //this.els.path.text(process.path);
        },

        setState: function(state, timeout) {
            if (typeof timeout == 'undefined') {
                timeout = false;
            }
            clearTimeout(this.timeoutId);
            this.els.state.show();
            this.els.state.find('span').hide();
            if (state != false) {
                this.els.state.find('.uf-process-state-' + state).show();
                if (timeout != false) {
                    var self = this;
                    this.timeoutId = setTimeout(function() {
                        self.setState(false);
                    }, timeout);
                }
            }
        }
    });
});