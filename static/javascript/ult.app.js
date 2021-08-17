define(['socket-io'], function(io) {
    //console.log(this);
    var self = this;

    var app = Object.assign(app || {}, app, $app || {});

    app.config = {
        io: {},
        server: {
            'host': document.domain,
            'port': location.port
        },
        user: {
            // #Security: Avoid exposing root user information to other users!
            //'login': '',
            //'password': ''
        }
    };

    //app.user = app.config.user;
    //app.debug = app.config.io.debug;
    app.socket = null;
    self.session = null;
    app.request_id = 0;
    app.requestCallbacks = {};
    app.data = { AppInited: false };
    app.ui = {};
    if ($app.debug) console.log('@ult.app: init[' + app.request_id + ']:', { app: app, self: self, io: io, readyState: document.readyState });

    app.start = function(cb) {
        var self = this;
        if ($app.debug) console.log('@ult.app: app.start: ', 'ws://' + self.config.server.host + ':' + self.config.server.port + '/uide doc.readyState:' + document.readyState);

        self.socket = io.connect(self.config.server.host + ':' + self.config.server.port + '/uide', { path: $app.wwwroot + 'socket.io/' });
        //self.socket.emit('get-session'); // not needed: 'refresh-session' is called in @server.py: socketio.on.connect !
        //console.log('@ult.app: socket-io: get-session!!!', { config: self.config });

        self.socket.on('disconnect', function() {
            if ($app.debug) console.log('@ult.app: socket-io: disconnect!');
            window.$app.user = app.user = app.config.user = {};
            self.session = null;
            app.updatePyServerStatus();
        });

        self.socket.on('connect', function() {

            let checkUID = setInterval(function() {
                var loginUSR = (typeof(self.config.io.uid) !== 'undefined' ? self.config.io : ''); // WAS: self.config.user now ''
                //console.log('@ult.app: socket-io: connect!', ' config:' + JSON.stringify(self.config));

                // UID should exist before login ! So that we login with an UID used in route: /login
                if (typeof(self.config.io.uid) !== 'undefined')
                    self.sendRequest('login', loginUSR, function(data) {
                        //console.log('@ult.app: socket-io: login!', ' config+data+USR:' + JSON.stringify({ config: self.config, data: data, loginUSR: loginUSR }));

                        if (data.connected) {
                            $(function() {
                                if ($app.debug) console.log('@ult.app: connected!', data);
                                self.session = data;
                                app.user = app.config.user = Object.assign(self.config.io.initial_session_data.user, app.config.user);
                                //app.debug = app.config.debug = Object.assign(self.config.io.debug, app.config.debug);
                                //try { if (window.$app) window.$app.user = app.config.user; } catch (err) {}

                                // WaitFor: #btn_ioStatus
                                let checkExist = setInterval(function() {
                                    if ($('#btn_ioStatus').length) {
                                        app.updatePyServerStatus();
                                        clearInterval(checkExist);
                                    }
                                }, 700); // check every 700ms

                            });
                            cb();
                        } else {
                            if (window.console) {
                                console.log('@ult.app: Error ! Did not succeed to connect!');
                            } else {
                                alert('@ult.app: Error ! Did not succeed to connect!');
                            }
                        }
                    });

                if (typeof(self.config.io.uid) !== 'undefined') {
                    clearInterval(checkUID);
                } else {
                    self.socket.emit('get-session');
                    if ($app.debug) console.log('@ult.app: socket-io: get-session!!!', { config: self.config, loginUSR: loginUSR });
                }
                //self.sendRequest('login', self.config.user, function(data) {

            }, 2000); // check every 700ms

        });

        self.socket.on('msg', function(response) {
            if (typeof response.auth_error != 'undefined' && response.auth_error) {
                if (window.console) {
                    console.log('@ult.app: Authentification error! Please try again!', response);
                } else {
                    alert('@ult.app: Authentification error! Please try again!');
                }
            }
            if ($app.debug && window.console) {
                console.log('@ult.app: socket.on.msg:received[' + response.request_id + ']:', response);
            }
            if (typeof app.requestCallbacks[response.request_id] != 'undefined') {
                app.requestCallbacks[response.request_id](response.data);
                delete app.requestCallbacks[response.request_id];
            }
        });

        self.socket.on('refresh-session', function(data) {
            if ($app.debug) console.log('@ult.app: socket-io: refresh-session: ', data);
            app.config.io = Object.assign(app.config.io || {}, data);
        });

    };

    app.sendRequest = function(request, data, cb) {
        var reqId = app.request_id;
        app.request_id++;
        if ($app.debug && window.console)
            console.log('@ult.app: sendRequest[' + app.request_id + ']:', request, data);
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
        if (app.socket.connected && $('#btn_ioStatus').length != 0) {
            $('#btn_ioStatus').removeClass('SrvKO').addClass('SrvOK'); // # OK!
        } else {
            $('#btn_ioStatus').removeClass('SrvOK').addClass('SrvKO'); // # KO!
        }
    };

    return app;
});