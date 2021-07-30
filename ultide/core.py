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

PKG = json.loads(open('package.json').read())
DEBUG = config.DEBUG
sessions_data = {}

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
            is_admin             = user.is_admin
        )
    
    #pprint(('@core.on_login: OUT:session_data:', mod_2_dict(session_data['user'])))
    response['connected'] = connected

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
        create_dt    = current_user.confirmed_at.isoformat(),
        group        = current_user.group,
        avatar       = current_user.avatar,
        is_active    = current_user.is_active,
        is_auth      = current_user.is_authenticated,
        is_admin     = current_user.is_admin
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
