define([], function() {
    /*
    var data = {
      containers: {},
      choices: {}
    };
    */
    return function(paramKey, $divs, config, cbReady, cbChange) {
        var self = this;

        if (typeof config.attr == 'undefined') {
            config.attr = {};
        }

        if (typeof config.css == 'undefined') {
            config.css = {};
        }

        if (typeof config.options == 'undefined') {
            config.options = {};
        }

        if (typeof config.type == 'undefined') {
            config.type = 'checkbox';
        }

        var $container = $('<div />');

        var commonName = '__choices_' + paramKey.replace('"', '');

        var $choices = {};
        for (var i in config.options) {
            var option = config.options[i];

            var $option = $('<div></div>');
            var $label = $('<label></label>');
            var $choice = $('<input/>');
            var $elswitch = $('<span class="el-switch-style top3"></span>');

            $option.addClass(config.type);
            $choice.attr('type', config.type);
            if (config.type == 'radio') {
                $choice.attr('name', commonName);
            }

            $label.append($choice);

            if (config.type == 'checkbox') {
                $label.addClass('el-switch el-switch-sm pl-0 mr-2');
                $elswitch.appendTo($label);
                $label.append($('<label class="pl-3 h6">' + option.label + '</label>'));
            } else {
                $label.append(option.label);
            }

            $label.appendTo($option);
            $option.appendTo($container);

            $choices[option.value] = $choice;
        }

        $container.find('input').on('change', function() {
            cbChange(self);
        });

        $divs.content.append($container);

        this.setValue = function(val) {
            if (val == null) {
                val = {};
            }

            for (var key in val) {
                $choices[key].prop('checked', val[key]);
            }
        };

        this.getValue = function(paramKey) {
            var val = {};
            for (var key in $choices) {
                val[key] = $choices[key].is(':checked');
            }

            return val;
        };

        cbReady(this);
    };
});