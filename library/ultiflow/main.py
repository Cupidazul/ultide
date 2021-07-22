import os
import json
import sys
import platform
import subprocess
import ultide.config as config
from ultide.models import DevLang, Library
from datetime import datetime
from pprint import pprint

WORKSPACE_DIR = 'workspaces'
OPERATORS_DIR = 'operators'
CONFIG_FILE = 'config.json'

def get_workspace(session_data):
    workspace = session_data['user'].get_property('workspace')
    if (workspace is None):
        workspace = WORKSPACE_DIR + os.path.sep + str(session_data['user'].id)
        session_data['user'].set_property('workspace', workspace)
    return workspace

def get_operators_infos(path, proj_name, session_data):
    #print('@lib/ultiflow/main.py: get_operators_infos:',path)
    items = os.listdir(path)
    operators_tree = {}
    operators_list = {}
    for item in items:
        #print('@lib/ultiflow/main.py: get_operators_infos:', item, path, proj_name)
        item_path = path + os.path.sep + item
        if (os.path.isdir(item_path)):
            config_path = item_path + os.path.sep + CONFIG_FILE #'config.json'
            if (os.path.isfile(config_path)):
                config = None
                try:
                    with open(config_path, 'r') as f:
                        config = json.load(f)
                        if (not hasattr(config, "path") or len(config['path'])<1) : config['path'] = config_path
                        if (not hasattr(config, "fs")   or len(config['fs']  )<1) : config['fs']   = dict( workspace_dir=WORKSPACE_DIR, operators_dir=OPERATORS_DIR, config_file=CONFIG_FILE, work_dir=session_data['user'].get_property('workspace'), oper_path=path, oper_name=item, user_id=session_data['user'].id, proj_name=proj_name )
                        operator_id = config['id']
                        operators_tree[operator_id] = True
                        operators_list[operator_id] = config
                        #print( ('@lib/ultiflow/main.py: json:', f, config) )
                except:
                    pass # todo
            else:
                inside_operators_tree, inside_operators_list = get_operators_infos(item_path, proj_name, session_data)
                operators_tree[item] = inside_operators_tree
                operators_list.update(inside_operators_list)
    return operators_tree, operators_list

def update_operators_infos(directory, proj_name, operators_path, operators_list, operators_tree, session_data):
    print('@lib/ultiflow/main.py: update_operators_infos:', directory, proj_name, operators_path)
    if (os.path.isdir(operators_path)):
        module_operators_tree, module_operators_list = get_operators_infos(operators_path, proj_name, session_data)
        operators_list.update(module_operators_list)
        operators_tree[directory][proj_name] = module_operators_tree

    hasNewItems = False
    # SQLAlchemy Get Operators from DB: Library
    # SQLite ex: INSERT INTO "library" VALUES(1,1,'Perl: Procs','perl_init1','{"id":"perl_procs::perl_init1","title":"Perl: Init 1","type":"operator","inputs":{},"outputs":{"data":{"label":"Start"}},"parameters":[{"id":"perl_incdirs","label":"Include Directories (@INC):","type":"ultiflow::list","config":{"fieldType":"ultiflow::text","fieldTypeConfig":{"default":""}}},{"id":"perl_add_use","label":"Include pod (use <module>;):","type":"ultiflow::list","config":{"fieldType":"ultiflow::text","fieldTypeConfig":{"default":""}}},{"id":"perl_init","label":"Perl Code:","type":"ultiflow::textarea","config":{"attr":{"rows":10},"css":{"font-size":"11px","white-space":"nowrap","width":"100%","font-family":"monospace"},"default":"#!/usr/bin/perl\n\nuse warnings;\nuse strict ''vars'';\nuse Data::Dumper;\nuse Encode qw(decode encode is_utf8);\nuse Getopt::Long;\nuse IO::Handle;\nuse LWP::UserAgent;\nuse Time::Piece;\nuse URI::Escape;\nuse utf8;\n"}}]}');
    ALLdbLibs = Library.query.filter(Library.lib_name==proj_name).all()
    #pprint(('Library filter('+proj_name+'):', ALLdbLibs));
    for row in ALLdbLibs:
        hasNewItems = True
        #print ("ID:", row.id, "User:", row.uid, "Name: ",row.lib_name, "Oper:",row.lib_oper, "Code:",row.lib_code)
        config = json.loads(row.lib_code)
        db_operators_tree = {}
        db_operators_list = {}
        item = row.lib_oper
        item_path = '@db:Library'
        config_path = item_path + ':' + str(row.id)
        if (not hasattr(config, "path") or len(config['path'])<1) : config['path'] = config_path
        if (not hasattr(config, "fs")   or len(config['fs']  )<1) : config['fs']   = dict( workspace_dir=WORKSPACE_DIR, operators_dir=OPERATORS_DIR, config_file=CONFIG_FILE, work_dir=session_data['user'].get_property('workspace'), oper_path=directory, oper_name=item, user_id=session_data['user'].id, proj_name=proj_name )
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
    workspace = get_workspace(session_data)
    operators_tree = {'library': {}, 'workspace': {}}
    #print('@lib/ultiflow/main.py: on_modules_infos:');pprint((session_data['modules_infos']));
    for module_name in session_data['modules_infos']:
        module_infos = session_data['modules_infos'][module_name]
        if 'config' in module_infos:
            #print('@lib/ultiflow/main.py: on_modules_infos['+module_name+']:');pprint((module_infos));
            #print("\n"+'@lib/ultiflow/main.py: on_modules_infos['+module_name+'][main]:');pprint((vars(module_infos['main'])));
            #print("\n"+'@lib/ultiflow/main.py: on_modules_infos['+module_name+'][config]:');pprint((vars(module_infos['config'])));
            #print("\n")
            proj_name = module_infos['config'].name
            operators_path = module_infos['path'] + os.path.sep + OPERATORS_DIR
            update_operators_infos('library', proj_name, operators_path, operators_list, operators_tree, session_data)

    for dir_name in os.listdir(workspace):
        #print('@lib/ultiflow/main.py: on_modules_infos:proj_name:'+dir_name);
        proj_name = dir_name
        operators_path = workspace + os.path.sep + dir_name + os.path.sep + OPERATORS_DIR
        update_operators_infos('workspace', proj_name, operators_path, operators_list, operators_tree, session_data)
    response['operators'] = {'list': operators_list, 'tree': operators_tree, 'work_dir': workspace }

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

    perlopts = dict(del_script = 1); # DEFAULT DELETE SCRIPTS
    perlobj = json.loads(data['cmd']);  # "perl_incdirs":[], "perl_add_use":[], "perl_init":'<perl init code>'
    if hasattr(data, "opts"): perlopts = data['opts']

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
    fd, temp_script_path = mkstemp(dir=scripts_dir, prefix= datetime.today().strftime('%Y%m%d%H%M%S') + "-perl_script", suffix = '.pl')
    # use a context manager to open the file at that path and close it again
    with open(temp_script_path, 'w') as f:
        f.write( perl_code )
    # close the file descriptor
    os.close(fd)

    print('@on_perl_CodeRun: script', temp_script_path)

    #cmd = [ 'perl', '-e ' + perlobj['perl_init'].replace("\n","") ]
    cmd = [ 'perl', temp_script_path ]

    if ( hasattr(config, "PERL_EXEC") and config.PERL_EXEC !='' ):
        cmd = [ config.PERL_EXEC, temp_script_path ]

    print ('@on_perl_CodeRun: cmd:',cmd)
    ret = ''
    try:
        ret = subprocess.check_output(cmd, stderr=subprocess.STDOUT, shell=True, encoding='UTF-8')
        print ('@on_perl_CodeRun: RetVal:', ret)
    except Exception as err:
        import traceback
        exc_info = sys.exc_info()
        #ret = dict( traceback = json.dumps(traceback.format_exception(*exc_info)), Exception = json.dumps(exception_as_dict(err),indent=2) ) # as JSON
        ret = dict( traceback=traceback.format_exception(*exc_info), Exception=exception_as_dict(err) , error='true') # pure objects
        print('@on_perl_CodeRun: Exception:', err ) # To print out the exception message , print out the stdout messages up to the exception
    
    if ( perlopts['del_script'] == 1 ):
        os.remove(temp_script_path) # delete temp file

    response['RetVal'] = ret

def on_python_CodeRun(data, response, session_data):
    workspace = session_data['user'].get_property('workspace')
    print( ('@on_python_CodeRun: data:', data, 'session_data:', session_data, 'response:', response, 'workspace:', ) )

    # Check if Exists: scripts <DIR> and create it if not...
    scripts_dir = os.path.dirname('./' + workspace + '/scripts/')
    if not os.path.exists(scripts_dir): os.makedirs(scripts_dir)

    pythonopts = dict(del_script = 1); # DEFAULT DELETE SCRIPTS
    pythonobj = json.loads(data['cmd']);  # "python_incdirs":[], "python_add_use":[], "python_init":'<python init code>'
    if hasattr(data, "opts"): pythonopts = data['opts']

    # First ADD python Init Code:
    python_code = pythonobj['python_init']

    from tempfile import mkstemp
    fd, temp_script_path = mkstemp(dir=scripts_dir, prefix= datetime.today().strftime('%Y%m%d%H%M%S') + "-python_script", suffix = '.py')
    # use a context manager to open the file at that path and close it again
    with open(temp_script_path, 'w') as f:
        f.write( python_code )
    # close the file descriptor
    os.close(fd)

    print('@on_python_CodeRun: script', temp_script_path)

    cmd = [ 'python', temp_script_path ]

    if ( hasattr(config, "PYTHON_EXEC") and config.PYTHON_EXEC != '' ):
        cmd = [ config.PYTHON_EXEC, temp_script_path ]

    print ('@on_python_CodeRun: cmd:',cmd)
    ret = ''
    try:
        ret = subprocess.check_output(cmd, stderr=subprocess.STDOUT, shell=True, encoding='UTF-8')
        print ('@on_python_CodeRun: RetVal:', ret)
    except Exception as err:
        import traceback
        exc_info = sys.exc_info()
        #ret = dict( traceback = json.dumps(traceback.format_exception(*exc_info)), Exception = json.dumps(exception_as_dict(err),indent=2) ) # as JSON
        ret = dict( traceback=traceback.format_exception(*exc_info), Exception=exception_as_dict(err) , error='true') # pure objects
        print('@on_python_CodeRun: Exception:', err ) # To print out the exception message , print out the stdout messages up to the exception
    
    if ( pythonopts['del_script'] == 1 ):
        os.remove(temp_script_path) # delete temp file

    response['RetVal'] = ret

def on_getDefaultConfig(data, response, session_data):
    response['raw']=open('templates/new_config.json').read()
    response['json']=json.loads(response['raw'])

def on_deleteProject(data, response, session_data):
    print('@main: deleteProject: rmdir+file:', data['path'])
    os.remove(data['path'])
    os.rmdir(os.path.dirname(data['path']))

def on_saveNewProject(data, response, session_data):
    print('@main: saveNewProject: data.cfg.path:',os.getcwd(), data['cfg']['path'])
    #os.makedirs(os.getcwd() + "\\" + data['cfg']['path'])
    os.makedirs(os.path.dirname(data['cfg']['path']))
    with open(data['cfg']['path'], 'w') as f:
        f.write( json.dumps( data['cfg'] ))
