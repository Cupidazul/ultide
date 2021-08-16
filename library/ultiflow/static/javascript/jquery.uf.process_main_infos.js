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

            var BtnStatus = '<button id="btn_ioStatus" class="btn">PyServer</button>';
            var Btns = $(`` +
                `
<div class="col-md-4">
    <div class="input-group" style="float: left;left: -6px;top: -1px;">
        <button type="button" class="btn btn-default btn input-group-addon" title="Settings" onclick="$app.main_view.showView('welcome');">
            <li class="fa fa-cog"></li>
        </button>
        <button id="btn_save" type="button" class="btn btn-default btn input-group-addon" title="Save">
            <li class="fa fa-save"></li>
        </button>
        <button id="btn_play" type="button" class="btn btn-default btn input-group-addon" title="Run">
            <li class="fa fa-play"></li>
        </button>
    </div>
    <div class="input-group">
        <button id="" type="button" class="btn btn-default btn input-group-addon menuicnBtnfix active" title="Flowchart" style="position: relative;top: -4px;left: -3px;" onclick="$app.main_view.showView('welcome');">
            <li class="glyphicon glyphicon-blackboard"></li>
        </button>
    </div>
</div>
`);
            var BtnSettings = '<button id="btn_settings" title="Settings" class="fa fa-cog" style="width: 30px;font-size: 20px;padding-left: 4px;padding-top: 2px;"></button>';
            var BtnSave = '<button id="btn_save" title="Save" class="fa fa-save" style="width: 30px;font-size: 20px;padding-left: 4px;padding-top: 2px;"></button>';
            var BtnPlay = '<button id="btn_play" title="Run" class="fa fa-play" style="width: 30px;font-size: 20px;padding-left: 4px;padding-top: 2px;"></button>';
            var BtnSelect = ''; //'<select id="btn_code_lang" class="selectpicker" style="font-size: 14px;"><option>Perl</option><option>Python</option></select>';
            self.els.buttons = $(`` +
                `<nobr>` +
                `   <div class="buttons" style="font-size: 10px;display: inline-flex;position: relative;text-align: center;">` +
                `       ${BtnStatus}` +
                `   </div>` +
                `</nobr>` +
                `<nobr>` +
                `   <div class="buttons" style="float: right;font-size: 10px;display: flex;padding-top: 5px;">` +
                `       <button class="zoom-in">Zoom In</button>` +
                `       <button class="zoom-out">Zoom Out</button>` +
                `       <input type="range" class="zoom-range" step="0.5" min="0.5" max="3">` +
                `       <button class="zoom-reset">Reset</button>` +
                `   </div>` +
                `</nobr>` +
                ``);
            self.els.buttons.appendTo(self.element);
            Btns.prependTo(self.element.children('nobr')[0]);
            self.els.title.appendTo(self.element.children('nobr')[0]); // 'Process Title': should go inside first nobr, topmost position.
            self.els.title.appendTo(self.element.children('nobr').children('div').children('div')[1]);

            self.els.state = $('<span class="uf-process-state" style="position: relative;top: 5px;"><span class="uf-process-state-saving">Saving changes...</span><span class="uf-process-state-saved">Changes saved.</span><span class="uf-process-state-error">Error!</span></span>');
            self.els.state.appendTo(self.element);

            self.els.path = $('<span class="uf-process-path"></span>');
            self.els.path.appendTo(self.element);

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