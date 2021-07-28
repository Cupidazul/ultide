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
            console.log('@ultiflow.uf_process_main_infos: create! readyState:', document.readyState);

            window.$ultiflow.uf_process_main_infos = self;

            this.els.title = $('<span class="uf-process-title"></span>');
            this.els.title.appendTo(this.element);

            var BtnStatus = '<button id="btn_ioStatus" class="btn">PyServer</button>';
            var BtnSave = '<button id="btn_save" class="fa fa-save" style="width: 30px;font-size: 20px;padding-left: 4px;padding-top: 2px;"></button>';
            var BtnPlay = '<button id="btn_play" class="fa fa-play" style="width: 30px;font-size: 20px;padding-left: 4px;padding-top: 2px;"></button>';
            var BtnSelect = '<select id="btn_code_lang" class="selectpicker" style="font-size: 14px;"><option>Perl</option><option>Python</option></select>';
            this.els.buttons = $(`
<nobr><div class="buttons" style="float: right;font-size: 10px;display: flex;padding-top: 5px;"><button class="zoom-in">Zoom In</button><button class="zoom-out">Zoom Out</button><input type="range" class="zoom-range" step="0.5" min="0.5" max="3"><button class="zoom-reset">Reset</button></div></nobr>
<nobr><div class="buttons" style="font-size: 10px;display: inline-flex;padding-left: 5%;height: -webkit-fill-available;position: relative;text-align: center;">${BtnSave}${BtnPlay}&nbsp;${BtnSelect}${BtnStatus}</div></nobr>
`);
            this.els.buttons.appendTo(this.element);

            this.els.state = $('<span class="uf-process-state"><span class="uf-process-state-saving">Saving changes...</span><span class="uf-process-state-saved">Changes saved.</span><span class="uf-process-state-error">Error!</span></span>');
            this.els.state.appendTo(this.element);

            this.els.path = $('<span class="uf-process-path"></span>');
            this.els.path.appendTo(this.element);

            app.onEvent('ultiflow::process_open', function(e, operatorData) {
                self.setProcess(operatorData);
            });

            app.onEvent('ultiflow::process_change_detected', function(e) {
                self.setState('saving');
            });

            app.onEvent('ultiflow::process_saved', function(e, success) {
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