import os
import json
import sys
import platform
from ultide.models import db, DevLang, Library
from pprint import pprint

def get_workspace(session_data):
    #pprint (('@get_workspace: user:', core.mod_2_dict(session_data['user']) ))
    workspace = session_data['user'].get_property('workspace')
    #pprint (('@get_workspace: workspace:', workspace ))
    if (workspace is None):
        workspace = db.app.config['PRJ']['WORKSPACE_DIR'] + os.path.sep + str(session_data['user'].id)
        session_data['user'].set_property('workspace', workspace)
    return workspace

def prep_config(session_data, config, config_path, oper_path, oper_name, proj_name):
    if (not hasattr(config, "path") or len(config['path'])<1) :
        config['path'] = config_path
    if (not hasattr(config, "fs")   or len(config['fs']  )<1) :
        config['fs']   = dict(
            workspace_dir   = db.app.config['PRJ']['WORKSPACE_DIR'],
            operators_dir   = db.app.config['PRJ']['OPERATORS_DIR'],
            config_file     = db.app.config['PRJ']['CONFIG_FILE'],
            work_dir        = session_data['user'].get_property('workspace'),
            oper_path       = oper_path,
            oper_name       = oper_name,
            user_id         = session_data['user'].id,
            proj_name       = proj_name 
        )

def get_operators_infos(path, proj_name, session_data):
    items = os.listdir(path)
    #pprint(('@lib/ultiflow/main: get_operators_infos:',path, items))
    operators_tree = {}
    operators_list = {}
    for item in items:
        #pprint(('@lib/ultiflow/main: get_operators_infos:', item, path, proj_name))
        item_path = path + os.path.sep + item
        if (os.path.isdir(item_path)):
            config_path = item_path + os.path.sep + db.app.config['PRJ']['CONFIG_FILE'] #'config.json'
            if (os.path.isfile(config_path)):
                config = None
                try:
                    with open(config_path, 'r') as f:
                        config = json.load(f)
                        prep_config(session_data, config, config_path, path, item, proj_name)
                        operator_id = config['id']
                        operators_tree[operator_id] = True
                        operators_list[operator_id] = config
                        #print( ('@lib/ultiflow/main: json:', f, config) )
                except:
                    pass # todo
            else:
                inside_operators_tree, inside_operators_list = get_operators_infos(item_path, proj_name, session_data)
                operators_tree[item] = inside_operators_tree
                operators_list.update(inside_operators_list)
    return operators_tree, operators_list

def update_operators_infos(directory, proj_name, operators_path, operators_list, operators_tree, session_data):
    print('@lib/ultiflow/main: update_operators_infos:', directory, proj_name, operators_path)
    if (os.path.isdir(operators_path)):
        module_operators_tree, module_operators_list = get_operators_infos(operators_path, proj_name, session_data)
        operators_list.update(module_operators_list)
        operators_tree[directory][proj_name] = module_operators_tree

    hasNewItems = False
    # SQLAlchemy Get Operators from DB: Library
    # SQLite ex: INSERT INTO "library" VALUES(1,1,'Perl: Procs','perl_init1','{"id":"perl_procs::perl_init1","title":"Perl: Init 1","type":"operator","inputs":{},"outputs":{"data":{"label":"Start"}},"parameters":[{"id":"perl_incdirs","label":"Include Directories (@INC):","type":"ultiflow::list","config":{"fieldType":"ultiflow::text","fieldTypeConfig":{"default":""}}},{"id":"perl_add_use","label":"Include pod (use <module>;):","type":"ultiflow::list","config":{"fieldType":"ultiflow::text","fieldTypeConfig":{"default":""}}},{"id":"perl_init","label":"Perl Code:","type":"ultiflow::textarea","config":{"attr":{"rows":10},"css":{"font-size":"11px","white-space":"nowrap","width":"100%","font-family":"monospace"},"default":"#!/usr/bin/perl\n\nuse warnings;\nuse strict ''vars'';\nuse Data::Dumper;\nuse Encode qw(decode encode is_utf8);\nuse Getopt::Long;\nuse IO::Handle;\nuse LWP::UserAgent;\nuse Time::Piece;\nuse URI::Escape;\nuse utf8;\n"}}]}');
    ALLdbLibs = Library.query.filter(Library.lib_name==proj_name).all()
    #pprint(('@lib/ultiflow/main: Library filter('+proj_name+'):', ALLdbLibs));
    for row in ALLdbLibs:
        hasNewItems = True
        #print ("ID:", row.id, "User:", row.uid, "Name: ",row.lib_name, "Oper:",row.lib_oper, "Code:",row.lib_code)
        config = json.loads(row.lib_code)
        db_operators_tree = {}
        db_operators_list = {}
        item = row.lib_oper
        item_path = '@db:Library'
        config_path = item_path + ':' + str(row.id)
        prep_config(session_data, config, config_path, directory, item, proj_name)
        operator_id = config['id']
        db_operators_tree[operator_id] = True
        db_operators_list[operator_id] = config
        operators_list.update(db_operators_list)
        operators_tree[directory][proj_name].update(db_operators_tree)

    if (hasNewItems):
        # Sort dict by Name
        temp_list = operators_list
        temp_tree = operators_tree[directory][proj_name]
        operators_list                       = dict(sorted(temp_list.items(), key=lambda x: x[0]))
        operators_tree[directory][proj_name] = dict(sorted(temp_tree.items(), key=lambda x: x[0]))

def on_modules_infos(data, response, session_data):
    operators_list = {}
    #response['session_data'] = core.mod_2_dict(session_data,{'include': ['main'],'obj': 'session_data'}) #SECURITY: oops carefull ! session_data contains password. remember: we can exclude 'password' prop from dict.
    #response['session_data']['DBapp'] = core.mod_2_dict(db,{'include': ['app','config'],'obj': 'db.app'})
    workspace = get_workspace(session_data)
    operators_tree = {'library': {}, 'workspace': {}}
    #pprint('@lib/ultiflow/main: on_modules_infos: session_data:' + str(session_data['user'].id));
    #pprint(('session_data:',session_data));
    #pprint(('workspace:',workspace));
    #pprint(('db:',db.app.config));
    #sys.stdout.flush();
    for module_name in session_data['modules_infos']:
        module_infos = session_data['modules_infos'][module_name]
        if 'config' in module_infos:
            #print('@lib/ultiflow/main: on_modules_infos['+module_name+']:');pprint((module_infos));
            #print("\n"+'@lib/ultiflow/main: on_modules_infos['+module_name+'][main]:');pprint((vars(module_infos['main'])));
            #print("\n"+'@lib/ultiflow/main: on_modules_infos['+module_name+'][config]:');pprint((vars(module_infos['config'])));
            #print("\n")
            proj_name = module_infos['config'].name
            operators_path = module_infos['path'] + os.path.sep + db.app.config['PRJ']['OPERATORS_DIR']
            update_operators_infos('library', proj_name, operators_path, operators_list, operators_tree, session_data)

    if (not os.path.isdir(workspace)):
        oper_path = workspace + os.path.sep + db.app.config['PRJ']['PROJECT_DIR'] + os.path.sep + db.app.config['PRJ']['OPERATORS_DIR']
        NewPRJ_DIR = oper_path + os.path.sep + db.app.config['PRJ']['OPERATOR_DIR']
        config_path = NewPRJ_DIR + os.path.sep + db.app.config['PRJ']['CONFIG_FILE']
        print('@lib/ultiflow/main: on_modules_infos: path not found:' + workspace + ' Creating new Workspace!!! :' + config_path)
        #copyfile('./templates/new_config.json', NewPRJ_DIR + os.path.sep + CONFIG_FILE)
        with open('./templates/new_config.json', 'r') as f:
            config = json.load(f)
            oper_name       = db.app.config['PRJ']['OPERATOR_DIR']
            config['id']    = db.app.config['PRJ']['DEFAULT_PRJID']
            config['title'] = db.app.config['PRJ']['DEFAULT_TITLE']
            prep_config(session_data, config, config_path, oper_path, oper_name, proj_name)
            on_saveNewProject(dict(cfg=config), None, None)

    for dir_name in os.listdir(workspace):
        #print('@lib/ultiflow/main: on_modules_infos:proj_name:'+dir_name);
        proj_name = dir_name
        operators_path = workspace + os.path.sep + dir_name + os.path.sep + db.app.config['PRJ']['OPERATORS_DIR']
        update_operators_infos('workspace', proj_name, operators_path, operators_list, operators_tree, session_data)
    
    # response['operators'] = {'list': operators_list, 'tree': operators_tree, 'work_dir': workspace, 'session_data': core.mod_2_dict(core.get_session_data( sessions_data, session['uuid'] ))} #SECURITY: oops carefull ! sessions_data contains password. remember: we can exclude 'password' prop from dict.
    response['operators'] = {'list': operators_list, 'tree': operators_tree, 'work_dir': workspace}

def on_get_os_versions(data, response, session_data):
    # this fn.name:= sys._getframe().f_code.co_name
    
    response['OSName'] = os.name
    response['Platform'] = platform.platform()
    response['System'] = platform.system()
    response['Release'] = platform.release()
    response['SysPlatform'] = sys.platform
    response['python'] = ''
    response['python-Modules'] = ''
    response['perl'] = ''
    response['perl-Modules'] = ''
    
    if DevLang.query.filter(DevLang.lang_name=='python').first():
        devlang_python = DevLang.query.filter_by(lang_name='python').first()
        response['python'] = devlang_python.lang_version
        response['python-Modules'] = devlang_python.lang_modules

    if DevLang.query.filter(DevLang.lang_name=='perl').first():
        devlang_perl = DevLang.query.filter_by(lang_name='perl').first()
        response['perl'] = devlang_perl.lang_version
        response['perl-Modules'] = devlang_perl.lang_modules

def on_get_os_config(data, response, session_data): # Still Unused .
    all_vars = dict()
    #all_vars = core.mod_2_dict(config) #Security: Avoid exposing ServerConfig for Security Reasons !
    #pprint(('@lib/ultiflow/main: get_os_config.allvars:',all_vars))
    response['config'] = all_vars

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
