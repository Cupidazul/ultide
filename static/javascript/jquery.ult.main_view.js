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

            var $userMenuBtn = $(`<div class="btn-group" role="group" style="float: right;right: 112px;top: 0px;position: absolute;">
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
        <li><a id="userSubMenuBtn4" href="#">Flowchart</a></li>
        <li><a id="userSubMenuBtn5" href="#">Settings</a></li>
        <li><a id="userSubMenuBtn6" href="#">Help` + (WIP || '') + `</a></li>
        <li class="divider"></li>
        <li><a id="userSubMenuBtn7" href="./logout">Logout</a></li>
    </ul>
</div>`);
            $userMenuBtn.appendTo(this.element.children()[0]);

            $('#userSubMenuBtn1').on('click', function(evt) {
                if (!$app.flowchart.menuState) $('.navbar.navbar-fixed-left').css('left', '-100px');
                $('#main_navBar_welcome').click();
                return false;
            });

            $('#userSubMenuBtn4').on('click', function(evt) {
                $('#main_navBar_flowchart').click();
                return false;
            });

            $('#userSubMenuBtn5').on('click', function(evt) {
                if (!$app.flowchart.menuState) $('.navbar.navbar-fixed-left').css('left', '-100px');
                $('#main_navBar_welcome').click();
                $('#btnSH_userSettings').click();
                return false;
            });

        },

        addSettingsView: function(user) {
            let settingsForm = '';
            //console.log('ult.main_view: addSettingsView');
            let _fn_printAvatar = function(name, _user) {
                _avatar_name = (imgSrc) => {
                    try {
                        let imgNm = imgSrc.split('/');
                        let imgID0 = imgNm[imgNm.length - 1].split('.')[0].replace('img_avatar', '');
                        let imgID = String(parseInt(imgID0) + 1);
                        if (imgID0.length > 0) return ' Avatar ' + imgID;
                    } catch (err) {}
                    return '-Avatar-';
                };
                return `` +
                    `<div class="dropdown">` +
                    `   <button id="${name}_avatar" type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="min-width: 150px;text-align: left;overflow: hidden;max-height: 34px;">` +
                    `       <span id="${name}_avatar_selected" style="color: darkgray;">` + ((_user.avatar.length > 0) ? '<img class="avatar" src="' + _user.avatar + '">' + (_avatar_name(_user.avatar)) : '-Avatar-') + `</span>` +
                    `       <span class="caret" style="float: right;margin-top: 5px;"></span>` +
                    `   </button>` +
                    `   <ul id="${name}_avatar_list" class="dropdown-menu" aria-labelledby="${name}_avatar">` +
                    `       <li><a id='${name}_img_avatar0' href=""><img class="avatar" src="./static/modules/ultiflow/images/img_avatar0.png"> Avatar 1</a></li>` +
                    `       <li><a id='${name}_img_avatar1' href=""><img class="avatar" src="./static/modules/ultiflow/images/img_avatar1.png"> Avatar 2</a></li>` +
                    `       <li><a id='${name}_img_avatar2' href=""><img class="avatar" src="./static/modules/ultiflow/images/img_avatar2.png"> Avatar 3</a></li>` +
                    `       <li><a id='${name}_img_avatar3' href=""><img class="avatar" src="./static/modules/ultiflow/images/img_avatar3.png"> Avatar 4</a></li>` +
                    `       <li><a id='${name}_img_avatar4' href=""><img class="avatar" src="./static/modules/ultiflow/images/img_avatar4.png"> Avatar 5</a></li>` +
                    `       <li><a id='${name}_img_avatar5' href=""><img class="avatar" src="./static/modules/ultiflow/images/img_avatar5.png"> Avatar 6</a></li>` +
                    `   </ul>` +
                    `</div>`;
            };
            let $userSettings_Card =
                `<div id="userSettings" class="col-md-4 card" style="margin-left: 100px; margin-right: 100px; display: block;">` +
                `    <div class="card-content">` +
                `        <form id="userSettings-form">` +
                `            <div class="form-group">` +
                `                <label for="SettingsView" style="margin-bottom: 15px;">User Settings</label>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Username: </div>` +
                `                   <input id="settings_username" type="text" class="form-control" placeholder="Username" style="width: 100px;" value="${user.username}">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Avatar: </div>` +
                `                   ` + _fn_printAvatar('settings', user) +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">FirstName: </div>` +
                `                   <input id="settings_first_name" type="text" class="form-control" placeholder="First Name" style="width: 150px;" value="${user.first_name}">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">LastName: </div>` +
                `                   <input id="settings_last_name" type="text" class="form-control" placeholder="Last Name" style="width: 150px;" value="${user.last_name}">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">E-mail: </div>` +
                `                   <input id="settings_email" type="email" class="form-control" placeholder="Email" style="width: 200px;" value="${user.email}">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Group: </div>` +
                `                   <select id="settings_group" type="text" class="form-control" placeholder="Group (0...255)" style="width: 150px;" value="${user.group}">
                <option value="255" ` + ((parseInt(user.group) == 255) ? 'selected="selected"' : '') + `>Superuser</option>
                <option value="128" ` + ((parseInt(user.group) == 128) ? 'selected="selected"' : '') + `>Admin</option>
                <option value="64" ` + ((parseInt(user.group) == 64) ? 'selected="selected"' : '') + `>Profile 1</option>
                <option value="32" ` + ((parseInt(user.group) == 32) ? 'selected="selected"' : '') + `>Profile 2</option>
                <option value="16" ` + ((parseInt(user.group) == 16) ? 'selected="selected"' : '') + `>Profile 3</option>
                <option value="8" ` + ((parseInt(user.group) == 8) ? 'selected="selected"' : '') + `>Profile 4</option>
                <option value="4" ` + ((parseInt(user.group) == 4) ? 'selected="selected"' : '') + `>Profile 5</option>
                <option value="2" ` + ((parseInt(user.group) == 2) ? 'selected="selected"' : '') + `>Profile 6</option>
                <option value="1" ` + ((parseInt(user.group) == 1) ? 'selected="selected"' : '') + `>Profile 7</option>
                <option value="0" ` + ((parseInt(user.group) == 0) ? 'selected="selected"' : '') + `>No Group</option>
                </select>` +
                `                </div>` +
                `            </div>` +
                `            <div class="col">` +
                `               <div class="tblLabel col-md-3"></div>` +
                `               <button type="submit" class="btn btn-primary">Submit</button>` +
                `            </div>` +
                `        </form>` +
                `        <label id="msgSettings"></label>` +
                `    </div>` +
                `</div>`;
            let $userChgPwd_Card =
                `<div id="userChgPwd" class="col-md-4 card" style="margin-left: 100px; margin-right: 100px; display: block;">` +
                `    <div class="card-content">` +
                `        <form id="userChgPwd-form">` +
                `            <div class="form-group">` +
                `                <label for="ChgPwdView" style="margin-bottom: 15px;">Change Your Password</label>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Current: </div>` +
                `                   <input id="curr_pwd" type="password" class="form-control" placeholder="Current Password" style="width: 200px;">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">New: </div>` +
                `                   <input id="new_pwd" type="password" class="form-control" placeholder="New Password" style="width: 200px;">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Confirm: </div>` +
                `                   <input id="confirm_pwd" type="password" class="form-control" placeholder="Repeat Password" style="width: 200px;">` +
                `                </div>` +
                `            </div>` +
                `            <div class="col">` +
                `               <div class="tblLabel col-md-3"></div>` +
                `               <button type="submit" class="btn btn-primary">Submit</button>` +
                `            </div>` +
                `        </form>` +
                `        <label id="msgChgPwd"></label>` +
                `    </div>` +
                `</div>`;
            let $adminNewUser_Card =
                `<div id="adminNewUser" class="col-md-4 card" style="margin-left: 100px; margin-right: 100px; display: block;">` +
                `    <div class="card-content">` +
                `        <form id="adminNewUser-form">` +
                `            <div class="form-group">` +
                `                   <label for="NewUserView" style="margin-bottom: 15px;">Create New User</label>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Username: </div>` +
                `                   <input id="new_username" type="text" class="form-control" placeholder="Username" style="width: 100px;">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Avatar: </div>` +
                `                   ` + _fn_printAvatar('new', { 'avatar': '' }) +
                `                </div>` +
                `                <p></p>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Password: </div>` +
                `                   <input id="new_new_pwd" type="password" class="form-control" placeholder="Password" style="width: 200px;">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Confirm: </div>` +
                `                   <input id="new_confirm_pwd" type="password" class="form-control" placeholder="Repeat Password" style="width: 200px;">` +
                `                </div>` +
                `                <p></p>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">FirstName: </div>` +
                `                   <input id="new_first_name" type="text" class="form-control" placeholder="First Name" style="width: 150px;">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">LastName: </div>` +
                `                   <input id="new_last_name" type="text" class="form-control" placeholder="Last Name" style="width: 150px;">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">E-mail: </div>` +
                `                   <input id="new_email" type="email" class="form-control" placeholder="Email" style="width: 200px;">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Group: </div>` +
                `                   <select id="new_group" type="text" class="form-control" placeholder="Group (0...255)" style="width: 150px;" value="255">
                <option value="255">Superuser</option>
                <option value="128">Admin</option>
                <option value="64">Profile 1</option>
                <option value="32">Profile 2</option>
                <option value="16">Profile 3</option>
                <option value="8">Profile 4</option>
                <option value="4">Profile 5</option>
                <option value="2">Profile 6</option>
                <option value="1">Profile 7</option>
                <option value="0" selected="selected">No Group</option>
                </select>` +
                `                </div>` +
                `            </div>` +
                `            <div class="col">` +
                `               <div class="tblLabel col-md-3"></div>` +
                `               <button type="submit" class="btn btn-primary">Submit</button>` +
                `            </div>` +
                `        </form>` +
                `        <label id="msgNewUser"></label>` +
                `    </div>` +
                `</div>`;

            if (!user.is_admin)
                $userSettings_Card =
                `<div id="userSettings" class="col-md-4 card" style="margin-left: 100px; margin-right: 100px; display: block;">` +
                `    <div class="card-content">` +
                `        <form id="userSettings-form">` +
                `            <div class="form-group">` +
                `                <label for="SettingsView" style="margin-bottom: 15px;">User Settings</label>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Username: </div>` +
                `                   <input id="settings_username" type="text" class="form-control" placeholder="Username" style="width: 100px;" value="${user.username}">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">Avatar: </div>` +
                `                   ` + _fn_printAvatar('settings', user) +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">FirstName: </div>` +
                `                   <input id="settings_first_name" type="text" class="form-control" placeholder="First Name" style="width: 150px;" value="${user.first_name}">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">LastName: </div>` +
                `                   <input id="settings_last_name" type="text" class="form-control" placeholder="Last Name" style="width: 150px;" value="${user.last_name}">` +
                `                </div>` +
                `                <div class="col">` +
                `                   <div class="tblLabel col-md-3">E-mail: </div>` +
                `                   <input id="settings_email" type="email" class="form-control" placeholder="Email" style="width: 200px;" value="${user.email}">` +
                `                </div>` +
                //`                <div class="col">` +
                //`                   <div class="tblLabel col-md-3">Group: </div>` +
                //`                   <input id="settings_group" type="text" class="form-control" placeholder="Group (0...255)" style="width: 150px;" value="${user.group}">` +
                //`                </div>` +
                `            </div>` +
                `            <div class="col">` +
                `               <div class="tblLabel col-md-3"></div>` +
                `               <button type="submit" class="btn btn-primary">Submit</button>` +
                `            </div>` +
                `        </form>` +
                `        <label id="msgSettings"></label>` +
                `    </div>` +
                `</div>`;

            let adminForm = $('<hr>' +
                `<div class="row mx-auto">` +
                `    <div id="adminMenuBtns" class="col-md-3">` +
                `       <div class="input-group" style="float: left;">` +
                `           <button id="btnSH_userSettings" type="button" class="btn btn-default btn input-group-addon" title="Settings">` +
                `               <li class="fa fa-cog"></li>` +
                `           </button>` +
                `           <button id="btnSH_userChgPwd"   type="button" class="btn btn-default btn input-group-addon" title="Change Password">` +
                `               <li class="fa fa-key"></li>` +
                `           </button>` +
                `           <button id="btnSH_adminNewUser"  type="button" class="btn btn-default btn input-group-addon" title="New User">` +
                `               <li class="fa fa-user-plus"></li>` +
                `           </button>` +
                `       </div>` +
                `       <div class="input-group">` +
                `           <button id="btnSH_flowchart" type="button" class="btn btn-default btn input-group-addon menuicnBtnfix" title="Flowchart">` +
                `              <li class="glyphicon glyphicon-blackboard"></li>` +
                `           </button>` +
                `       </div>` +
                `   </div>` +
                `</div>` +
                `<div id="adminCardsView" class="row mx-auto">` +
                `    ${$userSettings_Card}` +
                `    ${$userChgPwd_Card}` +
                `    ${$adminNewUser_Card}` +
                `</div>`);

            let userForm = $('<hr>' +
                `<div class="row mx-auto">` +
                `    <div id="adminMenuBtns" class="col-md-3">` +
                `       <div class="input-group" style="float: left;">` +
                `           <button id="btnSH_userSettings" type="button" class="btn btn-default btn input-group-addon" title="Settings">` +
                `               <li class="fa fa-cog"></li>` +
                `           </button>` +
                `           <button id="btnSH_userChgPwd"   type="button" class="btn btn-default btn input-group-addon mainBtnFix" title="Change Password">` +
                `               <li class="fa fa-key"></li>` +
                `           </button>` +
                `       </div>` +
                `       <div class="input-group">` +
                `           <button id="btnSH_flowchart" type="button" class="btn btn-default btn input-group-addon menuicnBtnfix" title="Flowchart">` +
                `              <li class="glyphicon glyphicon-blackboard"></li>` +
                `           </button>` +
                `       </div>` +
                `   </div>` +
                `</div>` +
                `<div id="adminCardsView" class="row mx-auto">` +
                `    ${$userSettings_Card}` +
                `    ${$userChgPwd_Card}` +
                `</div>`);

            if (user.is_admin) {
                settingsForm = adminForm;
                adminForm.hide();
                adminForm.appendTo(this.element.children()[1]);
            } else {
                settingsForm = userForm;
                userForm.hide();
                userForm.appendTo(this.element.children()[1]);
            }

            var CountDown;

            function _fn_countdown(val, _id) {
                var counter = val - 1;
                CountDown = setInterval(function() {
                    if (counter < 0) document.getElementById(_id).innerHTML = "0";
                    if (counter >= 0) document.getElementById(_id).innerHTML = counter--;
                }, 1000);
            }

            $('#userSettings-form').on('submit', function(evt) {
                let _msg = '';
                let CnfGrp = String($('#settings_group').val());
                if (typeof(CnfGrp) == 'undefined') CnfGrp = 0;
                if (String($('#settings_username').val()) != '' &&
                    String($('#settings_avatar').val()) != '' &&
                    String($('#settings_email').val()) != '' &&
                    Number.isInteger(parseInt(CnfGrp)) &&
                    (parseInt(CnfGrp) >= 0 && parseInt(CnfGrp) <= 255)) {
                    setTimeout(function() {
                        let _obj = {};
                        _obj.username = String($('#settings_username').val());
                        _obj.avatar = String($('#settings_avatar').val());
                        _obj.first_name = String($('#settings_first_name').val());
                        _obj.last_name = String($('#settings_last_name').val());
                        _obj.email = String($('#settings_email').val());
                        if ($('#settings_group').length > 0) _obj.group = String($('#settings_group').val()); // fix: user is not admin

                        app.sendRequest('change_user_settings', {
                            'user': JSON.stringify(_obj)
                        }, function(data) {
                            let _msg = '';
                            if ($app.debug) console.log('@ult.main_view: change_user_settings:', { data: data });
                            if (data.res === true) {
                                _msg += "Update sucessfull...<br>Refresh in <b id='sys_countdown'>3</b> secs...";
                                _fn_countdown(3, "sys_countdown");
                                setTimeout(function() { document.location = '/'; }, 4000);
                            } else {
                                _msg += "Update failed...<br>";
                            }
                            if (data.dif === false) _msg += "No changes detected to your settings...<br>";
                            if (data.usr_exists === true) _msg += "Username allready exists...<br>";
                            $('#msgSettings').html(_msg);
                        });
                    }, 1);
                } else {
                    if ($app.debug) console.log('@ult.main_view: add_new_user: error:', { 'evt': evt });
                    if (String($('#settings_username').val()) == '') _msg += "You must insert a username<br>";
                    if (String($('#settings_email').val()) == '') _msg += "You must insert a email<br>";
                    if (String($('#settings_avatar').val()) == '') _msg += "You must select a avatar<br>";
                    if (!Number.isInteger(parseInt(CnfGrp)) || !(parseInt(CnfGrp) >= 0 && parseInt(CnfGrp) <= 255)) _msg += "Group should be a number from 0...255<br>";
                }

                $('#msgSettings').html(_msg);

                return false;
            });

            $('#adminNewUser-form').on('submit', function(evt) {
                let _msg = '';
                let NewPWD = String($('#new_new_pwd').val());
                let CnfPWD = String($('#new_confirm_pwd').val());
                let CnfGrp = String($('#new_group').val());
                console.log('submit!', { 'this': this, 'evt': evt, 'NewPWD': NewPWD, 'CnfPWD': CnfPWD });
                if (String($('#new_username').val()) != '' &&
                    String($('#new_email').val()) != '' &&
                    String($('#new_avatar').val()) != '' &&
                    NewPWD != '' &&
                    CnfPWD != '' &&
                    Number.isInteger(parseInt(CnfGrp)) &&
                    (parseInt(CnfGrp) >= 0 && parseInt(CnfGrp) <= 255)) {
                    if (NewPWD === CnfPWD) {
                        setTimeout(function() {
                            app.sendRequest('add_new_user', {
                                'user': JSON.stringify({
                                    username: String($('#new_username').val()),
                                    password: String($('#new_confirm_pwd').val()),
                                    avatar: String($('#new_avatar').val()),
                                    first_name: String($('#new_first_name').val()),
                                    last_name: String($('#new_last_name').val()),
                                    email: String($('#new_email').val()),
                                    group: String($('#new_group').val()),
                                })
                            }, function(data) {
                                let _msg = '';
                                if ($app.debug) console.log('@ult.main_view: add_new_user:', { data: data });

                                if (data.res === true) {
                                    _msg += "User Created sucessfully...<br>";
                                } else {
                                    _msg += "User Creation failed...<br>";
                                }

                                if (data.usr_exists === true) _msg += "Username allready exists...<br>";

                                $('#msgNewUser').html(_msg);

                            });
                        }, 1);
                    } else {
                        if ($app.debug) console.log('@ult.main_view: add_new_user: error:', { 'evt': evt });
                        if (NewPWD != CnfPWD) _msg += "New Password and Confirm don't match!<br>";
                    }
                } else {
                    if ($app.debug) console.log('@ult.main_view: add_new_user: error:', { 'evt': evt });
                    if (NewPWD == '') _msg += "you must insert a password<br>";
                    if (CnfPWD == '') _msg += "you must insert a confirm password<br>";
                    if (String($('#new_username').val()) == '') _msg += "You must insert a username<br>";
                    if (String($('#new_email').val()) == '') _msg += "You must insert a email<br>";
                    if (String($('#new_avatar').val()) == '') _msg += "You must select a avatar<br>";
                    if (!Number.isInteger(parseInt(CnfGrp)) || !(parseInt(CnfGrp) >= 0 && parseInt(CnfGrp) <= 255)) _msg += "Group should be a number from 0...255<br>";
                }

                $('#msgNewUser').html(_msg);

                return false;
            });

            $('#userChgPwd-form').on('submit', function(evt) {
                //console.log('submit!', { 'this': this, 'evt': evt });
                let CurrPWD = String($('#curr_pwd').val());
                let NewPWD = String($('#new_pwd').val());
                let CnfPWD = String($('#confirm_pwd').val());
                if (CurrPWD != '' && NewPWD != '' && CnfPWD != '') {
                    if (NewPWD === CnfPWD && CurrPWD != NewPWD) {
                        setTimeout(function() {
                            app.sendRequest('change_user_password', { CurrPWD: CurrPWD, NewPWD: NewPWD }, function(data) {
                                let _msg = '';
                                if ($app.debug) console.log('@ult.main_view: change_user_password:', { 'data': data });
                                if (data.res === true) {
                                    _msg += "Password change sucessfull...<br>Logoff in <b id='countdown'>3</b> secs...";

                                    _fn_countdown(3, "countdown");
                                    setTimeout(function() { document.location = './logout'; }, 4000);

                                } else {
                                    _msg += "Change password failed...<br>";
                                }
                                if (data.CurrPwdOK === false) _msg += "Current password doesn't match...<br>";
                                $('#msgChgPwd').html(_msg);
                            });
                        }, 1);
                    } else {
                        if ($app.debug) console.log('@ult.main_view: change_user_password: error:', { 'evt': evt });
                        if (NewPWD != CnfPWD) $('#msgChgPwd').html("New Password and Confirm don't match!");
                        if (CurrPWD == NewPWD) $('#msgChgPwd').html("Old and New Password are the same!");
                    }
                }
                return false;
            });

            let _fn_ShowCard = function(_cardName, showCard = true) {
                if (showCard) {
                    $('#adminCardsView .card').hide();
                    $('#' + _cardName).show();
                }
                $('#adminMenuBtns > div > button').removeClass('active');
                $('#btnSH_' + _cardName).addClass('active');
            };
            $('#adminMenuBtns > div > button').each((Idx, element) => {
                //console.log('@ult.main_view: adminMenuBtns.each', { 'Idx': Idx, 'element': element });
                $(element).on('click', function(evt) {
                    //console.log('@ult.main_view: adminMenuBtns.click', { 'evt': evt, 'element': element });
                    let CurrCardName = (evt.currentTarget.id || evt.currentTarget.nodeName).split('_')[1];
                    _fn_ShowCard(CurrCardName, (CurrCardName !== 'flowchart'));
                });
            });
            /* Add Avatar OnClick for each dropdown selected (li.a) option */
            ['new', 'settings'].forEach((elmName, _Idx) => {
                //console.log('@ult.main_view: AvatarList.forEach', { '_Idx': _Idx, 'elmName': elmName });
                $(`#${elmName}_avatar_list > li > a`).each((Idx, element) => {
                    //console.log('@ult.main_view: AvatarList.each', { 'Idx': Idx, 'element': element });
                    $(element).on('click', function(evt) {
                        let CurrAvatar = (evt.currentTarget.id || evt.currentTarget.nodeName);
                        //console.log('@ult.main_view: Avatar OnClick.each', { '_Idx': _Idx, 'elmName': elmName, 'Idx': Idx, 'element': element, 'evt': evt, 'CurrAvatar': CurrAvatar });
                        $(`#${elmName}_avatar_selected`).html(element.innerHTML);
                        $(`#${elmName}_avatar`).val($('#' + (element.id) + ' > img').attr('src')); // get: $('#settings_avatar').data('avatar_selected')
                        $(`#${elmName}_avatar`).dropdown('toggle');
                        return false;
                    });
                });
            });

            _fn_ShowCard('userSettings');
            if (user.avatar.length > 0) $(`#settings_avatar`).val(user.avatar);

            $('#btnSH_flowchart').on('click', function(evt) {
                $('#main_navBar_flowchart').click();
            });

            return settingsForm;
        }
    });
});