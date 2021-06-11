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
            this.els.menubtn = $('<button id="menu_btn" class="glyphicon glyphicon-menu-hamburger"></button>');
            this.els.menubtn.appendTo(this.element);

            this.els.title = $('<span class="uf-process-title"></span>');
            this.els.title.appendTo(this.element);

            this.els.buttons = $('<nobr><div class="buttons" style="float: right;font-size: 10px;display: flex;padding-top: 5px;"><button class="zoom-in">Zoom In</button><button class="zoom-out">Zoom Out</button><input type="range" class="zoom-range" step="0.5" min="0.5" max="3"><button class="zoom-reset">Reset</button></div></nobr>');
            this.els.buttons.appendTo(this.element);

            this.els.state = $('<span class="uf-process-state"><span class="uf-process-state-saving">Saving changes...</span><span class="uf-process-state-saved">Changes saved.</span><span class="uf-process-state-error">Error!</span></span>');
            this.els.state.appendTo(this.element);

            this.els.path = $('<span class="uf-process-path"></span>');
            this.els.path.appendTo(this.element);

            var self = this;
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