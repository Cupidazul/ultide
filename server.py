#!/usr/bin/env python3
import sys; sys.dont_write_bytecode = True; # don't write __pycache__ DIR

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on available packages.
async_mode = None

if async_mode is None:
    try:
        import eventlet                 #type: ignore vscode.lint: warning
        async_mode = 'eventlet'
    except ImportError:
        pass

    if async_mode is None:
        try:
            from gevent import monkey   #type: ignore vscode.lint: warning
            async_mode = 'gevent'
        except ImportError:
            pass

    if async_mode is None:
        async_mode = 'threading'

    print(('@server: async_mode is ' + async_mode));sys.stdout.flush();

# monkey patching is necessary because this application uses a background
# thread.
if async_mode == 'eventlet':
    import eventlet                     #type: ignore vscode.lint: warning
    eventlet.monkey_patch()
elif async_mode == 'gevent':
    from gevent import monkey           #type: ignore vscode.lint: warning
    monkey.patch_all()
# In both cases it's recommended that you apply the monkey patching at the 
# top of your main script, even above your imports.

import os;
from shutil import copyfile;
# DEFAULT CONFIG Setting: ./ultide/config.py.default -> ./ultide/config.py
if (not os.path.isfile('./ultide/config.py')): copyfile('./ultide/config.py.default', './ultide/config.py');
import ultide.config as config
DEBUG   = config.DEBUG
WWWROOT = config.IO_SERVER['wwwroot']

import time
from flask import Flask, render_template, session, request, send_from_directory, make_response, redirect, flash
from functools import wraps, update_wrapper
from flask_socketio import SocketIO, emit, disconnect
from flask_user import login_required, UserManager, UserMixin, SQLAlchemyAdapter
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from ultide.models import db, User, DevLang, Library
from ultide.core import PKG, mod_2_dict, sessions_data
import ultide.core as core
import uuid
import ultide.common as common
import json
from datetime import datetime
import sys
from pprint import pprint

# Check if Exists: ./data  and create it if not...
data_dir = os.path.dirname('./data/')
if not os.path.exists(data_dir): os.makedirs(data_dir)

app = Flask(__name__)
app.config.from_object(config)

if (config.IO_SERVER.__contains__('cors') and config.IO_SERVER['cors']!='') :
      socketio = SocketIO(app, async_mode=async_mode, logger=True if (DEBUG) else False, engineio_logger=True if (DEBUG) else False, cors_allowed_origins=config.IO_SERVER['cors'])
else: socketio = SocketIO(app, async_mode=async_mode, logger=True if (DEBUG) else False, engineio_logger=True if (DEBUG) else False)

db.app = app
db.init_app(app)
# Create all database tables
db.create_all()
    
# Setup Flask-User
db_adapter = SQLAlchemyAdapter(db, User)            # Register the User model
common.user_manager = UserManager(db_adapter, app)  # Initialize Flask-User

# from: https://github.com/Faouzizi/Create_LoginPage
login_manager = LoginManager() # Create a Login Manager instance
login_manager.login_view = WWWROOT + 'login' # define the redirection path when login required and we attempt to access without being logged in
login_manager.init_app(app) # configure it for login
@login_manager.user_loader
def load_user(user_id): #reload user object from the user ID stored in the session
    # since the user_id is just the primary key of our user table, use it in the query for the user
    return User.query.get(int(user_id))

if not User.query.filter(User.username==app.config['DB_USER']['username']).first():
    user1 = User(
        first_name   = app.config['DB_USER']['first_name'],
        last_name    = app.config['DB_USER']['last_name'],
        username     = app.config['DB_USER']['username'],
        password     = User.encrypt_password( app.config['DB_USER']['password'] ),
        email        = app.config['DB_USER']['email'],
        group        = app.config['DB_USER']['group'],
        avatar       = app.config['DB_USER']['avatar'],
        confirmed_at = datetime.now(),
        active       = True
    )
    db.session.add(user1)

    """ # Create Second User for testing purposes
    user2 = User(
        first_name   = '',
        last_name    = '',
        username     = 'admin',
        email        = 'admin@example.com',
        confirmed_at = datetime.now(),
        active       = True,
        group        = 255
    )
    user2.set_password('admin')
    db.session.add(user2) """

    db.session.commit()

## DevLang init db  .START.
if (os.path.isfile(core.ex_python())):
    if (DEBUG): print('@server: Loading: python info...');sys.stdout.flush();
    if not DevLang.query.filter(DevLang.lang_name=='python').first():
        devlang_python = DevLang(lang_name='python', lang_version=DevLang.get_version_python(), lang_modules=DevLang.get_version_python_modules())
        db.session.add(devlang_python)
        db.session.commit()
    else:
        devlang_python = DevLang.query.filter_by(lang_name='python').first()
        devlang_python.lang_version = DevLang.get_version_python()
        devlang_python.lang_modules = DevLang.get_version_python_modules()
        db.session.commit()

if (os.path.isfile(core.ex_perl())):
    if (DEBUG): print('@server: Loading: perl info...');sys.stdout.flush();
    if not DevLang.query.filter(DevLang.lang_name=='perl').first():
        devlang_perl = DevLang(lang_name='perl', lang_version=DevLang.get_version_perl(), lang_modules=DevLang.get_version_perl_modules())
        db.session.add(devlang_perl)
        db.session.commit()
    else:
        devlang_perl = DevLang.query.filter_by(lang_name='perl').first()
        devlang_perl.lang_version = DevLang.get_version_perl()
        devlang_perl.lang_modules = DevLang.get_version_perl_modules()
        db.session.commit()

if (os.path.isfile(core.ex_tcl())):
    if (DEBUG): print('@server: Loading: tcl info...');sys.stdout.flush();
    if not DevLang.query.filter(DevLang.lang_name=='tcl').first():
        devlang_tcl = DevLang(lang_name='tcl', lang_version=DevLang.get_version_tcl(), lang_modules=DevLang.get_version_tcl_modules())
        db.session.add(devlang_tcl)
        db.session.commit()
    else:
        devlang_tcl = DevLang.query.filter_by(lang_name='tcl').first()
        devlang_tcl.lang_version = DevLang.get_version_tcl()
        devlang_tcl.lang_modules = DevLang.get_version_tcl_modules()
        db.session.commit()

if (os.path.isfile(core.ex_expect())):
    if (DEBUG): print('@server: Loading: expect info...');sys.stdout.flush();
    if not DevLang.query.filter(DevLang.lang_name=='expect').first():
        devlang_expect = DevLang(lang_name='expect', lang_version=DevLang.get_version_expect(), lang_modules=DevLang.get_version_expect_modules())
        db.session.add(devlang_expect)
        db.session.commit()
    else:
        devlang_expect = DevLang.query.filter_by(lang_name='expect').first()
        devlang_expect.lang_version = DevLang.get_version_expect()
        devlang_expect.lang_modules = DevLang.get_version_expect_modules()
        db.session.commit()

if (os.path.isfile(core.ex_node()) and os.path.isfile(core.ex_npm())):
    if (DEBUG): print('@server: Loading: node info...');sys.stdout.flush();
    if not DevLang.query.filter(DevLang.lang_name=='node').first():
        devlang_node = DevLang(lang_name='node', lang_version=DevLang.get_version_node(), lang_modules=DevLang.get_version_node_modules())
        db.session.add(devlang_node)
        db.session.commit()
    else:
        devlang_node = DevLang.query.filter_by(lang_name='node').first()
        devlang_node.lang_version = DevLang.get_version_node()
        devlang_node.lang_modules = DevLang.get_version_node_modules()
        db.session.commit()
## DevLang init db .FINISH.

def nocache(view):
    @wraps(view)
    def no_cache(*args, **kwargs):
        response = make_response(view(*args, **kwargs))
        response.headers['Last-Modified'] = datetime.now()
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response
        
    return update_wrapper(no_cache, view)

# Route for handling the login page logic
@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        loginUSR = request.form.get('loginUSR')
        password = request.form.get('password')
        remember = True if request.form.get('remember') else False
        if loginUSR.find("@")>0 :
            user = User.query.filter(User.email == loginUSR).first()
        else:
            user = User.query.filter(User.username == loginUSR).first()
        if not user or User.IsPwdEncrypted(password) or not user.verify_password(password): #SECURITY: FIX: disallow login with hash !
            error = 'Invalid Credentials. Please try again.'
            flash(error)
        else:
            login_user(user, remember=remember)
            return redirect(WWWROOT)
    return render_template('login.html', pkg=PKG)#, error=error)

@app.route('/logout') # define logout path
@login_required
def logout(): #define the logout function
    logout_user()
    sessions_data.pop(session['uuid'], None)
    return redirect(WWWROOT+'login')

@app.route('/')
def index():
    session['uuid'] = str(uuid.uuid4())
    #pprint(('@server: current_user:', vars(current_user), 'login_manager:', vars(login_manager)));sys.stdout.flush();
    if ( current_user.is_active and current_user.is_authenticated):
        return render_template('index.html', AppInitScript=core.AppInitScript(), pkg=PKG)
    else:
        return redirect(WWWROOT+'login')

@app.route('/favicon.ico') 
def favicon(): 
    return send_from_directory(os.path.join(app.root_path, 'templates'), 'favicon.ico', mimetype='image/x-icon')

#@app.route('/package.json', methods=['GET'])
#@nocache
#def module_static():
#    if (DEBUG): print('@server: load_static: ./package.json');sys.stdout.flush();
#    static_loadfile = open('package.json').read()
#    return static_loadfile

@socketio.on('msg', namespace='/uide')
def msg_received(message):
    session_data = core.get_session_data( sessions_data, session['uuid'] )
    request_id = message['request_id']
    method = 'on_' + message['request']
    response = {'request_id': request_id}
    if ('user' in session_data or method == 'on_login'):
        data = message['data']
        response_data = {}
        for module_key in session_data['modules_infos']:
            if (DEBUG): print('@server: module:', module_key);sys.stdout.flush();
            module_infos = session_data['modules_infos'][module_key]
            if ('main' in module_infos):
                module_py = module_infos['main']
                if (hasattr(module_py, method)):
                    if ( module_key == 'core' or module_key == 'ultiflow' ): 
                        if (DEBUG): print('@server: module getattr('+module_py.__name__+','+method+'):', ('session:', session, 'module_key:', module_key, 'method:', method, 'message:', message));sys.stdout.flush();
                        getattr(module_py, method)(data, response_data, session_data);  # modules: Fix: allow only from core or ultiflow
        if (DEBUG): print('@server: response: ' + method, response);sys.stdout.flush();
        response['data'] = response_data
    else:
        response['auth_error'] = True
        if (DEBUG): print('@server: response.err: ' + method, response);sys.stdout.flush();
    
    emit('msg', response)
    
@app.route('/static/modules/<path:path>', methods=['GET'])
@nocache
def modules_static(path):
    session_data = core.get_session_data( sessions_data, session['uuid'] )
    splitted_path = path.split('/')
    module = splitted_path.pop(0)
    module_path = session_data['modules_infos'][module]['path'] + os.path.sep + 'static'
    if (DEBUG): print('@server: module load:', "./" + module_path.replace("\\","/") + '/' + '/'.join(splitted_path));sys.stdout.flush();
    return send_from_directory(module_path, '/'.join(splitted_path))

@socketio.on('connect', namespace='/uide')
def test_connect():
    sessions_data[session['uuid']] = core.get_init_session_data(core)
    session_info = core.get_session_info( sessions_data, session['uuid'] )
    emit('refresh-session', session_info)   # Send session_info to upstream javascript
    if (DEBUG): print(('@server: Client connected:', request.sid, session['uuid']));sys.stdout.flush();

@socketio.on('disconnect', namespace='/uide')
def test_disconnect():
    sessions_data.pop(session['uuid'], None)
    if (DEBUG): print(('@server: Client disconnected:', request.sid, session['uuid']));sys.stdout.flush();

@socketio.on('get-session', namespace='/uide')
def get_session():
    #pprint(('@server: io: get-session!', sessions_data, current_user, dir(current_user)));sys.stdout.flush();
    session_info = core.get_session_info( sessions_data, session['uuid'] )
    emit('refresh-session', session_info)   # Send session_info to upstream javascript
    print(('@server: Client get-session:', request.sid, session['uuid']));sys.stdout.flush();

if __name__ == '__main__':
    if (DEBUG): pprint(('@server.main: app.config:', app.config)); sys.stdout.flush();
    LISTENHOST = app.config['IO_SERVER']['host']
    LISTENPORT = app.config['IO_SERVER']['port']
    if (LISTENHOST == '0.0.0.0'):
        print('@server: Listening host:',LISTENHOST,' port:', LISTENPORT, ' try: http://127.0.0.1:'+LISTENPORT );sys.stdout.flush();
    else:
        print('@server: Listening host:',LISTENHOST,' port:', LISTENPORT, ' try: http://'+LISTENHOST+':'+LISTENPORT );sys.stdout.flush();
    sys.stdout.flush()
    socketio.run(app, host=LISTENHOST, port=int(LISTENPORT), debug=DEBUG)
