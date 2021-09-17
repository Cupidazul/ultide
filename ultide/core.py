import datetime
import ultide.config as config
from ultide.models import User, uLog, uLogFile, genUUID
import json
import sys
import os
import os.path
import imp
from flask_login import current_user
from pprint import pprint, pformat
import inspect
import pystache
import subprocess
import lzstring
import zlib
import base64
import re
import pytz
from urllib import parse
import logging

osSEP = '/' if ( not os.name == 'nt') else '\\';
PKG = json.loads(open(os.path.abspath(os.path.join(os.path.dirname(__file__), '..'+osSEP+'package.json'))).read())
TZ = pytz.timezone(config.TIMEZONE)
DEBUG = config.DEBUG
WWWROOT = config.IO_SERVER['wwwroot']
UUID = genUUID
sessions_data = {}
VARS = {'uuid': UUID()}  # containerize vars per uuid
VARS[VARS['uuid']] = {'RAWOUTPUT':'','OUTPUT':''}
RAWOUTPUT = VARS[VARS['uuid']]['RAWOUTPUT']
OUTPUT = VARS[VARS['uuid']]['OUTPUT']

## Logging Config Start ###############################
dblog = uLog()
Uflog = uLogFile()
uflog = Uflog.getLogger()
## Logging Config End #################################

## ADD Internal Libs as needed/defined in config.py ###
if ( hasattr(config, 'ADDITIONAL_LIBS') ):
    for module in config.ADDITIONAL_LIBS:
        ADLIB_pip_path = os.path.abspath(os.path.join(os.path.dirname(__file__), config.ADDITIONAL_LIBS[module]))
        if (config.ADDITIONAL_LIBS[module]!='' and ADLIB_pip_path not in sys.path): sys.path.insert(0,ADLIB_pip_path)
        try:
            globals()[module] = __import__(module)
            if (DEBUG): uflog.log(logging.INFO, '@core: Loaded Additional Lib: '+ ADLIB_pip_path + osSEP + module + '.py')
        except ImportError as err:
            sys.stderr.write("@core: ERROR: " + pformat(err) + ": " + ADLIB_pip_path + osSEP + module + ".py\n")
## ADD Internal Libs End ##############################

def decodeZlibString(_str):
    return zlib.decompress(base64.b64decode(_str),0).decode("utf-8")
def encodeZlibString(_str):
    return str(base64.b64encode(zlib.compress(_str.encode('utf-8'))), "utf-8")

def initialize_user_session(user, session_data):
    modules_containers_paths = user.get_property('modules_containers_paths')
    if (modules_containers_paths is None):
        modules_containers_paths = ['library']
        user.set_property('modules_containers_paths', json.dumps(modules_containers_paths))
    else:
        modules_containers_paths = json.loads(modules_containers_paths)
    session_data['modules_containers_paths'] = modules_containers_paths
    
def refresh_users_modules(session_data):
    modules_infos = {'core': {'main': sys.modules[__name__], 'path': 'ultide'}}
    
    for modules_container_path in session_data['modules_containers_paths']:
        modules = os.listdir(modules_container_path)
        for module in modules:
            module_path = modules_container_path + os.path.sep + module
            
            request_handler_path = module_path + os.path.sep + 'main.py'
            config_path = module_path + os.path.sep + 'config.py'
            
            modules_infos[module] = {}
            modules_infos[module]['path'] = module_path
            
            if (os.path.isfile(request_handler_path)):
                module_py = imp.load_source('request_handler', request_handler_path)
                
                modules_infos[module]['main'] = module_py
                
            if (os.path.isfile(config_path)):
                module_config = imp.load_source('module_config_' + module, config_path)
                
                modules_infos[module]['config'] = module_config
    
    session_data['modules_infos'] = modules_infos

def on_login(data, response, session_data):
    connected = False
    #pprint(('@core.on_login: data:',data))
    if (not data.get('uid') is None):
        user = User.query.filter_by(id=data['uid']).first()
        # if (user.verify_password(data['password'])): #Security: bypass, validated on /login page
        initialize_user_session(user, session_data)
        refresh_users_modules(session_data)
        session_data['user'] = user
        connected = True
    else:
        user = User.query.filter_by(username=data['login']).first()
        if (user.verify_password(data['password'])):
            initialize_user_session(user, session_data)
            refresh_users_modules(session_data)
            session_data['user'] = user
            connected = True

    if (connected):
        response['user']  = dict(
            id                   = user.id ,
            username             = user.username,
            first_name           = user.first_name,
            last_name            = user.last_name,
            email                = user.email,
            group                = user.group,
            avatar               = user.avatar,
            reset_password_token = user.reset_password_token,
            confirmed_at         = user.confirmed_at.isoformat(),
            is_active            = user.is_active,
            is_authenticated     = user.is_authenticated,
            is_admin             = user.is_admin,
            last_opened_process  = user.get_property('ultiflow::opened_process')
        )
    
    #pprint(('@core.on_login: OUT:session_data:', mod_2_dict(session_data['user'])))
    response['connected'] = connected

def on_change_user_password(data, response, session_data):
    user = current_user
    # pprint(('@on_change_user_password:', {'data':data,'response':response, 'session_data': session_data } ))  # SECURITY: Hide ClearText-Password from logs!
    CurrPwdOK = response['CurrPwdOK'] = user.verify_password(data['CurrPWD'])
    response['res'] = False
    if(CurrPwdOK):
        try:
            user.set_password(data['NewPWD'])
            user.save()
            response['res'] = True
        except:
            response['error'] = sys.exc_info()[0]
            pprint(('Error:',response['error']))

def on_change_user_settings(data, response, session_data):
    userData = json.loads(data['user'])

    if (userData.__contains__('id') and userData['id'] == current_user.id):
        user = current_user
    else:
        user = User.query.filter(User.username==userData['username']).first()

    response['res'] = False
    response['usr_exists'] = False
    HasDiff = False
    if ( not str(user.username) == str(userData['username']) and user.user_exists(userData['username']) ):
        # New Username, but allready exists
        response['usr_exists'] = True
        pprint(('@on_change_user_settings: Error: User Allready Exists!', { 'data':data, 'response':response, 'session_data': session_data, 'userData': userData, 'HasDiff': HasDiff }))
    else:
        if ( not str(user.username) == str(userData['username'])): HasDiff = True
        if userData.__contains__('password'): HasDiff = True
        if ( not str(user.first_name) == str(userData['first_name'])): HasDiff = True
        if ( not str(user.last_name) == str(userData['last_name'])): HasDiff = True
        if ( not str(user.email) == str(userData['email'])): HasDiff = True
        if userData.__contains__('group'): 
            if ( not str(user.group) == str(userData['group'])): HasDiff = True
        if ( not str(user.avatar) == str(userData['avatar'])): HasDiff = True

        if (DEBUG): pprint(('@on_change_user_settings:', { 'data':data, 'response':response, 'session_data': session_data, 'userData': userData, 'HasDiff': HasDiff }))

        if (HasDiff == True):
            try:
                user.username = userData['username']
                if userData.__contains__('password'): user.set_password(userData['password'])
                user.first_name = userData['first_name']
                user.last_name = userData['last_name']
                user.email = userData['email']
                if userData.__contains__('group'): user.group = userData['group']
                user.avatar = userData['avatar']
                user.save()
                response['res'] = True
            except Exception as err:
                import traceback
                exc_info = sys.exc_info()
                #ret = dict( traceback = json.dumps(traceback.format_exception(*exc_info)), Exception = json.dumps(exception_as_dict(err),indent=2) ) # as JSON
                ret = dict( traceback=traceback.format_exception(*exc_info), Exception=exception_as_dict(err) , error='true') # pure objects
                response['error'] = sys.exc_info()[0]
                pprint(('Error:', response['error'], ret))
        else:
            None
    response['dif'] = HasDiff

def on_add_new_user(data, response, session_data):
    user = current_user
    userData = json.loads(data['user'])
    response['res'] = False
    response['usr_exists'] = False

    if ( user.user_exists(userData['username']) ):
        # New Username, but allready exists
        response['usr_exists'] = True
        print('@on_change_user_settings: Error: User Allready Exists!')
        # pprint(('@on_change_user_settings: Error: User Allready Exists!', { 'data':data, 'response':response, 'session_data': session_data, 'userData': userData }))  # SECURITY: Hide ClearText-Password from logs!
    else:
        # pprint(('@on_change_user_settings:', { 'data':data, 'response':response, 'session_data': session_data, 'userData': userData }))                               # SECURITY: Hide ClearText-Password from logs!

        try:
            user.add_user(userData)
            response['res'] = True
        except Exception as err:
            import traceback
            exc_info = sys.exc_info()
            #ret = dict( traceback = json.dumps(traceback.format_exception(*exc_info)), Exception = json.dumps(exception_as_dict(err),indent=2) ) # as JSON
            ret = dict( traceback=traceback.format_exception(*exc_info), Exception=exception_as_dict(err) , error='true') # pure objects
            response['error'] = sys.exc_info()[0]
            pprint(('Error:', response['error'], ret))

def on_delete_user(data, response, session_data):
    if (DEBUG): pprint(('@main: deleteUser: ', data))
    current_user.del_user(data)

def on_set_user_property(data, response, session_data):
    user = session_data['user']
    user.set_property(data['key'], data['value'])
    
def on_get_user_property(data, response, session_data):
    user = session_data['user']
    response['value'] = user.get_property(data['key'])
    
def on_write_file(data, response, session_data):
    #print('@core.on_write_file:',data['content'])
    file_path = data['path']
    content = data['content']
    response['error'] = False
    try:
        with open(file_path, 'w', encoding='utf-8', newline='') as outfile:
            #outfile.write(content.encode('utf8'))
            outfile.write(content)
    except:
        response['error'] = sys.exc_info()[0]
        
def on_list_files(data, response, session_data):
    path = data['path']
    
    response['parent'] = os.path.abspath(os.path.join(path, os.pardir))
    response['ds'] = os.path.sep
    
    #if (DEBUG): print('@core.on_list_files:', path)
    for dirname, dirnames, filenames in os.walk(path):
        response['dirs'] = dirnames
        response['files'] = filenames
        break

def on_get_js(data, response, session_data):
    user = session_data['user']
    main_js = []
    require_paths = {}
    
    for module_name in session_data['modules_infos']:
        module_infos = session_data['modules_infos'][module_name]
        if ('config' in module_infos):
            config = module_infos['config']
            if (hasattr(config, 'requirejs_paths')):
                if (DEBUG): print('@core.on_get_js: require_paths.update:', config.requirejs_paths)
                require_paths.update(config.requirejs_paths)
            if (hasattr(config, 'main_js') and not (config.main_js in main_js)):
                if (DEBUG): print('@core.on_get_js: main_js.append:', config.main_js)
                main_js.append(config.main_js)
    
    response['require_paths'] = require_paths
    response['main_js'] = main_js

def var_name(var):
    return (str([k for k, v in inspect.currentframe().f_back.f_locals.items() if v is var][0]))

def datestr( _dtstr = '{:02}{:02}{:02}{:02}{:02}{:02}', _timezone = config.TIMEZONE ):
    if ( _dtstr == None or _dtstr=='' ) : _dtstr = '{:02}{:02}{:02}{:02}{:02}{:02}'
    _tz = pytz.timezone(_timezone)
    now = datetime.datetime.now(_tz)
    return _dtstr.format(now.year, now.month, now.day, now.hour, now.minute, now.second, now.microsecond)

def mod_2_dict2(Modobj,options={}):
    all_vars = {}
    if ( hasattr(Modobj,'__dict__') ): Modobj = vars(Modobj)
    for i in Modobj:
        #pprint(('ii1 := ', i, type(Modobj[i]), Modobj[i]))
        if   ( type(Modobj[i]) is dict                    ): all_vars[i] = mod_2_dict2(Modobj[i])
        elif ( type(Modobj[i]) in [bool, str, int, float] ): all_vars[i] = Modobj[i]
        elif ( type(Modobj[i]) is datetime.datetime       ): all_vars[i] = Modobj[i].isoformat()
        elif ( type(Modobj[i]) is datetime.timedelta      ): all_vars[i] = Modobj[i].total_seconds()
        elif ( type(Modobj[i]) is list                    ): all_vars[i] = str(Modobj[i])
    return all_vars

def mod_2_dict(Modobj, options={'exclude':[],'include':[],'depth': 0,'maxdepth':20,'tree':'','parent':''}):
    all_vars = {}

    #if (not options.__contains__('tree' )):    options['tree']  = ''
    if (not options.__contains__('exclude' )): options['exclude']  = []
    if (not options.__contains__('include' )): options['include']  = []
    if (not options.__contains__('maxdepth')): options['maxdepth'] = 20
    #if (not options.__contains__('depth')   ): options['depth']    = 0
    try:    depth = options['depth']
    except: options['depth'] = 0
    try:    parent = options['parent']
    except: options['parent'] = ''

    #pprint(('mod_2_dict', options))
    #if (options['depth'] >= options['maxdepth']): return all_vars  # AVOID stack overflow. will occur bellow.
    
    if ( hasattr(Modobj,'__dict__') ): Modobj = vars(Modobj)
    for i in Modobj:
        #pprint(('ii1 := ', i, type(Modobj[i]), Modobj[i]))
        if (i not in options['exclude']):
            
            iStr = str(i)
            isClass = True
            className = ''
            try:    className = Modobj[i].__class__.__name__
            except: isClass = False
            if (iStr == None): iStr = 'None'

            NameisIncluded = (iStr in options['include'])
            DepthNotExceeded = (options['depth'] <= options['maxdepth'])
            NameisNotExcluded = (not iStr in ['_keepaliveset','_watcher_ref','sys','IO_SERVER'])
            ClassisNotExcluded = (not className in ['NoneType','SourceFileLoader','getset_descriptor','builtin_function_or_method','ellipsis','NotImplementedType','wrapper_descriptor','method_descriptor','classmethod_descriptor','member_descriptor','tuple','ModuleSpec','staticmethod','type','classmethod','function','list','_Helper','DefaultMeta','InstrumentedAttribute','weakref','Quitter','ColumnProperty','CachingEntityRegistry','sessionmaker','scoped_session','object','Server','Socket','Event','FFI','_CDataBase','__CDataOwnGC','__CDataOwn','deque','loop','async_','method','_multiplexwatcher','WSGIServer','LockType','SQLAlchemy','_SQLAlchemyState','Blueprint','TraversibleType','property','_FunctionGenerator','symbol','SQLAlchemyAdapter','UserManager','_SocketIOMiddleware','TextIOWrapper','LocalProxy','DispatchingJinjaLoader','LRUCache','AutoEscapeExtension','WithExtension','Environment','PyCapsule','_abc_data','module'])
            RulesPass = DepthNotExceeded and ( NameisIncluded or ( NameisNotExcluded and ClassisNotExcluded) )
            #if (iStr in options['include'].expand(['config','app'])): # Safer
            #if (str(iStr) == 'config'): pprint((' --- i0 := ' +str(options['depth'])+' : '+options['tree']+'.'+iStr+'('+className+'%'+str(type(Modobj[i]))+')'));sys.stdout.flush();

            if (options['depth'] == 0): options['tree']=options['parent']+'.'+iStr+'('+className+')'

            #pprint(('mod_2_dict1 := ', Modobj, options, '£:'+options['tree']+'.'+iStr))
            #pprint(('mod_2_dict1 := £:'+str(options['depth'])+' : '+options['tree']+'.'+iStr+'('+className+'%'+str(type(Modobj[i]))+')'));sys.stdout.flush();

            if   ( type(Modobj[i]) in [bool, str, int, float] ): all_vars[i] = Modobj[i]
            elif ( type(Modobj[i]) is datetime.datetime       ): all_vars[i] = Modobj[i].isoformat()
            elif ( type(Modobj[i]) is datetime.timedelta      ): all_vars[i] = Modobj[i].total_seconds()
            elif ( type(Modobj[i]) is tuple                   ): all_vars[i] = str(Modobj[i])
            elif ( type(Modobj[i]) is list                    ): all_vars[i] = str(Modobj[i])
            else:
                if ( RulesPass and type(Modobj[i]) is dict ):
                    if hasattr(Modobj[i],'items'):
                        if (options['depth'] > 0): options['tree']+='.'+iStr+'('+className+')'
                        options['depth'] += 1
                        all_vars[i] = mod_2_dict(dict(Modobj[i].items()), options)
                    else:
                        if (options['depth'] > 0): options['tree']+='.'+iStr+'('+className+')'
                        options['depth'] += 1
                        all_vars[i] = mod_2_dict(Modobj[i], options)
                else:                    
                    if ( RulesPass ):
                        if hasattr(Modobj[i],'items'):
                            if (options['depth'] > 0): options['tree']+='.'+iStr+'('+className+')'
                            options['depth'] += 1
                            all_vars[i] = mod_2_dict(dict(Modobj[i].items()), options)
                        else:
                            if (options['depth'] > 0): options['tree']+='.'+iStr+'('+className+')'
                            options['depth'] += 1
                            all_vars[i] = mod_2_dict(Modobj[i], options)
                    else:
                        all_vars[i] = { 'value':str(Modobj[i]), 'type':str(type(Modobj[i])), 'name':str(iStr), 'isclass':isClass, 'className': className }
    return all_vars

# from: https://stackoverflow.com/questions/3768895/how-to-make-a-class-json-serializable
def sterilize(obj):
    """Make an object more ameniable to dumping as json
    """
    if type(obj) in (str, float, int, bool, type(None)):
        return obj
    elif isinstance(obj, dict):
        return {k: sterilize(v) for k, v in obj.items()}
    list_ret = []
    dict_ret = {}
    for a in dir(obj):
        if a == '__iter__' and callable(obj.__iter__):
            list_ret.extend([sterilize(v) for v in obj])
        elif a == '__dict__':
            dict_ret.update({k: sterilize(v) for k, v in obj.__dict__.items() if k not in ['__module__', '__dict__', '__weakref__', '__doc__']})
        elif a not in ['__doc__', '__module__']:
            aval = getattr(obj, a)
            if type(aval) in (str, float, int, bool, type(None)):
                dict_ret[a] = aval
            elif a != '__class__' and a != '__objclass__' and isinstance(aval, type):
                dict_ret[a] = sterilize(aval)
    if len(list_ret) == 0:
        if len(dict_ret) == 0:
            return repr(obj)
        return dict_ret
    else:
        if len(dict_ret) == 0:
            return list_ret
    return (list_ret, dict_ret)

# Initialize ALL sessions_data for each session
def get_init_session_data(_core_):
    data = {}
    data['modules_infos'] = {'core': {'main': _core_, 'path': 'ultide'}}
    return data

# Get session_data for a session UUID
def get_session_data( s_data, session_uuid ):
    session_data = s_data[session_uuid]
    session_data['uuid'] = session_uuid
    #try:
    #    print ('@get_session_data:'+ str(session_data['user'].id))
    #except:
    #    None
    return session_data

# Get ALL session_info for a session UUID
def get_session_info( sdata, session_uuid ):
    s_data = get_session_data( sdata, session_uuid )
    session_info = {}
    session_info['initial_session_data'] = mod_2_dict(s_data)
    #session_info['initial_session_data'] = mod_2_dict(s_data,{'include': ['main']})
    #session_info['config'] = mod_2_dict(config)                                 #Security: Avoid exposing ServerConfig for Security Reasons !
    #session_info['current_user'] = mod_2_dict(current_user)                     #Security: Avoid exposing ServerConfig for Security Reasons !
    session_info['uid'] = current_user.id if current_user.is_authenticated else 'anonymous'
    session_info['initial_session_data']['user'] = dict(
        id           = current_user.id,
        username     = current_user.username,
        first_name   = current_user.first_name,
        last_name    = current_user.last_name,
        email        = current_user.email,
        create_dt    = current_user.confirmed_at.isoformat(),
        group        = current_user.group,
        avatar       = current_user.avatar,
        is_active    = current_user.is_active,
        is_auth      = current_user.is_authenticated,
        is_admin     = current_user.is_admin,
        last_op      = current_user.get_property('ultiflow::opened_process')
    )
    return session_info

def AppInitScript():
    ExposeVars = {'debug':(bool(DEBUG)),'wwwroot':(str(WWWROOT)),'osSEP':(str(osSEP)), 'pkg':{'ProductName':PKG['ProductName']} }     #SECURITY: carefull injecting vars into index.html template here!
    Script  =   '<script>'
    Script  +=      'window.$app=' + json.dumps(ExposeVars) + ';'
    Script  +=      "const uaData=(typeof(navigator.userAgentData)!=='undefined')?(navigator.userAgentData):{userAgent:navigator.userAgent};uaData.highEntropyValues={};(async ()=>{if (uaData.getHighEntropyValues) uaData.highEntropyValues=await uaData.getHighEntropyValues(['brands','mobile','platform','architecture','bitness','platform bitness','user agent','model','platformVersion','uaFullVersion']);})();"
    Script  +=      'var require={waitSeconds: 15, urlArgs:"nocache="+new Date().getTime() };' #Setup require.js to avoid caching js
    Script  +=      'document.getElementsByTagName("base")[0].nextElementSibling.remove();'    #SECURITY: Magic!
    Script  +=  '</script>'
    return Script

def exception_as_dict(ex):
    errno = ''
    message = ''
    strerror = ''
    output = ''
    if hasattr(ex, 'errno'):
        errno = ex.errno
    if hasattr(ex, 'message'):
        message = ex.message
    if hasattr(ex, 'strerror'):
        exception_as_dict(ex.strerror) if isinstance(ex.strerror,Exception) else ex.strerror
    if hasattr(ex, 'output'):
        output = ex.output
    return dict(type=ex.__class__.__name__, errno=errno , message=message, strerror=strerror, output=output)
            
def on_perl_CodeRun(data, response, session_data):
    workspace = config.PRJ['WORKSPACE_DIR']
    if data.__contains__('workspace'):
        workspace = data['workspace']
    else:
        try:
            workspace = session_data['user'].get_property('workspace')
        except: None

    if (DEBUG): pprint(('@on_perl_CodeRun: data:', data, 'session_data:', session_data, 'response:', response, 'workspace:', workspace))

    # Check if Exists: scripts <DIR> and create it if not...
    scripts_dir = os.path.dirname('./' + workspace + '/scripts/')
    if not os.path.exists(scripts_dir): os.makedirs(scripts_dir)

    perlExe = 'perl'
    if (os.name == 'nt'):
        perlExe = config.PERL_EXEC
    else:
        perlExe = config.PERL_BIN

    cmd = [ perlExe ]
    perlopts = {}
    if data.__contains__('opts'): perlopts = data['opts']

    # If cmd exists we are running perl_init
    if ( data.__contains__('cmd') and hasattr(data['cmd'], "__len__" ) ):
        perlopts['del_script'] = 1; # DEFAULT DELETE SCRIPTS
        perlobj = data['cmd'];  # "perl_incdirs":[], "perl_add_use":[], "perl_init":'<perl init code>'

        # First ADD Perl Init Code:
        perl_code = perlobj['perl_init']

        # Then ADD @INC DIRs:
        if ( hasattr(perlobj['perl_incdirs'], "__len__" ) and not perl_code.endswith("\n") ): # Add NewLine if it's not there
            perl_code += "\n"
        for add_incdir in perlobj['perl_incdirs']:
            perl_code += 'BEGIN { push(@INC, "' + add_incdir + '"); };' + "\n"

        # Then ADD modules:
        if ( hasattr(perlobj['perl_add_use'], "__len__" ) and not perl_code.endswith("\n") ): # Add NewLine if it's not there
            perl_code += "\n"
        for add_module in perlobj['perl_add_use']:
            perl_code += 'use ' + add_module + ';' + "\n"

        # Then ADD require's:
        if ( hasattr(perlobj['perl_add_require'], "__len__" ) and not perl_code.endswith("\n") ): # Add NewLine if it's not there
            perl_code += "\n"
        for add_require in perlobj['perl_add_require']:
            if ( "/" not in add_require ):
                perl_code += 'require "./' + add_require + '";' + "\n"
            else:
                perl_code += 'require "' + add_require + '";' + "\n"

        from tempfile import mkstemp
        fd, temp_script_path = mkstemp(dir=scripts_dir, prefix= datetime.datetime.today().strftime('%Y%m%d%H%M%S') + "-perl_script", suffix = '.pl')
        # use a context manager to open the file at that path and close it again
        with open(temp_script_path, 'w', encoding='utf-8', newline='') as f:
            f.write( perl_code )
        # close the file descriptor
        os.close(fd)

        if (DEBUG): print('@on_perl_CodeRun: script', temp_script_path)

        cmd = [ perlExe, temp_script_path ]

        if ( hasattr(config, "PERL_EXEC") and config.PERL_EXEC !='' ):
            cmd = [ config.PERL_EXEC, temp_script_path ]
    else:
        if (DEBUG): pprint(('@on_perl_CodeRun: RunScript:', data))
        cmd = [ perlExe , data['script']['perl_script_file'], data['parm']]

    if (DEBUG): print('@on_perl_CodeRun: cmd:',cmd)
    ret = ''
    try:
        ret = subprocess.check_output(cmd, stderr=subprocess.STDOUT, encoding='UTF-8')
        if (DEBUG): print('@on_perl_CodeRun: RetVal:', ret)
    except Exception as err:
        import traceback
        exc_info = sys.exc_info()
        #ret = dict( traceback = json.dumps(traceback.format_exception(*exc_info)), Exception = json.dumps(exception_as_dict(err),indent=2) ) # as JSON
        ret = dict( traceback=traceback.format_exception(*exc_info), Exception=exception_as_dict(err) , error='true') # pure objects
        print('@on_perl_CodeRun: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
    
    if ( perlopts.__contains__('del_script') and perlopts['del_script'] == 1 ):
        os.remove(temp_script_path) # delete temp file

    data['RetVal'] = ret

def on_python_CodeRun(data, response, session_data):
    workspace = config.PRJ['WORKSPACE_DIR']
    if data.__contains__('workspace'):
        workspace = data['workspace']
    else:
        try:
            workspace = session_data['user'].get_property('workspace')
        except: None

    if (DEBUG): pprint(('@on_python_CodeRun: data:', data, 'session_data:', session_data, 'response:', response, 'workspace:', workspace))

    # Check if Exists: scripts <DIR> and create it if not...
    scripts_dir = os.path.dirname('./' + workspace + '/scripts/')
    if not os.path.exists(scripts_dir): os.makedirs(scripts_dir)

    pythonExe = sys.executable
    if (os.name == 'nt'):
        pythonExe = config.PYTHON_EXEC
    else:
        pythonExe = config.PYTHON_BIN

    cmd = [ pythonExe ]
    pythonopts = {}
    if data.__contains__('opts'): pythonopts = data['opts']

    # If cmd exists we are running python_init
    if ( data.__contains__('cmd') and hasattr(data['cmd'], "__len__" ) ):
        pythonopts['del_script'] = 1; # DEFAULT DELETE SCRIPTS
        pythonobj = data['cmd'];  # "python_incdirs":[], "python_add_use":[], "python_init":'<python init code>'

        # First ADD python Init Code:
        python_code = pythonobj['python_init']

        from tempfile import mkstemp
        fd, temp_script_path = mkstemp(dir=scripts_dir, prefix= datetime.datetime.today().strftime('%Y%m%d%H%M%S') + "-python_script", suffix = '.py')
        # use a context manager to open the file at that path and close it again
        with open(temp_script_path, 'w', encoding='utf-8', newline='') as f:
            f.write( python_code )
        # close the file descriptor
        os.close(fd)

        if (DEBUG): print('@on_python_CodeRun: script', temp_script_path)

        cmd = [ pythonExe, temp_script_path ]

        if ( hasattr(config, "PYTHON_EXEC") and config.PYTHON_EXEC != '' ):
            cmd = [ config.PYTHON_EXEC, temp_script_path ]

    else:
        if (DEBUG): pprint(('@on_python_CodeRun: RunScript:', data))
        cmd = [ pythonExe , data['script']['python_script_file'], data['parm']]
        
    if (DEBUG): print('@on_python_CodeRun: cmd:',cmd)
    ret = ''
    try:
        ret = subprocess.check_output(cmd, stderr=subprocess.STDOUT, encoding='UTF-8')
        if (DEBUG): print('@on_python_CodeRun: RetVal:', ret)
    except Exception as err:
        import traceback
        exc_info = sys.exc_info()
        #ret = dict( traceback = json.dumps(traceback.format_exception(*exc_info)), Exception = json.dumps(exception_as_dict(err),indent=2) ) # as JSON
        ret = dict( traceback=traceback.format_exception(*exc_info), Exception=exception_as_dict(err) , error='true') # pure objects
        print('@on_python_CodeRun: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
    
    if ( pythonopts.__contains__('del_script') and pythonopts['del_script'] == 1 ):
        os.remove(temp_script_path) # delete temp file

    data['RetVal'] = ret

def on_expect_CodeRun(data, response, session_data):
    workspace = config.PRJ['WORKSPACE_DIR']
    if data.__contains__('workspace'):
        workspace = data['workspace']
    else:
        try:
            workspace = session_data['user'].get_property('workspace')
        except: None

    if (DEBUG): pprint(('@on_expect_CodeRun: data:', data, 'session_data:', session_data, 'response:', response, 'workspace:', workspace))

    # Check if Exists: scripts <DIR> and create it if not...
    scripts_dir = os.path.dirname('./' + workspace + '/scripts/')
    if not os.path.exists(scripts_dir): os.makedirs(scripts_dir)

    expectExe = sys.executable
    if (os.name == 'nt'):
        expectExe = config.EXPECT_EXEC
    else:
        expectExe = config.EXPECT_BIN

    cmd = [ expectExe ]
    expectopts = {}
    if data.__contains__('opts'): expectopts = data['opts']

    # If cmd exists we are running expect_init
    if ( data.__contains__('cmd') and hasattr(data['cmd'], "__len__" ) ):
        expectopts['del_script'] = 1; # DEFAULT DELETE SCRIPTS
        expectobj = data['cmd'];  # "expect_incdirs":[], "expect_add_use":[], "expect_init":'<expect init code>'

        # First ADD expect Init Code:
        expect_code = expectobj['expect_init']

        from tempfile import mkstemp
        fd, temp_script_path = mkstemp(dir=scripts_dir, prefix= datetime.datetime.today().strftime('%Y%m%d%H%M%S') + "-expect_script", suffix = '.exp')
        # use a context manager to open the file at that path and close it again
        with open(temp_script_path, 'w', encoding='utf-8', newline='') as f:
            f.write( expect_code )
        # close the file descriptor
        os.close(fd)

        if (DEBUG): print('@on_expect_CodeRun: script', temp_script_path)

        cmd = [ expectExe, temp_script_path ]

        if ( hasattr(config, "EXPECT_EXEC") and config.EXPECT_EXEC != '' ):
            cmd = [ config.EXPECT_EXEC, temp_script_path ]

    else:
        if (DEBUG): pprint(('@on_expect_CodeRun: RunScript:', data))
        cmd = [ expectExe , data['script']['expect_script_file'], data['parm']]
        
    if (DEBUG): print('@on_expect_CodeRun: cmd:',cmd)
    ret = ''
    try:
        ret = subprocess.check_output(cmd, stderr=subprocess.STDOUT, encoding='UTF-8')
        if (DEBUG): print('@on_expect_CodeRun: RetVal:', ret)
    except Exception as err:
        import traceback
        exc_info = sys.exc_info()
        #ret = dict( traceback = json.dumps(traceback.format_exception(*exc_info)), Exception = json.dumps(exception_as_dict(err),indent=2) ) # as JSON
        ret = dict( traceback=traceback.format_exception(*exc_info), Exception=exception_as_dict(err) , error='true') # pure objects
        print('@on_expect_CodeRun: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
    
    if ( expectopts.__contains__('del_script') and expectopts['del_script'] == 1 ):
        os.remove(temp_script_path) # delete temp file

    data['RetVal'] = ret

def on_tcl_CodeRun(data, response, session_data):
    workspace = config.PRJ['WORKSPACE_DIR']
    if data.__contains__('workspace'):
        workspace = data['workspace']
    else:
        try:
            workspace = session_data['user'].get_property('workspace')
        except: None

    if (DEBUG): pprint(('@on_tcl_CodeRun: data:', data, 'session_data:', session_data, 'response:', response, 'workspace:', workspace))

    # Check if Exists: scripts <DIR> and create it if not...
    scripts_dir = os.path.dirname('./' + workspace + '/scripts/')
    if not os.path.exists(scripts_dir): os.makedirs(scripts_dir)

    tclExe = sys.executable
    if (os.name == 'nt'):
        tclExe = config.TCL_EXEC
    else:
        tclExe = config.TCL_BIN

    cmd = [ tclExe ]
    tclopts = {}
    if data.__contains__('opts'): tclopts = data['opts']

    # If cmd exists we are running tcl_init
    if ( data.__contains__('cmd') and hasattr(data['cmd'], "__len__" ) ):
        tclopts['del_script'] = 1; # DEFAULT DELETE SCRIPTS
        tclobj = data['cmd'];  # "tcl_incdirs":[], "tcl_add_use":[], "tcl_init":'<tcl init code>'

        # First ADD tcl Init Code:
        tcl_code = tclobj['tcl_init']

        from tempfile import mkstemp
        fd, temp_script_path = mkstemp(dir=scripts_dir, prefix= datetime.datetime.today().strftime('%Y%m%d%H%M%S') + "-tcl_script", suffix = '.tcl')
        # use a context manager to open the file at that path and close it again
        with open(temp_script_path, 'w', encoding='utf-8', newline='') as f:
            f.write( tcl_code )
        # close the file descriptor
        os.close(fd)

        if (DEBUG): print('@on_tcl_CodeRun: script', temp_script_path)

        cmd = [ tclExe, temp_script_path ]

        if ( hasattr(config, "TCL_EXEC") and config.TCL_EXEC != '' ):
            cmd = [ config.TCL_EXEC, temp_script_path ]

    else:
        if (DEBUG): pprint(('@on_tcl_CodeRun: RunScript:', data))
        cmd = [ tclExe , data['script']['tcl_script_file'], data['parm']]
        
    if (DEBUG): print('@on_tcl_CodeRun: cmd:',cmd)
    ret = ''
    try:
        ret = subprocess.check_output(cmd, stderr=subprocess.STDOUT, encoding='UTF-8')
        if (DEBUG): print('@on_tcl_CodeRun: RetVal:', ret)
    except Exception as err:
        import traceback
        exc_info = sys.exc_info()
        #ret = dict( traceback = json.dumps(traceback.format_exception(*exc_info)), Exception = json.dumps(exception_as_dict(err),indent=2) ) # as JSON
        ret = dict( traceback=traceback.format_exception(*exc_info), Exception=exception_as_dict(err) , error='true') # pure objects
        print('@on_tcl_CodeRun: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
    
    if ( tclopts.__contains__('del_script') and tclopts['del_script'] == 1 ):
        os.remove(temp_script_path) # delete temp file

    data['RetVal'] = ret

def on_node_CodeRun(data, response, session_data):
    workspace = config.PRJ['WORKSPACE_DIR']
    if data.__contains__('workspace'):
        workspace = data['workspace']
    else:
        try:
            workspace = session_data['user'].get_property('workspace')
        except: None

    if (DEBUG): pprint(('@on_node_CodeRun: data:', data, 'session_data:', session_data, 'response:', response, 'workspace:', workspace))

    # Check if Exists: scripts <DIR> and create it if not...
    scripts_dir = os.path.dirname('./' + workspace + '/scripts/')
    if not os.path.exists(scripts_dir): os.makedirs(scripts_dir)

    nodeExe = sys.executable
    if (os.name == 'nt'):
        nodeExe = config.NODE_EXEC
    else:
        nodeExe = config.NODE_BIN

    cmd = [ nodeExe ]
    nodeopts = {}
    if data.__contains__('opts'): nodeopts = data['opts']

    # If cmd exists we are running node_init
    if ( data.__contains__('cmd') and hasattr(data['cmd'], "__len__" ) ):
        nodeopts['del_script'] = 1; # DEFAULT DELETE SCRIPTS
        nodeobj = data['cmd'];  # "node_incdirs":[], "node_add_use":[], "node_init":'<node init code>'

        # First ADD node Init Code:
        node_code = nodeobj['node_init']

        from tempfile import mkstemp
        fd, temp_script_path = mkstemp(dir=scripts_dir, prefix= datetime.datetime.today().strftime('%Y%m%d%H%M%S') + "-node_script", suffix = '.js')
        # use a context manager to open the file at that path and close it again
        with open(temp_script_path, 'w', encoding='utf-8', newline='') as f:
            f.write( node_code )
        # close the file descriptor
        os.close(fd)

        if (DEBUG): print('@on_node_CodeRun: script', temp_script_path)

        cmd = [ nodeExe, temp_script_path ]

        if ( hasattr(config, "NODE_EXEC") and config.NODE_EXEC != '' ):
            cmd = [ config.NODE_EXEC, temp_script_path ]

    else:
        if (DEBUG): pprint(('@on_node_CodeRun: RunScript:', data))
        cmd = [ nodeExe , data['script']['node_script_file'], data['parm']]
        
    if (DEBUG): print('@on_node_CodeRun: cmd:',cmd)
    ret = ''
    try:
        ret = subprocess.check_output(cmd, stderr=subprocess.STDOUT, encoding='UTF-8')
        if (DEBUG): print('@on_node_CodeRun: RetVal:', ret)
    except Exception as err:
        import traceback
        exc_info = sys.exc_info()
        #ret = dict( traceback = json.dumps(traceback.format_exception(*exc_info)), Exception = json.dumps(exception_as_dict(err),indent=2) ) # as JSON
        ret = dict( traceback=traceback.format_exception(*exc_info), Exception=exception_as_dict(err) , error='true') # pure objects
        print('@on_node_CodeRun: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
    
    if ( nodeopts.__contains__('del_script') and nodeopts['del_script'] == 1 ):
        os.remove(temp_script_path) # delete temp file

    data['RetVal'] = ret

def LzDec64(data):
    return lzstring.LZString().decompressFromBase64(data)

def LzEnc64(data):
    return lzstring.LZString().compressToBase64(data)

def preprocessUUID(data):
    global RAWOUTPUT, OUTPUT, VARS
    try:    VARS['uuid'] = data['uuid']
    except:
            VARS = {'uuid': UUID()}
    if (not VARS.__contains__(VARS['uuid']) or not type(VARS[VARS['uuid']]) is dict):
        VARS[VARS['uuid']] = {'RAWOUTPUT':'','OUTPUT':''}
    RAWOUTPUT = VARS[VARS['uuid']]['RAWOUTPUT']
    OUTPUT = VARS[VARS['uuid']]['OUTPUT']

def on_saveWorkflowProcess(data, response, session_data):
    global RAWOUTPUT, OUTPUT, VARS
    data['uuid'] = UUID(True) # we generate a new UUID for safety otherwise web VARS and Cronvars could be changed in case of parallel runtime
    preprocessUUID(data)
    if (DEBUG): pprint(('@on_saveWorkflowProcess: data:', data, 'session_data:', session_data, 'response:', response, 'workspace:'))
    cronFile = ''
    if data.__contains__('cronFile'): cronFile = data['cronFile']
    if (cronFile !=''):
        with open(cronFile, 'w', encoding='utf-8', newline='') as f:
            strCode = ''
            try:
                strCode += '#!' + config.PYTHON_BIN + "\n"
                strCode += '# create_dt:'+ datestr('{:02}-{:02}-{:02}H{:02}:{:02}:{:02}.{:1}') + ' uid:' + str(current_user.id) + ' username:' + str(current_user.username) + " \n"
                strCode += "\n"
                strCode += 'import sys; sys.dont_write_bytecode = True; # don\'t write __pycache__ DIR' + "\n"
                strCode += "\n"
                strCode += 'from pprint import pprint, pformat' + "\n"
                strCode += 'import subprocess' + "\n"
                strCode += 'import psycopg2' + "\n"
                strCode += 'import base64' + "\n"
                strCode += 'import json' + "\n"
                strCode += 'import os' + "\n"
                strCode += "\n"
                strCode += "osSEP = '/' if ( not os.name == 'nt') else '\\\\';sys.path.insert(0,os.path.abspath(os.path.join(os.path.dirname(__file__),'..'+osSEP+'..'+osSEP+'..')))" + "\n"
                strCode += 'import ultide.core as UltideCore' + "\n"
                strCode += "\n"
                strCode += 'processData = [' + "\n"
                true=True;false=False;null=None; # json.fix: true/false/null => True/False/None
                for _item in json.loads(LzDec64(data['lz'])):
                    #strCode += 'json.dumps(' + pformat(eval(_item)) + '),' + "\n"  # PrettyPrint
                    strCode += 'json.dumps(' + str(json.loads(_item)) + '),' + "\n"  # json.loads replaced := OLD {eval is to activate json.fix}
                strCode += ']' + "\n"
                strCode += "response={}              # use: 'uuid': UltideCore.UUID(True) if you run this script in parallel jobs and don't want to share VARS" + "\n"
                strCode += "UltideCore.execWorkflowProcess({'uuid': '" + VARS['uuid'] + "','id': '" + data['id'] + "', 'name': '" + data['name'] + "', 'lz': UltideCore.LzEnc64(json.dumps(processData))}, response)" + "\n"

                f.write( strCode )
            except Exception as err:
                print('@on_saveWorkflowProcess: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

        f.close()

def execWorkflowProcess(processData, response):
    global RAWOUTPUT, OUTPUT, VARS
    UsrDomain = os.getenv('USERDOMAIN', '')
    if (UsrDomain != ''): UsrDomain += '\\'
    Username = os.getenv('USERNAME', '')
    if (Username == ''): Username = os.getenv('USER', '')
    if (Username == ''): Username = 'unknown'
    Username = UsrDomain + Username
    session_data={'user': {'username': Username}}
    
    on_execWorkflowProcess(processData, response, session_data)

def renderVars():
    global RAWOUTPUT, OUTPUT, VARS
    return { 'config': mod_2_dict(config), 'VARS': VARS[VARS['uuid']], 'RAWOUTPUT': RAWOUTPUT, 'OUTPUT': OUTPUT, 'globals': globals(), 'locals': locals() }

def pystacheRender(template):
    true=True;false=False;null=None; # fix:json: true/false/null => True/False/None
    retObj = template
    return json.loads( pystache.render( template, globals(), **renderVars() ) )

def on_execWorkflowProcess(data, response, session_data):
    global RAWOUTPUT, OUTPUT, VARS
    true=True;false=False;null=None; # fix:json: true/false/null => True/False/None

    preprocessUUID(data)

    response['id'] = data['id'] 
    response['name'] = data['name']
    response['uuid'] = VARS['uuid']

    data['start_date'] = datetime.datetime.now(TZ).isoformat()
    finalProcessList = {}
    finalProcessList = json.loads(LzDec64(data['lz']))
    WfProcessList = {}
    procRef={}
    jID = 0

    procIDs = []
    for jsonWfProcess in finalProcessList:
        WfProcess = WfProcessList[WfProcess['id']] = pystacheRender(jsonWfProcess)
        procIDs.append(WfProcess['id']) # Honor ProcessID Original Array sequence
        procRef[WfProcess['id']] = jID
        jID += 1

    for procID in procIDs:
        if (not response.__contains__(procID)): response[procID] = {}   # Polulate response[#procID: 0...99] = store results of scripts
        #WfProcess = WfProcessList[procID]
        
        # Reprocess pystache template for new variables that may appear during run...
        tmpObj = {}
        try:
            tmpObj = pystacheRender(json.dumps(finalProcessList[procRef[procID]]))
        except:
            tmpObj = finalProcessList[procRef[procID]]
            pprint(('@on_execWorkflowProcess: ERROR:FAILED: pystacheRender: WfProcess:', type(tmpObj), tmpObj, dir(tmpObj)))

        if (type(tmpObj) is str): tmpObj = json.loads(finalProcessList[procRef[procID]])
        WfProcess = WfProcessList[procID] = tmpObj

        if (DEBUG): pprint(('@on_execWorkflowProcess: WfProcess:', type(WfProcess), WfProcess, dir(WfProcess)))
        #print('Operator.type:',WfProcess['o']['type'])
        oType = WfProcess['o']['type']

        if   re.match(r".*::load_file", oType):

            if os.path.isfile(WfProcess['p']['filepath']):
                with open(WfProcess['p']['filepath'], 'r') as f:
                    for (_Idx, _pflink) in enumerate(WfProcess['tl']):  # Link is Array := List
                        OutputVar = _pflink['fromConnector']
                        WfProcess[OutputVar] = ''
                        try:
                            WfProcess[OutputVar] = f.read() # 'Load File'.data = <file_data>
                            response[procID].update({OutputVar: json.loads(WfProcess[OutputVar]) })
                        except Exception as err:
                            print('@on_execWorkflowProcess.load_file['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
                    
                    if (DEBUG): pprint(('load_file: SetVar: WfProcessList['+procID+'].', OutputVar, ' := ', WfProcessList[procID][OutputVar]))

                f.close()
            else:
                if (DEBUG): print('load_file['+procID+']: File Not Found: \'' + WfProcess['p']['filepath']+'\'')

        elif re.match(r".*::save_file", oType):

            if (WfProcess['p']['filepath'] != ''):
                with open(WfProcess['p']['filepath'], 'w', encoding='utf-8', newline='') as f:
                    for (_Idx, _pflink) in enumerate(WfProcess['fl']):  # Link is Array := List
                        InputVar = _pflink['toConnector']
                        parentOutputVar = _pflink['fromConnector']
                        #print('save_file: SetVar:'+oType+'.'+InputVar+':='+parentOutputVar)
                        WfProcess[InputVar] = ''
                        try:
                            parentOperID = WfProcess['fl'][0]['fromOperator']
                            OutputVal = WfProcessList[parentOperID][parentOutputVar]
                            WfProcess[InputVar] = OutputVal
                            response[procID].update({InputVar: WfProcess[InputVar] })
                            f.write( json.dumps(WfProcess[InputVar]) )

                        except Exception as err:
                            print('@on_execWorkflowProcess.save_file['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
                        
                        if (DEBUG): pprint(('save_file: SetVar: WfProcessList['+procID+'].', InputVar, ' := ', WfProcessList[procID][InputVar]))
                f.close()
            else:
                if (DEBUG): print('save_file['+procID+']: File Not Found: \'' + WfProcess['p']['filepath']+'\'')

        elif re.match(r".*::multiple_inputs_outputs", oType):
            #pprint(('@on_execWorkflowProcess.multiple_inputs_outputs['+procID+']: Init:',dict(fromLinks = WfProcess['tl'])))
            OutputVals = {}
            # Cycle parent.data -> inputVars => Push into {OutputVals}
            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                parentOperID = ''
                try:
                    #pprint(('@on_execWorkflowProcess.multiple_inputs_outputs['+procID+']: Init:',dict( InputVar = InputVar, parentOutputVar = parentOutputVar, fromLinksParents = _pflink['fromOperator'], parentID= WfProcess['parents'][_pIdx]['id'])))
                    #OutputVals[InputVar] = ''
                    parentOperID = WfProcess['fl'][_Idx]['fromOperator']

                    #OutputVals[InputVar] = str(WfProcessList[parentOperID][parentOutputVar])
                    OutputVals[InputVar] = WfProcessList[parentOperID][parentOutputVar]
                    if (DEBUG): pprint(('@on_execWorkflowProcess.fl.multiple_inputs_outputs['+procID+']: In:', dict(InputVar=InputVar, parentOutputVar=parentOutputVar, parentOperID=parentOperID, OutputVals=OutputVals)))
                except Exception as err:
                    pprint(('@on_execWorkflowProcess.fl.multiple_inputs_outputs['+procID+']: Error.In:', err, dict(_pflink= _pflink, fromLink= WfProcess['fl'], OutputVals=OutputVals ))) # To print out the exception message , print out the stdout messages up to the exception

                try:
                    if (DEBUG): pprint(('fl.multiple_inputs_outputs['+procID+']: In: SetVar: WfProcessList['+procID+'].', InputVar, ' := ', OutputVals[InputVar]))
                except Exception as err:
                    pprint(('@on_execWorkflowProcess.fl.multiple_inputs_outputs['+procID+']: Error:', err, dict(fromLink= WfProcess['fl']) )) # To print out the exception message , print out the stdout messages up to the exception

            # Repeat Cycle to json both inputVars to outputVars
            for (_Idx, _pflink) in enumerate(WfProcess['tl']): # Link is Array := List
                OutputVar = _pflink['fromConnector']
                try:
                    #WfProcess[OutputVar] = ''
                    #WfProcess[OutputVar] = json.dumps(OutputVals) # json (join all data)
                    WfProcess[OutputVar] = {}
                    WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                    WfProcess[OutputVar].update(WfProcess['p'])
                    WfProcess[OutputVar].update({OutputVar: OutputVals })
                    response[procID].update(WfProcess[OutputVar])

                    if (DEBUG): pprint(('@on_execWorkflowProcess.tl.multiple_inputs_outputs['+procID+']: Out:', dict(OutputVar=OutputVar, OutputVals=OutputVals, var=WfProcess[OutputVar])))

                except Exception as err:
                    pprint(('@on_execWorkflowProcess.tl.multiple_inputs_outputs['+procID+']: Error.Out:', err, dict(_pflink= _pflink, toLink= WfProcess['tl'], OutputVar=OutputVar ))) # To print out the exception message , print out the stdout messages up to the exception

                try:
                    if (DEBUG): pprint(('tl.multiple_inputs_outputs: SetVar: WfProcessList['+procID+'].', OutputVar,' := ', WfProcessList[procID][OutputVar]))
                except Exception as err:
                    pprint(('@on_execWorkflowProcess.tl.multiple_inputs_outputs['+procID+']: Error:', err, dict(toLink= WfProcess['fl']) )) # To print out the exception message , print out the stdout messages up to the exception

        elif re.match(r".*::all_fields", oType):
            #pprint(('@on_execWorkflowProcess.all_fields['+procID+']: Init:',dict(fromLinks = WfProcess['tl'])))
            OutputVals = {}
            # Cycle parent.data -> inputVars => Push into {OutputVals}
            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                parentOperID = ''
                try:
                    #pprint(('@on_execWorkflowProcess.all_fields['+procID+']: Init:',dict( InputVar = InputVar, parentOutputVar = parentOutputVar, fromLinksParents = _pflink['fromOperator'], parentID= WfProcess['parents'][_pIdx]['id'])))
                    #OutputVals[InputVar] = ''
                    parentOperID = WfProcess['fl'][_Idx]['fromOperator']

                    #OutputVals[InputVar] = str(WfProcessList[parentOperID][parentOutputVar])
                    OutputVals[InputVar] = WfProcessList[parentOperID][parentOutputVar]
                    if (DEBUG): pprint(('@on_execWorkflowProcess.fl.all_fields['+procID+']: In:', dict(InputVar=InputVar, parentOutputVar=parentOutputVar, parentOperID=parentOperID, OutputVals=OutputVals)))
                except Exception as err:
                    pprint(('@on_execWorkflowProcess.fl.all_fields['+procID+']: Error.In:', err, dict(_pflink= _pflink, fromLink= WfProcess['fl'], OutputVals=OutputVals ))) # To print out the exception message , print out the stdout messages up to the exception

                try:
                    if (DEBUG): pprint(('fl.all_fields['+procID+']: In: SetVar: WfProcessList['+procID+'].', InputVar, ' := ', OutputVals[InputVar]))
                except Exception as err:
                    pprint(('@on_execWorkflowProcess.fl.all_fields['+procID+']: Error:', err, dict(fromLink= WfProcess['fl']) )) # To print out the exception message , print out the stdout messages up to the exception

            # Repeat Cycle to json both inputVars to outputVars
            for (_Idx, _pflink) in enumerate(WfProcess['tl']): # Link is Array := List
                OutputVar = _pflink['fromConnector']
                try:
                    #WfProcess[OutputVar] = ''
                    #WfProcess[OutputVar] = json.dumps(OutputVals) # json (join all data)
                    WfProcess[OutputVar] = {}
                    WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                    WfProcess[OutputVar].update(WfProcess['p'])
                    WfProcess[OutputVar].update({OutputVar: OutputVals })
                    response[procID].update(WfProcess[OutputVar])

                    if (DEBUG): pprint(('@on_execWorkflowProcess.tl.all_fields['+procID+']: Out:', dict(OutputVar=OutputVar, OutputVals=OutputVals, var=WfProcess[OutputVar])))

                except Exception as err:
                    pprint(('@on_execWorkflowProcess.tl.all_fields['+procID+']: Error.Out:', err, dict(_pflink= _pflink, toLink= WfProcess['tl'], OutputVar=OutputVar ))) # To print out the exception message , print out the stdout messages up to the exception

                try:
                    if (DEBUG): pprint(('tl.all_fields: SetVar: WfProcessList['+procID+'].', OutputVar,' := ', WfProcessList[procID][OutputVar]))
                except Exception as err:
                    pprint(('@on_execWorkflowProcess.tl.all_fields['+procID+']: Error:', err, dict(toLink= WfProcess['fl']) )) # To print out the exception message , print out the stdout messages up to the exception

        elif re.match(r".*::perl_init", oType):
            for (_Idx, _pflink) in enumerate(WfProcess['tl']): # Link is Array := List
                OutputVar = _pflink['fromConnector']
                #WfProcess[InputVar] = 'Teste123'
                #_data = {}
                #_data['cmd'] = json.dumps(WfProcess['p']) # Perl Parameters to JSON
                RunCmd = {}
                RunCmd['cmd'] = WfProcess['p']
                
                RunCmd['start_date'] = datetime.datetime.now(TZ).isoformat()
                on_perl_CodeRun( RunCmd, response, session_data )
                RunCmd['end_date'] = datetime.datetime.now(TZ).isoformat()

                #WfProcess[InputVar] = ''
                #try: WfProcess[InputVar] = response['RetVal']
                try:
                    # Preprocess vars for OUTPUT
                    RunCmd['RetVal'] = explodeVARS(RunCmd['RetVal'])
                    WfProcess['p']['perl_init'] = uri_escape(WfProcess['p']['perl_init'])
                    WfProcess[OutputVar] = {}
                    WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                    WfProcess[OutputVar].update(WfProcess['p'])
                    WfProcess[OutputVar].update({'RetVal': RunCmd['RetVal'], 'start_date': str(RunCmd['start_date']), 'end_date': str(RunCmd['end_date'])})
                    response[procID].update(WfProcess[OutputVar])
                except Exception as err:
                    print('@on_execWorkflowProcess.perl_init['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

                if (DEBUG): pprint(('perl_init['+procID+']: SetVar: WfProcessList['+procID+'].'+OutputVar+' := ', WfProcessList[procID][OutputVar], type(WfProcessList[procID][OutputVar]), len(str(WfProcessList[procID][OutputVar]))))

        elif re.match(r".*::python_init", oType):
            for (_Idx, _pflink) in enumerate(WfProcess['tl']): # Link is Array := List
                OutputVar = _pflink['fromConnector']
                #WfProcess[OutputVar] = 'Teste123'
                #_data = {}
                #_data['cmd'] = json.dumps(WfProcess['p']) # Python Parameters to JSON
                RunCmd = {}
                RunCmd['cmd'] = WfProcess['p']

                RunCmd['start_date'] = datetime.datetime.now(TZ).isoformat()
                on_python_CodeRun( RunCmd, response, session_data )
                RunCmd['end_date'] = datetime.datetime.now(TZ).isoformat()
                
                #WfProcess[OutputVar] = ''
                #try: WfProcess[OutputVar] = response['RetVal']
                try:
                    # Preprocess vars for OUTPUT
                    RunCmd['RetVal'] = explodeVARS(RunCmd['RetVal'])
                    WfProcess['p']['python_init'] = uri_escape(WfProcess['p']['python_init'])
                    WfProcess[OutputVar] = {}
                    WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                    WfProcess[OutputVar].update(WfProcess['p'])
                    WfProcess[OutputVar].update({'RetVal': RunCmd['RetVal'], 'start_date': str(RunCmd['start_date']), 'end_date': str(RunCmd['end_date'])})
                    response[procID].update(WfProcess[OutputVar])
                except Exception as err:
                    print('@on_execWorkflowProcess.python_init['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

                if (DEBUG): pprint(('python_init['+procID+']: SetVar: WfProcessList['+procID+'].', OutputVar, ' := ', WfProcessList[procID][OutputVar]))

        elif re.match(r".*::expect_init", oType):
            for (_Idx, _pflink) in enumerate(WfProcess['tl']): # Link is Array := List
                OutputVar = _pflink['fromConnector']
                RunCmd = {}
                RunCmd['cmd'] = WfProcess['p']
                
                RunCmd['start_date'] = datetime.datetime.now(TZ).isoformat()
                on_expect_CodeRun( RunCmd, response, session_data )
                RunCmd['end_date'] = datetime.datetime.now(TZ).isoformat()

                try:
                    # Preprocess vars for OUTPUT
                    RunCmd['RetVal'] = explodeVARS(RunCmd['RetVal'])
                    WfProcess['p']['expect_init'] = uri_escape(WfProcess['p']['expect_init'])
                    WfProcess[OutputVar] = {}
                    WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                    WfProcess[OutputVar].update(WfProcess['p'])
                    WfProcess[OutputVar].update({'RetVal': RunCmd['RetVal'], 'start_date': str(RunCmd['start_date']), 'end_date': str(RunCmd['end_date'])})
                    response[procID].update(WfProcess[OutputVar])
                except Exception as err:
                    print('@on_execWorkflowProcess.expect_init['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
                if (DEBUG): pprint(('expect_init['+procID+']: SetVar: WfProcessList['+procID+'].', OutputVar, ' := ', WfProcessList[procID][OutputVar]))

        elif re.match(r".*::tcl_init", oType):
            for (_Idx, _pflink) in enumerate(WfProcess['tl']): # Link is Array := List
                OutputVar = _pflink['fromConnector']
                RunCmd = {}
                RunCmd['cmd'] = WfProcess['p']
                
                RunCmd['start_date'] = datetime.datetime.now(TZ).isoformat()
                on_tcl_CodeRun( RunCmd, response, session_data )
                RunCmd['end_date'] = datetime.datetime.now(TZ).isoformat()

                try:
                    # Preprocess vars for OUTPUT
                    RunCmd['RetVal'] = explodeVARS(RunCmd['RetVal'])
                    WfProcess['p']['tcl_init'] = uri_escape(WfProcess['p']['tcl_init'])
                    WfProcess[OutputVar] = {}
                    WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                    WfProcess[OutputVar].update(WfProcess['p'])
                    WfProcess[OutputVar].update({'RetVal': RunCmd['RetVal'], 'start_date': str(RunCmd['start_date']), 'end_date': str(RunCmd['end_date'])})
                    response[procID].update(WfProcess[OutputVar])
                except Exception as err:
                    print('@on_execWorkflowProcess.tcl_init['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
                if (DEBUG): pprint(('tcl_init['+procID+']: SetVar: WfProcessList['+procID+'].', OutputVar, ' := ', WfProcessList[procID][OutputVar]))

        elif re.match(r".*::node_init", oType):
            for (_Idx, _pflink) in enumerate(WfProcess['tl']): # Link is Array := List
                OutputVar = _pflink['fromConnector']
                RunCmd = {}
                RunCmd['cmd'] = WfProcess['p']

                RunCmd['start_date'] = datetime.datetime.now(TZ).isoformat()
                on_node_CodeRun( RunCmd, response, session_data )
                RunCmd['end_date'] = datetime.datetime.now(TZ).isoformat()

                try:
                    # Preprocess vars for OUTPUT
                    RunCmd['RetVal'] = explodeVARS(RunCmd['RetVal'])
                    WfProcess['p']['node_init'] = uri_escape(WfProcess['p']['node_init'])
                    WfProcess[OutputVar] = {}
                    WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                    WfProcess[OutputVar].update(WfProcess['p'])
                    WfProcess[OutputVar].update({'RetVal': RunCmd['RetVal'], 'start_date': str(RunCmd['start_date']), 'end_date': str(RunCmd['end_date'])})
                    response[procID].update(WfProcess[OutputVar])
                except Exception as err:
                    print('@on_execWorkflowProcess.node_init['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
                if (DEBUG): pprint(('node_init['+procID+']: SetVar: WfProcessList['+procID+'].', OutputVar, ' := ', WfProcessList[procID][OutputVar]))

        elif re.match(r".*::perl_script", oType):

            OutputVals = {}
            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                #OutputVal = ''
                parentOperID = ''
                try:
                    if (_pflink['fromOperator'] == WfProcess['parents'][0]['id']):
                        OutputVar = WfProcess['tl'][0]['fromConnector']
                        WfProcess[OutputVar] = ''
                        parentOperID = WfProcess['fl'][0]['fromOperator']
                        #OutputVal = str(WfProcessList[parentOperID][parentOutputVar])
                        OutputVals.update(WfProcess['p'])
                        OutputVals.update({ OutputVar: WfProcessList[parentOperID][parentOutputVar]})

                except Exception as err:
                    print('@on_execWorkflowProcess.perl_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            if (DEBUG): pprint(('perl_script['+procID+']: Parameter:', str(json.dumps(OutputVals))))
            RunCmd = {}
            RunCmd['script'] = WfProcess['p']
            RunCmd['parm'] = encodeZlibString( json.dumps(OutputVals) )
            
            RunCmd['start_date'] = datetime.datetime.now(TZ).isoformat()
            on_perl_CodeRun( RunCmd, response, session_data )
            RunCmd['end_date'] = datetime.datetime.now(TZ).isoformat()

            try:
                #WfProcess[OutputVar] = response['RetVal']
                RunCmd['RetVal'] = explodeVARS(RunCmd['RetVal'])
                WfProcess[OutputVar] = OutputVals
                WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                WfProcess[OutputVar].update(WfProcess['p'])
                WfProcess[OutputVar].update({'RetVal': RunCmd['RetVal'], 'start_date': str(RunCmd['start_date']), 'end_date': str(RunCmd['end_date'])})
                response[procID].update(WfProcess[OutputVar])
            except Exception as err:
                    print('@on_execWorkflowProcess.perl_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            if (DEBUG): pprint(('perl_script['+procID+']: SetVar:'+oType+'.'+InputVar+':='+WfProcess['parents'][_Idx]['o']['type']+'.'+parentOutputVar, OutputVar, ' := '+ InputVar + ' val:', OutputVals, ' lop['+parentOperID+']:' + _pflink['fromOperator'] + '==' +WfProcess['parents'][0]['id']))

        elif re.match(r".*::python_script", oType):

            OutputVals = {}
            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                #OutputVal = ''
                parentOperID = ''
                try:
                    if (_pflink['fromOperator'] == WfProcess['parents'][0]['id']):
                        OutputVar = WfProcess['tl'][0]['fromConnector']
                        WfProcess[OutputVar] = ''
                        parentOperID = WfProcess['fl'][0]['fromOperator']
                        #OutputVal = str(WfProcessList[parentOperID][parentOutputVar])
                        OutputVals.update(WfProcess['p'])
                        OutputVals.update({ OutputVar: WfProcessList[parentOperID][parentOutputVar]})

                except Exception as err:
                    print('@on_execWorkflowProcess.python_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            if (DEBUG): pprint(('python_script['+procID+']: Parameter:', str(json.dumps(OutputVals))))
            RunCmd = {}
            RunCmd['script'] = WfProcess['p']
            RunCmd['parm'] = encodeZlibString( json.dumps(OutputVals) )
            
            RunCmd['start_date'] = datetime.datetime.now(TZ).isoformat()
            on_python_CodeRun( RunCmd, response, session_data )
            RunCmd['end_date'] = datetime.datetime.now(TZ).isoformat()

            try:
                #WfProcess[OutputVar] = response['RetVal']
                RunCmd['RetVal'] = explodeVARS(RunCmd['RetVal'])
                WfProcess[OutputVar] = OutputVals
                WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                WfProcess[OutputVar].update(WfProcess['p'])
                WfProcess[OutputVar].update({'RetVal': RunCmd['RetVal'], 'start_date': str(RunCmd['start_date']), 'end_date': str(RunCmd['end_date'])})
                response[procID].update(WfProcess[OutputVar])
            except Exception as err:
                    print('@on_execWorkflowProcess.python_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            if (DEBUG): pprint(('python_script['+procID+']: SetVar:'+oType+'.'+InputVar+':='+WfProcess['parents'][_Idx]['o']['type']+'.'+parentOutputVar + ' '+ OutputVar + ' := '+ InputVar + ' vals:', OutputVals, ' lop['+parentOperID+']:' + _pflink['fromOperator'] + '==' +WfProcess['parents'][0]['id']))

        elif re.match(r".*::expect_script", oType):

            OutputVals = {}
            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                #OutputVal = ''
                parentOperID = ''
                try:
                    if (_pflink['fromOperator'] == WfProcess['parents'][0]['id']):
                        OutputVar = WfProcess['tl'][0]['fromConnector']
                        WfProcess[OutputVar] = ''
                        parentOperID = WfProcess['fl'][0]['fromOperator']
                        #OutputVal = str(WfProcessList[parentOperID][parentOutputVar])
                        OutputVals.update(WfProcess['p'])
                        OutputVals.update({ OutputVar: WfProcessList[parentOperID][parentOutputVar]})

                except Exception as err:
                    print('@on_execWorkflowProcess.expect_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            if (DEBUG): pprint(('expect_script['+procID+']: Parameter:', str(json.dumps(OutputVals))))
            RunCmd = {}
            RunCmd['script'] = WfProcess['p']
            RunCmd['parm'] = encodeZlibString( json.dumps(OutputVals) )

            RunCmd['start_date'] = datetime.datetime.now(TZ).isoformat()
            on_expect_CodeRun( RunCmd, response, session_data )
            RunCmd['end_date'] = datetime.datetime.now(TZ).isoformat()

            try:
                #WfProcess[OutputVar] = response['RetVal']
                RunCmd['RetVal'] = explodeVARS(RunCmd['RetVal'])
                WfProcess[OutputVar] = OutputVals
                WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                WfProcess[OutputVar].update(WfProcess['p'])
                WfProcess[OutputVar].update({'RetVal': RunCmd['RetVal'], 'start_date': str(RunCmd['start_date']), 'end_date': str(RunCmd['end_date'])})
                response[procID].update(WfProcess[OutputVar])
            except Exception as err:
                    print('@on_execWorkflowProcess.expect_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            if (DEBUG): pprint(('expect_script['+procID+']: SetVar:'+oType+'.'+InputVar+':='+WfProcess['parents'][_Idx]['o']['type']+'.'+parentOutputVar + ' '+ OutputVar + ' := '+ InputVar + ' vals:', OutputVals, ' lop['+parentOperID+']:' + _pflink['fromOperator'] + '==' +WfProcess['parents'][0]['id']))

        elif re.match(r".*::tcl_script", oType):

            OutputVals = {}
            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                #OutputVal = ''
                parentOperID = ''
                try:
                    if (_pflink['fromOperator'] == WfProcess['parents'][0]['id']):
                        OutputVar = WfProcess['tl'][0]['fromConnector']
                        WfProcess[OutputVar] = ''
                        parentOperID = WfProcess['fl'][0]['fromOperator']
                        #OutputVal = str(WfProcessList[parentOperID][parentOutputVar])
                        OutputVals.update(WfProcess['p'])
                        OutputVals.update({ OutputVar: WfProcessList[parentOperID][parentOutputVar]})

                except Exception as err:
                    print('@on_execWorkflowProcess.tcl_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            if (DEBUG): pprint(('tcl_script['+procID+']: Parameter:', str(json.dumps(OutputVals))))
            RunCmd = {}
            RunCmd['script'] = WfProcess['p']
            RunCmd['parm'] = encodeZlibString( json.dumps(OutputVals) )

            RunCmd['start_date'] = datetime.datetime.now(TZ).isoformat()
            on_tcl_CodeRun( RunCmd, response, session_data )
            RunCmd['end_date'] = datetime.datetime.now(TZ).isoformat()

            try:
                #WfProcess[OutputVar] = response['RetVal']
                RunCmd['RetVal'] = explodeVARS(RunCmd['RetVal'])
                WfProcess[OutputVar] = OutputVals
                WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                WfProcess[OutputVar].update(WfProcess['p'])
                WfProcess[OutputVar].update({'RetVal': RunCmd['RetVal'], 'start_date': str(RunCmd['start_date']), 'end_date': str(RunCmd['end_date'])})
                response[procID].update(WfProcess[OutputVar])
            except Exception as err:
                    print('@on_execWorkflowProcess.tcl_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            if (DEBUG): pprint(('tcl_script['+procID+']: SetVar:'+oType+'.'+InputVar+':='+WfProcess['parents'][_Idx]['o']['type']+'.'+parentOutputVar + ' '+ OutputVar + ' := '+ InputVar + ' vals:', OutputVals, ' lop['+parentOperID+']:' + _pflink['fromOperator'] + '==' +WfProcess['parents'][0]['id']))

        elif re.match(r".*::node_script", oType):

            OutputVals = {}
            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                #OutputVal = ''
                parentOperID = ''
                try:
                    if (_pflink['fromOperator'] == WfProcess['parents'][0]['id']):
                        OutputVar = WfProcess['tl'][0]['fromConnector']
                        WfProcess[OutputVar] = ''
                        parentOperID = WfProcess['fl'][0]['fromOperator']
                        #OutputVal = str(WfProcessList[parentOperID][parentOutputVar])
                        OutputVals.update(WfProcess['p'])
                        OutputVals.update({ OutputVar: WfProcessList[parentOperID][parentOutputVar]})

                except Exception as err:
                    print('@on_execWorkflowProcess.node_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            if (DEBUG): pprint(('node_script['+procID+']: Parameter:', str(json.dumps(OutputVals))))
            RunCmd = {}
            RunCmd['script'] = WfProcess['p']
            RunCmd['parm'] = encodeZlibString( json.dumps(OutputVals) )

            RunCmd['start_date'] = datetime.datetime.now(TZ).isoformat()
            on_node_CodeRun( RunCmd, response, session_data )
            RunCmd['end_date'] = datetime.datetime.now(TZ).isoformat()

            try:
                #WfProcess[OutputVar] = response['RetVal']
                RunCmd['RetVal'] = explodeVARS(RunCmd['RetVal'])
                WfProcess[OutputVar] = OutputVals
                WfProcess[OutputVar].update({'name':WfProcess['o']['internal']['properties']['title']})
                WfProcess[OutputVar].update(WfProcess['p'])
                WfProcess[OutputVar].update({'RetVal': RunCmd['RetVal'], 'start_date': str(RunCmd['start_date']), 'end_date': str(RunCmd['end_date'])})
                response[procID].update(WfProcess[OutputVar])
            except Exception as err:
                print('@on_execWorkflowProcess.node_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            if (DEBUG): pprint(('node_script['+procID+']: SetVar:'+oType+'.'+InputVar+':='+WfProcess['parents'][_Idx]['o']['type']+'.'+parentOutputVar + ' '+ OutputVar + ' := '+ InputVar + ' vals:', OutputVals, ' lop['+parentOperID+']:' + _pflink['fromOperator'] + '==' +WfProcess['parents'][0]['id']))

        else:
            print('@on_execWorkflowProcess['+procID+']: Error: Undefined Workflow Process')
    
    data['end_date'] = datetime.datetime.now(TZ).isoformat()
    
    logUsr = ''
    if (isinstance(session_data['user'], User)): logUsr = '@web:' + session_data['user'].username
    else:                                        logUsr = '@shell:' + session_data['user']['username']

    dblog.write({'usr': logUsr,'name': data['name'], 'level': logging.INFO, 'msg': json.dumps(response), 'start_date': data['start_date'], 'end_date': data['end_date']})
    if (DEBUG): pprint(('@core.execWorkflowProcess: ', {'data': data, 'response': response, 'session_data': session_data}))

def on_getDefaultConfig(data, response, session_data):
    response['raw']=open('templates/new_config.json').read()
    response['json']=json.loads(response['raw'])

def on_deleteProject(data, response, session_data):
    if (DEBUG): print('@core.deleteProject: rmdir+file:', data['path'])
    os.remove(data['path'])
    os.rmdir(os.path.dirname(data['path']))

def on_saveNewProject(data, response, session_data):
    cfgPATH = os.path.dirname(data['cfg']['path'])
    if (DEBUG): print('@core.saveNewProject: data.cfg.path:',os.getcwd(), cfgPATH)
    #os.makedirs(os.getcwd() + "\\" + cfgPATH)
    if (not os.path.isdir(cfgPATH)):
        os.makedirs(cfgPATH)
    with open(data['cfg']['path'], 'w', encoding='utf-8', newline='') as f:
        f.write( json.dumps( data['cfg'] ))

def ex_perl ():
    if (os.name == 'nt'): return config.PERL_EXEC;
    else: return config.PERL_BIN;
def ex_python ():
    if (os.name == 'nt'): return config.PYTHON_EXEC;
    else: return config.PYTHON_BIN;
def ex_tcl ():
    if (os.name == 'nt'): return config.TCL_EXEC;
    else: return config.TCL_BIN;
def ex_expect ():
    if (os.name == 'nt'): return config.EXPECT_EXEC;
    else: return config.EXPECT_BIN;
def ex_node ():
    if (os.name == 'nt'): return config.NODE_EXEC;
    else: return config.NODE_BIN;
def ex_npm ():
    if (os.name == 'nt'): return config.NPM_EXEC;
    else: return config.NPM_BIN;

# UltideVARS functions START

def uri_escape(val):
    try: return parse.quote(val, safe='', encoding='utf-8')
    except: return val
def uri_unescape(val):
    try: return parse.unquote(val, encoding='utf-8')
    except: return val

def UltideInitVARS(_arg = None):
    try:
        if (_arg == None): _arg = sys.argv[1]
    except: None
    if (type(_arg) is str):
        _readVARS( processOUTPUT(_arg) )

def processOUTPUT(_arg = None):
    global RAWOUTPUT, OUTPUT
    try:
        if (_arg == None): _arg = sys.argv[1]
    except: None
    if (type(_arg) is str):
        RAWOUTPUT = decodeZlibString(_arg)
        OUTPUT = json.loads(RAWOUTPUT)
        setVAR ( '__OUTPUT__', OUTPUT)
        setVAR ( '__RAWOUTPUT__', RAWOUTPUT)
        return OUTPUT

def unescapeOnce(val):
    if (val) :
        if (uri_unescape(val) == val): return val;                # key is not escaped. return!
        else                         : return uri_unescape(val);  # key is escaped. return unescaped!

def escapeOnce(val):
    if (val) :
        if (uri_unescape(val) == val): return uri_escape(val);   # key is not escaped. escape!
        else                         : return val;               # escape not needed!

def explodeVARS(val):
    uflog.log(logging.INFO, "@explodeVARS:" + str(val))
    if (re.match(r"^base64:", val)):
        val = re.sub('^base64:', '', val)
        try:
            val1 = str(base64.b64decode(val).decode("utf-8"))
            val = val1
        except:
            uflog.log(logging.INFO, "@explodeVARS: base64.b64decode failed! " + str(val))
            None
        try:
            val1 = pystacheRender(val)
            val = val1
            for k1 in val:
                try:
                    v1 = explodeVARS(val[k1])
                    val[k1] = v1
                except:
                    v1 = val[k1]
                setVAR(k1,v1)
        except:
            uflog.log(logging.INFO, "@explodeVARS: base64.pystacheRender failed!")
            try:
                val1 = json.loads(val)
                val = val1
                for k1 in val:
                    try:
                        v1 = explodeVARS(val[k1])
                        val[k1] = v1
                    except:
                        v1 = val[k1]
                    setVAR(k1,v1)
            except:
                uflog.log(logging.INFO, "@explodeVARS: base64.json.loads failed!")

    if (re.match(r"^json", val)):
        val = re.sub('^json:', '', val)
        try:
            val1 = pystacheRender(val)
            val = val1
            for k1 in val:
                try:
                    v1 = explodeVARS(val[k1])
                    val[k1] = v1
                except:
                    v1 = val[k1]
                setVAR(k1,v1)
        except:
            uflog.log(logging.INFO, "@explodeVARS: json0.pystacheRender failed!")
            try:
                val1 = json.loads(val)
                val = val1
                for k1 in val:
                    try:
                        v1 = explodeVARS(val[k1])
                        val[k1] = v1
                    except:
                        v1 = val[k1]
                    setVAR(k1,v1)
            except:
                uflog.log(logging.INFO, "@explodeVARS: json0.loads failed!")
                None

    if (re.match(r"^\{", val)):
        try:
            val1 = pystacheRender(val)
            val = val1
            for k1 in val:
                try:
                    v1 = explodeVARS(val[k1])
                    val[k1] = v1
                except:
                    v1 = val[k1]
                setVAR(k1,v1)
        except:
            uflog.log(logging.INFO, "@explodeVARS: json1.pystacheRender failed!")
            try:
                val1 = json.loads(val)
                val = val1
                for k1 in val:
                    try:
                        v1 = explodeVARS(val[k1])
                        val[k1] = v1
                    except:
                        v1 = val[k1]
                    setVAR(k1,v1)
            except:
                uflog.log(logging.INFO, "@explodeVARS: json1.loads failed!")
                None

    return val

def getVAR(key, dont_escape=False):
    global VARS
    val = ''
    if (key):
        try:  
            if (VARS[VARS['uuid']][key])            : val = VARS[VARS['uuid']][key]
        except: None
        try:  
            if (VARS[VARS['uuid']][uri_escape(key)]): val = VARS[VARS['uuid']][uri_escape(key)] 
        except: None
        try: 
            if (val=='' and VARS[VARS['uuid']]['root.'+key]): val = VARS[VARS['uuid']]['root.'+key]
        except: None
        try: 
            if (val=='' and VARS[VARS['uuid']]['root.'+uri_escape(key)]): val = VARS[VARS['uuid']]['root.'+uri_escape(key)] 
        except: None
    return unescapeOnce(val) if dont_escape else val

def setVAR(key, val):
    global VARS
    if (DEBUG): uflog.log(logging.INFO, "@setVAR: key:" + str(key) + " val:" + str(val))
    if (key):
        _retObj = {}
        _retKey = {}
        _retKey = escapeOnce(key)
        _retObj = VARS[VARS['uuid']][_retKey] = val; # we could simply: unescapeOnce($val)
        return ( _retObj, _retKey )

def readVARS(obj = None,root = ''):
    global OUTPUT
    if (obj == None): obj = OUTPUT
    if (type(obj) in [str, dict]): _readVARS(obj,root)

def _sub_readVARS(k,v):
    global VARS
    if ( type(v) is dict ):
            for k1 in v:
                v1 = v[k1]
                if ( type(v1) is dict ):
                    if (k1 != 'name'):
                        if ( type(v1) is str and re.match(r"^\{", v1) ):
                            try:
                                (_obj, _objNm) = setVAR( escapeOnce(v1['name']) , json.dumps(v1))
                                _readVARS(_obj, _objNm)
                            except: None
                        else:
                            try:
                                (_obj, _objNm) = setVAR( escapeOnce(v1['name']) , v1)
                                _readVARS(_obj, _objNm)
                            except: None
            if (k != 'name'):
                if ( type(v) is str and re.match(r"^\{", v) ):
                    try:
                        (_obj, _objNm) = setVAR( escapeOnce(v['name']) , json.dumps(v))
                        _readVARS(_obj, _objNm)
                        setVAR( '_parent_', escapeOnce(v['name']) )
                    except: None
                else:
                    try:
                        (_obj, _objNm) = setVAR( escapeOnce(v['name']) , v)
                        _readVARS(_obj, _objNm)
                        setVAR( '_parent_', escapeOnce(v['name']) )
                    except: None
                #_readVARS(v, k);
    return not type(v) is dict

def _readVARS(obj, root = None, depth = None):
    if (obj == None): return ''
    if (root == None): root = ''
    if (depth == None): depth = -1
    depth += 1

    for k in obj:
        v = obj[k]
        try: 
            if ( type(v) is str and re.match(r"^\{\'", v) ): v = re.sub(r'\'', '"', v)
        except: None

        #print("\n\nreadVARS [depth:"+ str(depth) +"]: "+ root +"."+ k +" "+ str(type(v)) +"->>", pformat((v, k)), ' <<-' )

        if ( _sub_readVARS(k,v) ):
            if (k != 'name'):
                #if (root != ''): setVAR( root+'.'+escapeOnce(k), v )
                #else           : setVAR(  'root.'+escapeOnce(k), v )

                if ( type(v) is str and re.match(r"^\{", str(v)) ):
                    try:
                        if (depth==0):
                            (_obj, _objNm) = setVAR( root + ('' if (root != '') else 'root')                  , json.loads(v))
                            _readVARS(_obj, _objNm, depth)
                        (_obj, _objNm) = setVAR( root + ('.' if (root != '') else 'root.') + escapeOnce(k) , json.loads(v))
                        _readVARS(_obj, _objNm, depth)
                        #_readVARS(json.loads(v), k);
                    except: None
                else:
                    try:
                        if (k != 'start_date' and k != 'end_date' and k != 'RetVal'):
                            (_obj, _objNm) = setVAR( root + ('.' if (root != '') else 'root.') + escapeOnce(k) , v)
                            _readVARS(_obj, _objNm, depth)
                        #_readVARS(v, k);
                    except: None
                
                if (k != 'start_date' and k != 'end_date' and k != 'RetVal'):
                    setVAR(escapeOnce(k) , v) # save all sub-vars as globals

                try:
                    v = json.loads(v)
                    _sub_readVARS(k,v)
                except: None
        else:
            if (not re.match(r"^output", str(k)) and not re.match(r"^input", str(k)) and not re.match(r"^RetVal", str(k))):
                _readVARS(v, root + ('.' if (root != '') else 'root.') + escapeOnce(k) , depth)
            else:
                _readVARS(v, root + ('' if (root != '') else 'root') , depth)

    if (root == ''): setVAR( 'root', obj )
