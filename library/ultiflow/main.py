import os
import json
import sys
import platform
import subprocess
from ultide.models import DevLang
from datetime import datetime

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
    items = os.listdir(path)
    operators_tree = {}
    operators_list = {}
    for item in items:
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
    if (os.path.isdir(operators_path)):
        module_operators_tree, module_operators_list = get_operators_infos(operators_path, proj_name, session_data)
        operators_list.update(module_operators_list)
        operators_tree[directory][proj_name] = module_operators_tree

def on_modules_infos(data, response, session_data):
    operators_list = {}
    workspace = get_workspace(session_data)
    operators_tree = {'library': {}, 'workspace': {}}
    for module_name in session_data['modules_infos']:
        module_infos = session_data['modules_infos'][module_name]
        if 'config' in module_infos:
            proj_name = module_infos['config'].name
            operators_path = module_infos['path'] + os.path.sep + OPERATORS_DIR
            update_operators_infos('library', proj_name, operators_path, operators_list, operators_tree, session_data)
    for dir_name in os.listdir(workspace):
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
    if ( hasattr(perlobj['perl_incdirs'], "__len__") and not perl_code.endswith("\n") ): # Add NewLine if it's not there
        perl_code += "\n"
    for add_incdir in perlobj['perl_incdirs']:
        perl_code += 'BEGIN { push(@INC, "' + add_incdir + '"); };' + "\n"

    # Then ADD modules:
    if ( hasattr(perlobj['perl_add_use'], "__len__") and not perl_code.endswith("\n") ): # Add NewLine if it's not there
        perl_code += "\n"
    for add_module in perlobj['perl_add_use']:
        perl_code += 'use ' + add_module + ';' + "\n"

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
