import datetime
import ultide.config as config
from ultide.models import User
import json
import sys
import os
import os.path
import imp
from flask_login import current_user
from pprint import pprint
import inspect
import pystache
import subprocess
import lzstring
import zlib
import base64
import re
import pytz

PKG = json.loads(open(os.path.abspath(os.path.join(os.path.dirname(__file__), '..\\package.json'))).read())
DEBUG = config.DEBUG
sessions_data = {}

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
    user = current_user
    userData = json.loads(data['user'])
    response['res'] = False
    response['usr_exists'] = False
    HasDiff = False
    if ( not str(user.username) == str(userData['username']) and user.user_exists(userData['username']) ):
        # New Username, but allready exists
        response['usr_exists'] = True
        pprint(('@on_change_user_settings: Error: User Allready Exists!', { 'data':data, 'response':response, 'session_data': session_data, 'userData': userData, 'HasDiff': HasDiff }))
    else:
        if ( not str(user.username) == str(userData['username'])): HasDiff = True
        if ( not str(user.first_name) == str(userData['first_name'])): HasDiff = True
        if ( not str(user.last_name) == str(userData['last_name'])): HasDiff = True
        if ( not str(user.email) == str(userData['email'])): HasDiff = True
        if userData.__contains__('group'): 
            if ( not str(user.group) == str(userData['group'])): HasDiff = True
        if ( not str(user.avatar) == str(userData['avatar'])): HasDiff = True

        pprint(('@on_change_user_settings:', { 'data':data, 'response':response, 'session_data': session_data, 'userData': userData, 'HasDiff': HasDiff }))

        if (HasDiff == True):
            try:
                user.username = userData['username']
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
                pprint(('Error:',response['error'], ret))
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
            pprint(('Error:',response['error'], ret))

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
        with open(file_path, 'w') as outfile:
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
    return _dtstr.format(now.year, now.month, now.day, now.hour, now.minute, now.second)

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
            #if (str(iStr) == 'config'): pprint(' --- i0 := ' +str(options['depth'])+' : '+options['tree']+'.'+iStr+'('+className+'%'+str(type(Modobj[i]))+')');sys.stdout.flush();

            if (options['depth'] == 0): options['tree']=options['parent']+'.'+iStr+'('+className+')'

            #pprint(('mod_2_dict1 := ', Modobj, options, '£:'+options['tree']+'.'+iStr))
            #pprint('mod_2_dict1 := £:'+str(options['depth'])+' : '+options['tree']+'.'+iStr+'('+className+'%'+str(type(Modobj[i]))+')');sys.stdout.flush();

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
    ExposeVars = {'debug':(bool(DEBUG)), 'pkg':{'ProductName':PKG['ProductName']} }     #SECURITY: carefull injecting vars into index.html template here!
    Script  =   '<script>'
    Script  +=      'window.$app=' + json.dumps(ExposeVars) + ';'
    Script  +=      "const uaData=(typeof(navigator.userAgentData)!=='undefined')?(navigator.userAgentData):{userAgent:navigator.userAgent};uaData.highEntropyValues={};(async ()=>{if (uaData.getHighEntropyValues) uaData.highEntropyValues=await uaData.getHighEntropyValues(['brands','mobile','platform','architecture','bitness','platform bitness','user agent','model','platformVersion','uaFullVersion']);})();"
    Script  +=      'document.getElementsByTagName("base")[0].nextElementSibling.remove();'  #SECURITY: Magic!
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
    workspace = session_data['user'].get_property('workspace')
    print( ('@on_perl_CodeRun: data:', data, 'session_data:', session_data, 'response:', response, 'workspace:', ) )

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
        perl_code = pystache.render(perl_code, vars(config)); ## Apply Mustache {{}} from config variables

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
        with open(temp_script_path, 'w') as f:
            f.write( perl_code )
        # close the file descriptor
        os.close(fd)

        print('@on_perl_CodeRun: script', temp_script_path)

        #cmd = [ perlExe, '-e ' + perlobj['perl_init'].replace("\n","") ]
        cmd = [ perlExe, temp_script_path ]

        if ( hasattr(config, "PERL_EXEC") and config.PERL_EXEC !='' ):
            cmd = [ config.PERL_EXEC, temp_script_path ]
    else:
        pprint(('@on_perl_CodeRun: RunScript:',data))
        cmd = [ perlExe , data['script']['perl_script_file'], data['parm']]

    print('@on_perl_CodeRun: cmd:',cmd)
    ret = ''
    try:
        ret = subprocess.check_output(cmd, stderr=subprocess.STDOUT, shell=True, encoding='UTF-8')
        print ('@on_perl_CodeRun: RetVal:', ret)
    except Exception as err:
        import traceback
        exc_info = sys.exc_info()
        #ret = dict( traceback = json.dumps(traceback.format_exception(*exc_info)), Exception = json.dumps(exception_as_dict(err),indent=2) ) # as JSON
        ret = dict( traceback=traceback.format_exception(*exc_info), Exception=exception_as_dict(err) , error='true') # pure objects
        print('@on_perl_CodeRun: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
    
    if ( perlopts.__contains__('del_script') and perlopts['del_script'] == 1 ):
        os.remove(temp_script_path) # delete temp file

    response['RetVal'] = ret

def on_python_CodeRun(data, response, session_data):
    workspace = session_data['user'].get_property('workspace')
    print( ('@on_python_CodeRun: data:', data, 'session_data:', session_data, 'response:', response, 'workspace:', ) )

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
        python_code = pystache.render(python_code, vars(config)); ## Apply Mustache {{}} from config variables

        from tempfile import mkstemp
        fd, temp_script_path = mkstemp(dir=scripts_dir, prefix= datetime.datetime.today().strftime('%Y%m%d%H%M%S') + "-python_script", suffix = '.py')
        # use a context manager to open the file at that path and close it again
        with open(temp_script_path, 'w') as f:
            f.write( python_code )
        # close the file descriptor
        os.close(fd)

        print('@on_python_CodeRun: script', temp_script_path)

        cmd = [ pythonExe, temp_script_path ]

        if ( hasattr(config, "PYTHON_EXEC") and config.PYTHON_EXEC != '' ):
            cmd = [ config.PYTHON_EXEC, temp_script_path ]

        print ('@on_python_CodeRun: cmd:',cmd)
    else:
        pprint(('@on_python_CodeRun: RunScript:',data))
        cmd = [ pythonExe , data['script']['python_script_file'], data['parm']]
        
    ret = ''
    try:
        ret = subprocess.check_output(cmd, stderr=subprocess.STDOUT, shell=True, encoding='UTF-8')
        print ('@on_python_CodeRun: RetVal:', ret)
    except Exception as err:
        import traceback
        exc_info = sys.exc_info()
        #ret = dict( traceback = json.dumps(traceback.format_exception(*exc_info)), Exception = json.dumps(exception_as_dict(err),indent=2) ) # as JSON
        ret = dict( traceback=traceback.format_exception(*exc_info), Exception=exception_as_dict(err) , error='true') # pure objects
        print('@on_python_CodeRun: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
    
    if ( pythonopts.__contains__('del_script') and pythonopts['del_script'] == 1 ):
        os.remove(temp_script_path) # delete temp file

    response['RetVal'] = ret

def on_execWorkflowProcess(data, response, session_data):
    x = lzstring.LZString()
    finalProcessList = {}
    finalProcessList = json.loads(x.decompressFromBase64(data['lz']))
    WfProcessList = {}

    procIDs = []
    for jsonWfProcess in finalProcessList:
        WfProcess = WfProcessList[WfProcess['id']] = json.loads(jsonWfProcess)
        procIDs.append(WfProcess['id']) # Honor ProcessID Original Array sequence

    for procID in procIDs:
        WfProcess = WfProcessList[procID]
        #pprint(('WfProcess:', type(WfProcess), WfProcess, dir(WfProcess)))
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
                        except Exception as err:
                            print('@on_execWorkflowProcess.load_file['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
                    
                    print('load_file: SetVar: WfProcessList['+procID+'].'+OutputVar+' := ' +WfProcessList[procID][OutputVar])

                f.close()
            else:
                print('load_file['+procID+']: File Not Found: \'' + WfProcess['p']['filepath']+'\'')

        elif re.match(r".*::save_file", oType):

            if (WfProcess['p']['filepath'] != ''):
                with open(WfProcess['p']['filepath'], 'w') as f:
                    for (_Idx, _pflink) in enumerate(WfProcess['fl']):  # Link is Array := List
                        InputVar = _pflink['toConnector']
                        parentOutputVar = _pflink['fromConnector']
                        #print('save_file: SetVar:'+oType+'.'+InputVar+':='+parentOutputVar)
                        WfProcess[InputVar] = ''
                        try:
                            parentOperID = WfProcess['fl'][0]['fromOperator']
                            OutputVal = str(WfProcessList[parentOperID][parentOutputVar])
                            WfProcess[InputVar] = OutputVal
                            f.write( WfProcess[InputVar] )

                        except Exception as err:
                            print('@on_execWorkflowProcess.save_file['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception
                        
                        print('save_file: SetVar: WfProcessList['+procID+'].'+InputVar+' := ' +WfProcessList[procID][InputVar])
                f.close()
            else:
                print('save_file['+procID+']: File Not Found: \'' + WfProcess['p']['filepath']+'\'')

        elif re.match(r".*::multiple_inputs_outputs", oType):
            #pprint(('@on_execWorkflowProcess.multiple_inputs_outputs['+procID+']: Init:',dict(fromLinks = WfProcess['tl'])))
            OutputVals = {}
            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                parentOperID = ''
                for (_pIdx, _ppflink) in enumerate(WfProcess['tl']):
                    try:
                        #pprint(('@on_execWorkflowProcess.multiple_inputs_outputs['+procID+']: Init:',dict( InputVar = InputVar, parentOutputVar = parentOutputVar, fromLinksParents = _pflink['fromOperator'], parentID= WfProcess['parents'][_pIdx]['id'])))
                        if (_pflink['fromOperator'] == WfProcess['parents'][_pIdx]['id']):
                            OutputVar = WfProcess['tl'][_pIdx]['fromConnector']
                            OutputVals[OutputVar] = ''
                            parentOperID = WfProcess['fl'][_pIdx]['fromOperator']

                            OutputVals[OutputVar] = str(WfProcessList[parentOperID][parentOutputVar])
                            #pprint(('@on_execWorkflowProcess.multiple_inputs_outputs['+procID+']: In:',dict(OutputVar=OutputVar, parentOutputVar=parentOutputVar, parentOperID=parentOperID, var=OutputVals[OutputVar])))
                    except Exception as err:
                        pprint(('@on_execWorkflowProcess.multiple_inputs_outputs['+procID+']: Error.In:', err, dict(_pflink= _pflink, fromLink= WfProcess['tl'], OutputVar=OutputVar, parentOutputVar=parentOutputVar ))) # To print out the exception message , print out the stdout messages up to the exception

            # Repeat Cycle to json both inputVars to outputVars
            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                parentOperID = ''
                for (_pIdx, _ppflink) in enumerate(WfProcess['tl']):
                    try:
                        if (_pflink['fromOperator'] == WfProcess['parents'][_pIdx]['id']):
                            OutputVar = WfProcess['tl'][_pIdx]['fromConnector']
                            WfProcess[OutputVar] = ''
                            parentOperID = WfProcess['fl'][_pIdx]['fromOperator']

                            WfProcess[OutputVar] = json.dumps(OutputVals) # json (join all data)
                        pprint(('@on_execWorkflowProcess.multiple_inputs_outputs['+procID+']: Out:',dict(OutputVar=OutputVar, OutputVals=OutputVals, parentOperID=parentOperID, var=WfProcess[OutputVar])))

                    except Exception as err:
                        pprint(('@on_execWorkflowProcess.multiple_inputs_outputs['+procID+']: Error.Out:', err, dict(_pflink= _pflink, toLink= WfProcess['fl'], OutputVar=OutputVar, parentOutputVar=parentOutputVar ))) # To print out the exception message , print out the stdout messages up to the exception

                try:
                    if (len(WfProcess['fl'])==2):
                        print('multiple_inputs_outputs: SetVar:'+oType+'.'+InputVar+':='+WfProcess['parents'][_Idx]['o']['type']+'.'+parentOutputVar + ' '+ OutputVar + ' := '+ InputVar + ' val:'+ json.dumps(OutputVals) + ' lop['+parentOperID+']:' + _pflink['fromOperator'] + '==' +str(WfProcess['parents'][0]['id'])+','+str(WfProcess['parents'][1]['id']))
                    else:
                        print('multiple_inputs_outputs: SetVar:'+oType+'.'+InputVar+':='+WfProcess['parents'][_Idx]['o']['type']+'.'+parentOutputVar + ' '+ OutputVar + ' := '+ InputVar + ' val:'+ json.dumps(OutputVals) + ' lop['+parentOperID+']:' + _pflink['fromOperator'] + '==' +str(WfProcess['parents'][0]['id']))

                    print('multiple_inputs_outputs: SetVar: WfProcessList['+procID+'].'+OutputVar+' := ' +WfProcessList[procID][OutputVar])
                except Exception as err:
                    pprint(('@on_execWorkflowProcess.multiple_inputs_outputs['+procID+']: Error:', err, dict(toLink= WfProcess['fl']) )) # To print out the exception message , print out the stdout messages up to the exception
                                    
        elif re.match(r".*::all_fields", oType):

            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                OutputVals = ''
                parentOperID = ''
                try:
                    if (_pflink['fromOperator'] == WfProcess['parents'][0]['id']):
                        OutputVar = WfProcess['tl'][0]['fromConnector']
                        WfProcess[OutputVar] = {}
                        WfProcess[OutputVar].update(WfProcess['p'])
                        parentOperID = WfProcess['fl'][0]['fromOperator']
                        OutputVals = str(WfProcessList[parentOperID][parentOutputVar])

                    WfProcess[OutputVar].update({OutputVar:OutputVals})

                except Exception as err:
                    print('@on_execWorkflowProcess.all_fields['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

                pprint(('all_fields['+procID+']: SetVar:'+oType+'.'+InputVar+':='+WfProcess['parents'][_Idx]['o']['type']+'.'+parentOutputVar + ' '+ OutputVar + ' := '+ InputVar + ' vals:', OutputVals , ' lop['+parentOperID+']:' + _pflink['fromOperator'] + '==' +WfProcess['parents'][0]['id']))

        elif re.match(r".*::perl_init", oType):
            for (_Idx, _pflink) in enumerate(WfProcess['tl']): # Link is Array := List
                InputVar = _pflink['fromConnector']
                #WfProcess[InputVar] = 'Teste123'
                #_data = {}
                #_data['cmd'] = json.dumps(WfProcess['p']) # Perl Parameters to JSON
                RunCmd = {}
                RunCmd['cmd'] = WfProcess['p']
                on_perl_CodeRun( RunCmd, response, session_data)
                #WfProcess[InputVar] = ''
                #try: WfProcess[InputVar] = response['RetVal']
                try:
                    WfProcess[InputVar] = {}
                    WfProcess[InputVar].update(WfProcess['p'])
                    WfProcess[InputVar].update({'RetVal':response['RetVal']})
                except Exception as err:
                    print('@on_execWorkflowProcess.perl_init['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

                pprint(('perl_init['+procID+']: SetVar: WfProcessList['+procID+'].'+InputVar+' := ' , WfProcessList[procID][InputVar]))

        elif re.match(r".*::python_init", oType):
            for (_Idx, _pflink) in enumerate(WfProcess['tl']): # Link is Array := List
                InputVar = _pflink['fromConnector']
                #WfProcess[InputVar] = 'Teste123'
                #_data = {}
                #_data['cmd'] = json.dumps(WfProcess['p']) # Python Parameters to JSON
                RunCmd = {}
                RunCmd['cmd'] = WfProcess['p']
                on_python_CodeRun( RunCmd, response, session_data)
                
                #WfProcess[InputVar] = ''
                #try: WfProcess[InputVar] = response['RetVal']
                try:
                    WfProcess[InputVar] = {}
                    WfProcess[InputVar].update(WfProcess['p'])
                    WfProcess[InputVar].update({'RetVal':response['RetVal']})
                except Exception as err:
                    print('@on_execWorkflowProcess.python_init['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

                pprint(('python_init['+procID+']: SetVar: WfProcessList['+procID+'].'+InputVar+' := ' , WfProcessList[procID][InputVar]))

        elif re.match(r".*::perl_script", oType):

            OutputVals = {}
            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                OutputVal = ''
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

            pprint(('perl_script['+procID+']: Parameter:', str(json.dumps(OutputVals))))
            RunCmd = {}
            RunCmd['script'] = WfProcess['p']
            RunCmd['parm'] = encodeZlibString( json.dumps(OutputVals) )
            on_perl_CodeRun( RunCmd, response, session_data)

            try:                                
                #WfProcess[OutputVar] = response['RetVal']
                WfProcess[OutputVar] = {}
                WfProcess[OutputVar].update(WfProcess['p'])
                WfProcess[OutputVar].update({'RetVal':response['RetVal']})
            except Exception as err:
                    print('@on_execWorkflowProcess.perl_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            pprint(('perl_script['+procID+']: SetVar:'+oType+'.'+InputVar+':='+WfProcess['parents'][_Idx]['o']['type']+'.'+parentOutputVar + ' ', OutputVar , ' := '+ InputVar + ' val:'+ OutputVal+ ' lop['+parentOperID+']:' + _pflink['fromOperator'] + '==' +WfProcess['parents'][0]['id']))

        elif re.match(r".*::python_script", oType):

            OutputVals = {}
            for (_Idx, _pflink) in enumerate(WfProcess['fl']): # Link is Array := List
                InputVar = _pflink['toConnector']
                parentOutputVar = _pflink['fromConnector']
                OutputVal = ''
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

            pprint(('python_script['+procID+']: Parameter:', str(json.dumps(OutputVals))))
            RunCmd = {}
            RunCmd['script'] = WfProcess['p']
            RunCmd['parm'] = encodeZlibString( json.dumps(OutputVals) )
            on_python_CodeRun( RunCmd, response, session_data)

            try:
                #WfProcess[OutputVar] = response['RetVal']
                WfProcess[OutputVar] = {}
                WfProcess[OutputVar].update(WfProcess['p'])
                WfProcess[OutputVar].update({'RetVal':response['RetVal']})
            except Exception as err:
                    print('@on_execWorkflowProcess.python_script['+procID+']: Error:', err ) # To print out the exception message , print out the stdout messages up to the exception

            pprint(('python_script['+procID+']: SetVar:'+oType+'.'+InputVar+':='+WfProcess['parents'][_Idx]['o']['type']+'.'+parentOutputVar + ' '+ OutputVar + ' := '+ InputVar + ' vals:', OutputVal, ' lop['+parentOperID+']:' + _pflink['fromOperator'] + '==' +WfProcess['parents'][0]['id']))

        else:
            print('@on_execWorkflowProcess['+procID+']: Error: Undefined Workflow Process')

def on_getDefaultConfig(data, response, session_data):
    response['raw']=open('templates/new_config.json').read()
    response['json']=json.loads(response['raw'])

def on_deleteProject(data, response, session_data):
    print('@main: deleteProject: rmdir+file:', data['path'])
    os.remove(data['path'])
    os.rmdir(os.path.dirname(data['path']))

def on_saveNewProject(data, response, session_data):
    cfgPATH = os.path.dirname(data['cfg']['path'])
    print('@main: saveNewProject: data.cfg.path:',os.getcwd(), cfgPATH)
    #os.makedirs(os.getcwd() + "\\" + cfgPATH)
    if (not os.path.isdir(cfgPATH)):
        os.makedirs(cfgPATH)
    with open(data['cfg']['path'], 'w') as f:
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
