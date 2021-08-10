define([
    'app',
    'jquery',
    'jquery-ui'
], function(app, $) {
    $.widget("ultide.main_view", {
        options: {},
        els: {
            views: {}
        },
        currentView: null,

        // the constructor
        _create: function() {
            app.main_view = this;
        },

        createView: function(name, $content) {
            if (typeof this.els.views[name] != 'undefined')  {
                this.els.views[name].remove();
            }
            $content.hide();
            this.els.views[name] = $content;
            this.els.views[name].appendTo(this.element);
        },
        createViewTopBar: function(name, $content) {
            if (typeof this.els.views[name] != 'undefined')  {
                this.els.views[name].remove();
            }
            //$content.hide();
            this.els.views[name] = $content;
            this.els.views[name].appendTo(this.element.children()[0]);
        },
        createViewWelcome: function(name, $content) {
            if (typeof this.els.views[name] != 'undefined')  {
                this.els.views[name].remove();
            }
            $content.hide();
            this.els.views[name] = $content;
            this.els.views[name].appendTo(this.element.children()[1]);
        },

        showView: function(name) {
            if (this.currentView != null) {
                this.els.views[this.currentView].hide();
                this.els.views[this.currentView].trigger('on_view_hide');
            }
            this.currentView = name;
            this.els.views[name].show();
            this.els.views[name].trigger('on_view_show');
        },

        createUserBtn: function(user) {

            var WIP = ' <i class="text-danger">-wip-</i>';
            var $menubtn = $('<button id="menu_btn" class="glyphicon glyphicon-menu-hamburger" style="position: fixed;top: 4px;margin-left: 20px;"></button>');
            $menubtn.appendTo(this.element.children()[0]);

            var $userMenuBtn = $(`<div class="btn-group" role="group" style="float: right;right: 112px;float: right;right: 112px;top: 0px;position: absolute;">
    <div class="userMenuMask"></div>
    <button id="userMenuBtn1" type="button" class="btn dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <img class="avatar" src="` + (user.avatar || '') + `">
        <span class="caret"></span>
    </button>
    <ul class="dropdown-menu" aria-labelledby="userMenuBtn1">
        <li><a id="userSubMenuBtn1" href="#" onclick="$app.main_view.showView('welcome');">Logged in as ` + (user.username || '') + `</a></li>
        <li class="divider"></li>
        <li><a id="userSubMenuBtn2" href="#">Your Library` + (WIP || '') + `</a></li>
        <li><a id="userSubMenuBtn3" href="#">Your Projects` + (WIP || '') + `</a></li>
        <li class="divider"></li>
        <li><a id="userSubMenuBtn4" href="#">Settings` + (WIP || '') + `</a></li>
        <li><a id="userSubMenuBtn5" href="#">Help` + (WIP || '') + `</a></li>
        <li class="divider"></li>
        <li><a id="userSubMenuBtn6" href="/logout">Logout</a></li>
    </ul>
</div>`);
            $userMenuBtn.appendTo(this.element.children()[0]);

            $('#userSubMenuBtn1').on('click', function(evt) {
                if (!$app.flowchart.menuState) $('.navbar.navbar-fixed-left').css('left', '-100px');
                $('#main_navBar_welcome').click();
                return false;
            });
        },

        addAdminView: function(name) {
            //console.log('addAdminView');
            var adminForm = $(`<hr />
<div class="row">
    <div class="col-md-3" style="margin-right: 100px;margin-left: 100px;padding: 10px;">
        <button type="button" class="btn btn-default btn active" title="Change Password">
            <li class="fa fa-key"></li>
        </button>
        <button type="button" class="btn btn-default btn active" title="Settings">
            <li class="fa fa-user"></li>
        </button>
        <button type="button" class="btn btn-default btn active" title="New User">
            <li class="fa fa-user-friends"></li>
        </button>
    </div>
</div>
<div class="row">
    <div id="adminChgPwd" class="col-md-3 card card" style="margin-left: 100px; margin-right: 100px; display: block;">
        <div class="card-content">
            <form id="adminChgPwd-form">
                <div class="form-group"></div>
                <div class="form-group">
                    <label for="ChgPwdView">Change Your Password</label>
                    <input id="curr_pwd" type="password" class="form-control" placeholder="Current Password" style="width: 200px;">
                    <input id="new_pwd" type="password" class="form-control" placeholder="New Password" style="width: 200px;">
                    <input id="confirm_pwd" type="password" class="form-control" placeholder="Repeat Password" style="width: 200px;">
                </div>
                <button type="submit" class="btn btn-primary">Submit</button>
            </form>
            <label id="msgChgPwd"></label>
        </div>
    </div>
    <div id="adminNewUser" class="col-md-3 card card" style="margin-left: 100px; margin-right: 100px; display: block;">
    <div class="card-content">
        <form id="adminNewUser-form">
            <div class="form-group"></div>
            <div class="form-group">
                <label for="NewUserView">Create New User <b class="bg-warning">-WIP-</b></label>
                <input id="new_username" type="text" class="form-control" placeholder="Username" style="width: 100px;">
                <input id="new_new_pwd" type="password" class="form-control" placeholder="Password" style="width: 200px;">
                <input id="new_confirm_pwd" type="password" class="form-control" placeholder="Repeat Password" style="width: 200px;">
                <br>
                <input id="new_first_name" type="text" class="form-control" placeholder="First Name" style="width: 150px;">
                <input id="new_last_name" type="text" class="form-control" placeholder="Last Name" style="width: 150px;">
                <input id="new_group" type="text" class="form-control" placeholder="Group" style="width: 150px;">
                <input id="new_avatar" type="text" class="form-control" placeholder="Avatar" style="width: 150px;">
            </div>
            <button type="submit" class="btn btn-primary" disabled="disabled">Submit</button>
        </form>
        <label id="msgNewUser"></label>
    </div>
</div>
</div>
`);

            adminForm.hide();
            adminForm.appendTo(this.element.children()[1]);

            var CountDown;

            function _fn_countdown(val, _id) {
                var counter = val - 1;
                CountDown = setInterval(function() {
                    if (counter < 0) document.getElementById(_id).innerHTML = "0";
                    if (counter >= 0) document.getElementById(_id).innerHTML = counter--;
                }, 1000);
            }

            $('#adminChgPwd-form').on('submit', function(evt) {
                //console.log('submit!', { this: this, evt: evt });
                let CurrPWD = String($('#curr_pwd').val());
                let NewPWD = String($('#new_pwd').val());
                let CnfPWD = String($('#confirm_pwd').val());
                if (CurrPWD != '' && NewPWD != '' && CnfPWD != '') {
                    if (NewPWD === CnfPWD && CurrPWD != NewPWD) {
                        setTimeout(function() {
                            app.sendRequest('change_user_password', { CurrPWD: CurrPWD, NewPWD: NewPWD }, function(data) {
                                let _msg = '';
                                if ($app.debug) console.log('@app.start: change_user_password:', { data: data });
                                if (data.res === true) {
                                    _msg += "Current password was changed sucessfully...<br>Logoff in <b id='countdown'>3</b> secs...";

                                    _fn_countdown(3, "countdown");
                                    setTimeout(function() { document.location = '/logout'; }, 4000);

                                } else {
                                    _msg += "Change password failed...<br>";
                                }
                                if (data.CurrPwdOK === false) _msg += "Current password doesn't match...<br>";
                                $('#msgChgPwd').html(_msg);
                            });
                        }, 1);
                    } else {
                        if ($app.debug) console.log('@app.start: change_user_password: error:', { data: data });
                        if (NewPWD != CnfPWD) $('#msgChgPwd').html('New Password and Confirm dont match!');
                        if (CurrPWD == NewPWD) $('#msgChgPwd').html('Old and New Password are the same!');
                    }
                }
                return false;
            });

            return adminForm;
        }
    });
});