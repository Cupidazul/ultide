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

            var $userMenuBtn = $(`<div class="btn-group" role="group" style="float: right;right: 112px;display:none;">
    <div class="userMenuMask"></div>
    <button id="userMenuBtn1" type="button" class="btn dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <img class="avatar" src="${user.avatar}">
        <span class="caret"></span>
    </button>
    <ul class="dropdown-menu" aria-labelledby="userMenuBtn1">
        <li><a href="#">Logged in as ${user.username}</a></li>
        <li><a href="/logout">Logout</a></li>
    </ul>
</div>`);
            $userMenuBtn.appendTo(this.element);

        }
    });
});