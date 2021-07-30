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
            var $menubtn = $('<button id="menu_btn" class="glyphicon glyphicon-menu-hamburger" style="position: fixed;top: 4px;margin-left: 4px;"></button>');
            $menubtn.appendTo(this.element);

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
            $userMenuBtn.appendTo(this.element);

            $('#userSubMenuBtn1').on('click', function(evt) {
                if (!$flowchart.menuState) $('.navbar.navbar-fixed-left').css('left', '-100px');
                $('#main_navBar_welcome').click();
            });
        }
    });
});