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
            let $userSettings_Card =
                `<div id="userSettings" class="col-md-4 card" style="margin-left: 100px; margin-right: 100px; display: none;">` +
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
                `                   ` + app.fn._printAvatar('settings', user) +
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
                `                   ` + app.fn._printAvatar('new', { 'avatar': '' }) +
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

            let $adminListUsers_Card =
                `<div id="adminListUsers" class="col-md-12 card" style="display: none;">` +
                `    <div class="card-content">` +
                `   <table id="adminListUsers-data" class="table table-striped">` +
                `       <thead>` +
                `           <tr>` +
                `               <th>id</th>` +
                `               <th>Username</th>` +
                `               <th>First Name</th>` +
                `               <th>Last Name</th>` +
                `               <th>Group</th>` +
                `               <th>Avatar</th>` +
                `               <th>Email</th>` +
                `               <th>Create Date</th>` +
                `               <th>Is Active</th>` +
                `               <th>Is Admin</th>` +
                `               <th></th>` +
                `               <th></th>` +
                `           </tr>` +
                `       </thead>` +
                `       <tbody>` +
                `       </tbody>` +
                `    </table>` +
                `        <label id="msgListUsers"></label>` +
                `    </div>` +
                `</div>`;

            let $adminLogsList_Card =
                `<div id="adminLogsList" class="col-md-12 card" style="display: none;">` +
                `    <div class="card-content">` +
                `   <table id="adminLogsList-data" class="table table-striped">` +
                `       <thead>` +
                `           <tr>` +
                `               <th>id</th>` +
                `               <th>Username</th>` +
                `               <th>AppName</th>` +
                `               <th>Level</th>` +
                `               <th>Create Date</th>` +
                `               <th>Start Date</th>` +
                `               <th>End Date</th>` +
                `               <th>Trace</th>` +
                `               <th>Message</th>` +
                `               <th></th>` +
                `               <th></th>` +
                `           </tr>` +
                `       </thead>` +
                `       <tbody>` +
                `       </tbody>` +
                `    </table>` +
                `        <label id="msgLogsList"></label>` +
                `    </div>` +
                `</div>`;

            if (!user.is_admin)
                $userSettings_Card =
                `<div id="userSettings" class="col-md-4 card" style="margin-left: 100px; margin-right: 100px; display: none;">` +
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
                `                   ` + app.fn._printAvatar('settings', user) +
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
                `    <div id="adminMenuBtns" class="col-md-9">` +
                `       <div class="input-group col-md-2" style="float: left;max-width: 160px;">` +
                `           <button id="btnSH_userSettings" type="button" class="btn btn-default input-group-addon" title="Settings">` +
                `               <li class="fa fa-cog"></li>` +
                `           </button>` +
                `           <button id="btnSH_userChgPwd"   type="button" class="btn btn-default input-group-addon" title="Change Password">` +
                `               <li class="fa fa-key"></li>` +
                `           </button>` +
                `           <button id="btnSH_adminNewUser"  type="button" class="btn btn-default input-group-addon border-left-0" title="New User">` +
                `               <li class="fa fa-user-plus"></li>` +
                `           </button>` +
                `           <button id="btnSH_adminListUsers" type="button" class="btn btn-default input-group-addon" title="List Users">` +
                `               <li class="fa fa-users"></li>` +
                `           </button>` +
                `       </div>` +
                `       <div class="input-group" style="float: left;padding: 0px 5px;">` +
                `           <button id="btnSH_flowchart" type="button" class="btn btn-default input-group-addon menuicnBtnfix" title="Flowchart">` +
                `              <li class="glyphicon glyphicon-blackboard"></li>` +
                `           </button>` +
                `       </div>` +
                `       <div class="input-group col-md-2" style="float: left;">` +
                `          <button id="btnSH_adminLogsList" type="button" class="btn btn-default input-group-addon menuicnBtnfix" title="Logs List">` +
                `              <li class="fa fa-th-list" style="font-size: 16px;"></li>` +
                `          </button>` +
                `<!--          <button id="" type="button" class="btn btn-default input-group-addon" title="">` +
                `              <li class="fa fa-key"></li>` +
                `          </button>` +
                `          <button id="" type="button" class="btn btn-default input-group-addon border-left-0" title="">` +
                `              <li class="fa fa-user-plus"></li>` +
                `          </button>` +
                `          <button id="" type="button" class="btn btn-default input-group-addon" title="">` +
                `              <li class="fa fa-users"></li>` +
                `-->          </button>` +
                `       </div>` +
                `   </div>` +
                `</div>` +
                `<div id="adminCardsView" class="row mx-auto">` +
                `    ${$userSettings_Card}` +
                `    ${$userChgPwd_Card}` +
                `    ${$adminNewUser_Card}` +
                `    ${$adminListUsers_Card}` +
                `    ${$adminLogsList_Card}` +
                `</div>`);

            let userForm = $('<hr>' +
                `<div class="row mx-auto">` +
                `    <div id="adminMenuBtns" class="col-md-3">` +
                `       <div class="input-group" style="float: left;">` +
                `           <button id="btnSH_userSettings" type="button" class="btn btn-default input-group-addon" title="Settings">` +
                `               <li class="fa fa-cog"></li>` +
                `           </button>` +
                `           <button id="btnSH_userChgPwd"   type="button" class="btn btn-default input-group-addon mainBtnFix" title="Change Password">` +
                `               <li class="fa fa-key"></li>` +
                `           </button>` +
                `       </div>` +
                `       <div class="input-group">` +
                `           <button id="btnSH_flowchart" type="button" class="btn btn-default input-group-addon menuicnBtnfix" title="Flowchart">` +
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
                //adminForm.hide();
                adminForm.appendTo(this.element.children()[1]);
            } else {
                settingsForm = userForm;
                //userForm.hide();
                userForm.appendTo(this.element.children()[1]);
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
                    app.ultiflow.updateUser({
                        username: String($('#settings_username').val()),
                        avatar: String($('#settings_avatar').val()),
                        first_name: String($('#settings_first_name').val()),
                        last_name: String($('#settings_last_name').val()),
                        email: String($('#settings_email').val()),
                        group: String($('#settings_group').val()), // fix: user is not admin
                    }, 'msgSettings');
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
                //console.log('submit!', { 'this': this, 'evt': evt, 'NewPWD': NewPWD, 'CnfPWD': CnfPWD });
                if (String($('#new_username').val()) != '' &&
                    String($('#new_email').val()) != '' &&
                    String($('#new_avatar').val()) != '' &&
                    NewPWD != '' &&
                    CnfPWD != '' &&
                    Number.isInteger(parseInt(CnfGrp)) &&
                    (parseInt(CnfGrp) >= 0 && parseInt(CnfGrp) <= 255)) {
                    if (NewPWD === CnfPWD) {
                        app.ultiflow.addUser({
                            username: String($('#new_username').val()),
                            password: String($('#new_confirm_pwd').val()),
                            avatar: String($('#new_avatar').val()),
                            first_name: String($('#new_first_name').val()),
                            last_name: String($('#new_last_name').val()),
                            email: String($('#new_email').val()),
                            group: String($('#new_group').val()),
                        });
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
                        app.ultiflow.ChgPwdUser(CurrPWD, NewPWD);
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
                    let CurrCardName = (evt.currentTarget.id || evt.currentTarget.nodeName).split('_')[1];
                    //if ($app.debug) console.log('@ult.main_view: adminMenuBtns.click', { CurrCardName: CurrCardName, evt: evt, element: element });
                    _fn_ShowCard(CurrCardName, (CurrCardName !== 'flowchart'));
                    if (user.is_admin && CurrCardName == 'adminListUsers') {
                        $app.adminListUsersDT = $('#adminListUsers-data').DataTable({
                            ajax: $app.wwwroot + 'api/user_data',
                            destroy: true,
                            responsive: true,
                            autoWidth: true,
                            searching: true,
                            columns: [
                                { data: 'id' },
                                { data: 'username' },
                                { data: 'first_name' },
                                { data: 'last_name' },
                                { data: 'group' },
                                { data: 'avatar' },
                                { data: 'email' },
                                { data: 'create_date' },
                                { data: 'active' },
                                { data: 'is_admin' },
                                { data: null, className: "dt-center editor-edit", defaultContent: '<button class="btn btn-primary btn-sm"><i class="fa fa-pen"/></button>', orderable: false },
                                { data: null, className: "dt-center editor-delete", defaultContent: '<button class="btn btn-primary btn-sm"><i class="fa fa-trash"/></button>', orderable: false }
                            ],
                            initComplete: function() {
                                this.api().rows().every(function(evt1) {
                                    let that = this,
                                        elData = that.data(),
                                        elNode = that.node();
                                    //console.log('initComplete:', { evt1: evt1, that: that, data: elData, node: elNode });
                                    if (elData.username == 'root') { //prevent delete root user!
                                        //$(elNode).find('.editor-edit').css({ 'opacity': 0.4, 'pointer-events': 'none' });
                                        $(elNode).find('.editor-delete').css({ 'opacity': 0.4, 'pointer-events': 'none' });
                                    }
                                });
                            }
                        });

                        // Edit record
                        $('#adminListUsers-data').on('click', 'td.editor-edit', function(evt) {
                            evt.stopImmediatePropagation();
                            evt.preventDefault();
                            let UsrElm = $app.adminListUsersDT.row(this).data();
                            //if ($app.debug) console.log('@ult.main_view: adminListUsers-data.td.editor-edit', { evt: evt, this: this, UsrElm: UsrElm });
                            app.ultiflow.editUser(UsrElm, function() {
                                $('#btnSH_adminListUsers').click();
                            });
                            return false;
                        });

                        // Delete a record
                        $('#adminListUsers-data').on('click', 'td.editor-delete', function(evt) {
                            evt.stopImmediatePropagation();
                            evt.preventDefault();
                            let UsrElm = $app.adminListUsersDT.row(this).data();
                            //if ($app.debug) console.log('@ult.main_view: adminListUsers-data.td.editor-delete', { evt: evt, this: this, UsrElm: UsrElm });
                            if (UsrElm.username !== "root") { // enforce prevent delete root user!
                                let dRes = confirm("Confirm deletion of user: " + UsrElm.username);
                                if (dRes) {
                                    app.ultiflow.deleteUser(UsrElm, function() { $('#btnSH_adminListUsers').click(); });
                                }
                            }
                            return false;
                        });
                    }

                    if (user.is_admin && CurrCardName == 'adminLogsList') {
                        let _fn_shortMsg = function(data, type, row) {
                            return '<div class="short-log-msg">' + data + '</div>';
                        };
                        $app.adminLogsListDT = $('#adminLogsList-data').DataTable({
                            ajax: $app.wwwroot + 'api/logs_data',
                            destroy: true,
                            responsive: true,
                            autoWidth: true,
                            searching: true,
                            columns: [
                                { data: 'id', className: "text-log" },
                                { data: 'usr', className: "text-log" },
                                { data: 'name', className: "text-log" },
                                { data: 'level', className: "text-log" },
                                { data: 'created_at', className: "text-log-dt" },
                                { data: 'start_date', className: "text-log-dt" },
                                { data: 'end_date', className: "text-log-dt" },
                                { data: 'trace', render: _fn_shortMsg },
                                { data: 'msg', render: _fn_shortMsg },
                                { data: null, className: "dt-center editor-edit", defaultContent: '<button class="btn btn-primary btn-sm"><i class="fa fa-eye"/></button>', orderable: false },
                                { data: null, className: "dt-center editor-delete", defaultContent: '<button class="btn btn-primary btn-sm disabled"><i class="fa fa-trash"/></button>', orderable: false }
                            ],
                            initComplete: function() {
                                this.api().rows().every(function(evt1) {
                                    let that = this,
                                        elData = that.data(),
                                        elNode = that.node();
                                    //console.log('initComplete:', { evt1: evt1, that: that, data: elData, node: elNode });
                                    //$($(elNode).children('td')[8]).css({ 'max-width': '700px', 'max-height': '100px', 'overflow': 'hidden', 'display': 'inline-flex' });
                                });
                            }
                        });

                        // Edit record
                        $('#adminLogsList-data').on('click', 'td.editor-edit', function(evt2) {
                            evt2.stopImmediatePropagation();
                            evt2.preventDefault();
                            var _self = this;
                            let LogElm = $app.adminLogsListDT.row(this).data();

                            //console.log('@adminLogsList-data.click:', { evt2: evt2, self: _self, LogElm: LogElm });

                            var Title = 'Show CodeRun Info Results';
                            var CodeStr = app.JSONSafeStringify(JSON.parse(LogElm.msg), null, 4);
                            var str = `` +
                                `   <div class="modal fade" id="addCodeInfoWksModal" tabindex="-1" role="dialog" aria-labelledby="myCodeModalLabel">` +
                                `       <div class="modal-dialog" role="document">` +
                                `           <div class="modal-content">` +
                                `               <div class="modal-header">` +
                                `                   <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>` +
                                `                   <h4 class="modal-title" id="myCodeModalLabel">` +
                                `                       <div class="col-sm-6">${Title}</div>` +
                                `                       <div style="font-size: 13px;" class="col-sm-5">` +
                                `                           Editor: <input id="switchAceJson" type="checkbox" data-toggle="switch" data-size="mini" data-on-text="Ace" data-off-text="Json">` +
                                `                       </div>` +
                                `                   </h4>` +
                                `               </div>` +
                                `               <div class="modal-body" style="height: 67vh;">` +
                                `                   <pre id="code-editor"></pre>` +
                                `                   <pre id="json-editor"></pre>` +
                                `               </div>` +
                                `               <div class="modal-footer" style="min-height: 60px;">` +
                                `                   <div style="float: left;text-align: left;min-width: 400px;">` +
                                `                   <label>&nbsp;<div style="float:right"></div></label>` +
                                `               </div>` +
                                `               <div style="float: right;position: fixed;bottom: 16px;right: -20px;">` +
                                `                   <button type="button" class="btn btn-primary btn-close" data-dismiss="modal" style="width: 100px;">OK</button>` +
                                `               </div>` +
                                `               </div>` +
                                `           </div>` +
                                `       </div>` +
                                `   </div>`;
                            // FROM : <!-- <textarea style="width: 100%;height: 100%;font-family: consolas;font-size: 13px;">${CodeStr}</textarea> -->
                            // TO   : ACE Editor!

                            var $modal = $(str);
                            var $title = $modal.find('.modal-title');
                            var $body = $modal.find('.modal-body');
                            var $cancelButton = $modal.find('.btn-close');
                            var $operatorId = $modal.find('.operator-id');

                            $cancelButton.click(function() {
                                $modal.modal('hide');
                            });

                            $modal.modal();
                            $modal.on('hidden.bs.modal', function() {
                                $modal.remove();
                            });

                            $modal.on('shown.bs.modal', function() {
                                $('#switchAceJson').bootstrapSwitch('state', true);
                                $('#switchAceJson').on('switchChange.bootstrapSwitch', function(evt, sstate) {
                                    if (sstate) {
                                        setTimeout(function() {
                                            $("#code-editor").show();
                                            $("#json-editor").hide();
                                        }, 200);
                                    } else {
                                        setTimeout(function() {
                                            $("#json-editor").show();
                                            $("#code-editor").hide();
                                            let __CodeStr = JSON.parse($app.ace._AceEditor.getValue());
                                            $app.ace._JsonEditor = new JsonEditor('#json-editor', __CodeStr);
                                        }, 200);
                                    }
                                });
                                require(['ace/mode/json', 'ace/theme/vibrant_ink'], function() {
                                    var editor = ace.edit("code-editor");
                                    editor.setOptions({
                                        //maxLines: Infinity, // this is going to be very slow on large documents
                                        indentedSoftWrap: false,
                                        behavioursEnabled: false, // disable autopairing of brackets and tags
                                        showLineNumbers: true, // hide the gutter
                                        wrap: true, // wrap text to view
                                        mode: "ace/mode/json"
                                    });
                                    //editor.getSession().setMode("ace/mode/json");
                                    editor.setTheme("ace/theme/vibrant_ink");
                                    editor.setValue(CodeStr, -1);
                                    //editor.clearSelection();
                                    //editor.setValue(str, -1); // moves cursor to the start
                                    //editor.setValue(str, 1); // moves cursor to the end
                                    $app.ace = {...$app.ace || {}, ...ace, ... { _AceEditor: editor, _CodeStr: CodeStr } };
                                });
                            });

                        });

                        // Delete a record
                        /*$('#adminLogsList-data').on('click', 'td.editor-delete', function(evt) {
                            evt.stopImmediatePropagation();
                            evt.preventDefault();
                            let UsrElm = $app.adminLogsList.row(this).data();
                            //if ($app.debug) console.log('@ult.main_view: adminLogsList-data.td.editor-delete', { evt: evt, this: this, UsrElm: UsrElm });
                            if (UsrElm.username !== "root") { // enforce prevent delete root user!
                                let dRes = confirm("Confirm deletion of user: " + UsrElm.username);
                                if (dRes) {
                                    app.ultiflow.deleteUser(UsrElm, function() { $('#adminLogsList').click(); });
                                }
                            }
                            return false;
                        });*/
                    }

                    return false;
                });
            });
            /* Add Avatar OnClick for each dropdown selected (li.a) option */
            ['new', 'settings'].forEach((elmName, _Idx) => {
                //console.log('@ult.main_view: AvatarList.forEach', { '_Idx': _Idx, 'elmName': elmName });
                app.fn._onChangeUpdateAvatar(elmName);
            });

            //_fn_ShowCard('userSettings');
            $('#adminCardsView .card').hide();
            if (user.avatar.length > 0) $(`#settings_avatar`).val(user.avatar);

            $('#btnSH_flowchart').on('click', function(evt) {
                $('#main_navBar_flowchart').click();
            });

            return settingsForm;
        }
    });
});