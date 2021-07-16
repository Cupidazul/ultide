define(['socket-io'], function(io) {
    var app = {};

    app.config = {
        server: {
            'host': document.domain,
            'port': location.port
        },
        user: {
            'login': 'root',
            'password': 'root'
        }
    };

    app.socket = null;
    app.request_id = 0;
    app.requestCallbacks = {};
    app.data = {};
    app.ui = {};

    app.start = function(cb) {
        var self = this;
        console.log('@ult.app: start: ', 'ws://' + this.config.server.host + ':' + this.config.server.port + '/uide');

        this.socket = io.connect('ws://' + this.config.server.host + ':' + this.config.server.port + '/uide');

        this.socket.on('disconnect', function() {
            console.log('@ult.app: socket-io: disconnect!');
            app.updatePyServerStatus();
        });

        this.socket.on('connect', function() {
            console.log('@ult.app: socket-io: connect!');
            self.sendRequest('login', self.config.user, function(data) {
                if (data.connected) {
                    $(function() {
                        //console.log('@ult.app: document.ready!', data);
                        self.session = data;

                        // WaitFor: #btn_ioStatus
                        let checkExist = setInterval(function() {
                            if ($('#btn_ioStatus').length) {
                                app.updatePyServerStatus();
                                clearInterval(checkExist);
                            }
                        }, 500); // check every 500ms

                    });
                    cb();
                } else {
                    alert('@ult.app: Error ! Did not succeed to connect!');
                }
            });
        });

        this.socket.on('msg', function(response) {
            if (typeof response.auth_error != 'undefined' && response.auth_error) {
                alert('@ult.app: Authentification error! Please try again!');
            }
            if (window.console) {
                console.log('@ult.app: socket.on.msg:received', response);
            }
            if (typeof app.requestCallbacks[response.request_id] != 'undefined') {
                app.requestCallbacks[response.request_id](response.data);
                delete app.requestCallbacks[response.request_id];
            }
        });
    };

    app.sendRequest = function(request, data, cb) {
        var reqId = app.request_id;
        app.request_id++;
        if (window.console)
            console.log('@ult.app: sendRequest:', request, data);
        this.socket.emit('msg', { request_id: reqId, request: request, data: data });
        if (typeof cb != 'undefined') {
            this.requestCallbacks[reqId] = cb;
        }
    };

    app.onEvent = function(name, cb) {
        $(document).on('uf:' + name, cb);
    };

    app.triggerEvent = function(name, params) {
        $(document).trigger('uf:' + name, params);
    };

    app.getUserProperty = function(key, cb) {
        this.sendRequest('get_user_property', { key: key }, function(data) {
            cb(data.value);
        });
    };

    app.setUserProperty = function(key, value, cb) {
        this.sendRequest('set_user_property', { key: key, value: value }, function(data) {
            cb(data.success);
        });
    };

    app.updatePyServerStatus = function() {
        if (app.socket.connected) {
            $('#btn_ioStatus').removeClass('SrvKO').addClass('SrvOK'); // # OK!
        } else {
            $('#btn_ioStatus').removeClass('SrvOK').addClass('SrvKO'); // # KO!
        }
    };

    return app;
});