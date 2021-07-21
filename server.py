#!/usr/bin/env python3
import sys; sys.dont_write_bytecode = True; # don't write __pycache__ DIR
import os;
from shutil import copyfile;

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on available packages.
async_mode = None
LISTENHOST = '0.0.0.0'
LISTENPORT = '8000'

# DEFAULT CONFIG Setting: ./ultide/config.py.default -> ./ultide/config.py
if (not os.path.isfile('./ultide/config.py')): copyfile('./ultide/config.py.default', './ultide/config.py');

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
# thread
if async_mode == 'eventlet':
    import eventlet                     #type: ignore vscode.lint: warning
    eventlet.monkey_patch()
elif async_mode == 'gevent':
    from gevent import monkey           #type: ignore vscode.lint: warning
    monkey.patch_all()

import time
from flask import Flask, render_template, session, request, send_from_directory, make_response
from functools import wraps, update_wrapper
from flask_socketio import SocketIO, emit, disconnect
import ultide.config as config
from flask_user import login_required, UserManager, UserMixin, SQLAlchemyAdapter
from ultide.models import db, User, DevLang
import ultide.core as core
import uuid
import ultide.common as common
import json
from datetime import datetime
import sys

# Check if Exists: ./data  and create it if not...
data_dir = os.path.dirname('./data/')
if not os.path.exists(data_dir): os.makedirs(data_dir)

app = Flask(__name__)
app.config.from_object(config)
socketio = SocketIO(app, async_mode=async_mode)
thread = None


db.app = app
db.init_app(app)
# Create all database tables
db.create_all()

# Setup Flask-User
db_adapter = SQLAlchemyAdapter(db, User)            # Register the User model
common.user_manager = UserManager(db_adapter, app)  # Initialize Flask-User

if not User.query.filter(User.username=='root').first():
    user1 = User(username='root', email='root@example.com', confirmed_at=datetime.now(), active=True,
            password=common.user_manager.hash_password('root'))
    db.session.add(user1)
    db.session.commit()

sessions_data = {}

## DevLang init db  .START.
print('@server: Loading: python info...');sys.stdout.flush();
if not DevLang.query.filter(DevLang.lang_name=='python').first():
    devlang_python = DevLang(lang_name='python', lang_version=DevLang.get_version_python(), lang_modules=DevLang.get_version_python_modules())
    db.session.add(devlang_python)
    db.session.commit()
else:
    devlang_python = DevLang.query.filter_by(lang_name='python').first()
    devlang_python.lang_version = DevLang.get_version_python()
    devlang_python.lang_modules = DevLang.get_version_python_modules()
    db.session.commit()

print('@server: Loading: perl info...');sys.stdout.flush();
if not DevLang.query.filter(DevLang.lang_name=='perl').first():
    devlang_perl = DevLang(lang_name='perl', lang_version=DevLang.get_version_perl(), lang_modules=DevLang.get_version_perl_modules())
    db.session.add(devlang_perl)
    db.session.commit()
else:
    devlang_perl = DevLang.query.filter_by(lang_name='perl').first()
    devlang_perl.lang_version = DevLang.get_version_perl()
    devlang_perl.lang_modules = DevLang.get_version_perl_modules()
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


def get_init_session_data():
    data = {}
    data['modules_infos'] = {'core': {'main': core, 'path': 'ultide'}}
    return data


@app.route('/')
def index():
    session['uuid'] = str(uuid.uuid4())
    return render_template('index.html')

@app.route('/favicon.ico') 
def favicon(): 
    return send_from_directory(os.path.join(app.root_path, 'templates'), 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/package.json', methods=['GET'])
@nocache
def module_static():
    print('@server: load_static: ./package.json');sys.stdout.flush();
    static_loadfile = open('package.json').read()
    return static_loadfile

@socketio.on('msg', namespace='/uide')
def msg_received(message):
    session_data = sessions_data[session['uuid']]
    session_data['uuid'] = session['uuid']
    request_id = message['request_id']
    method = 'on_' + message['request']
    response = {'request_id': request_id}
    if ('user' in session_data or method == 'on_login'):
        data = message['data']
        response_data = {}
        for module_key in session_data['modules_infos']:
            print('@server: module:', module_key);sys.stdout.flush();
            module_infos = session_data['modules_infos'][module_key]
            if ('main' in module_infos):
                module_py = module_infos['main']
                if (hasattr(module_py, method)):
                    if ( module_key == 'core' or module_key == 'ultiflow' ): 
                        print('@server: module method', (session, module_key, method, message));sys.stdout.flush();
                        getattr(module_py, method)(data, response_data, session_data);  # modules: Fix: allow only from core or ultiflow
        print('@server: response: ' + method, response);sys.stdout.flush();
        response['data'] = response_data
    else:
        response['auth_error'] = True
        print('@server: response.err: ' + method, response);sys.stdout.flush();
    
    emit('msg', response)
    
@app.route('/static/modules/<path:path>', methods=['GET'])
@nocache
def modules_static(path):
    session_data = sessions_data[session['uuid']]
    session_data['uuid'] = session['uuid']
    splitted_path = path.split('/')
    module = splitted_path.pop(0)
    module_path = session_data['modules_infos'][module]['path'] + os.path.sep + 'static'
    print('@server: module load:', "./" + module_path.replace("\\","/") + '/' + '/'.join(splitted_path));sys.stdout.flush();
    return send_from_directory(module_path, '/'.join(splitted_path))

@socketio.on('connect', namespace='/uide')
def test_connect():
    sessions_data[session['uuid']] = get_init_session_data()
    print(('@server: Client connected:', request.sid, session['uuid']));sys.stdout.flush();

@socketio.on('disconnect', namespace='/uide')
def test_disconnect():
    sessions_data.pop(session['uuid'], None)
    print(('@server: Client disconnected:', request.sid, session['uuid']));sys.stdout.flush();


if __name__ == '__main__':
    if (LISTENHOST == '0.0.0.0'):
        print('@server: Listening host:',LISTENHOST,' port:', LISTENPORT, ' try: http://127.0.0.1:'+LISTENPORT );sys.stdout.flush();
    else:
        print('@server: Listening host:',LISTENHOST,' port:', LISTENPORT, ' try: http://'+LISTENHOST+':'+LISTENPORT );sys.stdout.flush();
    sys.stdout.flush()
    socketio.run(app, host=LISTENHOST, port=int(LISTENPORT), debug=True)
