import os
import sys
import json
import subprocess
import pkg_resources
from flask_sqlalchemy import SQLAlchemy
# https://github.com/ckraczkowsky91/flask-admin-flask-security
from flask_security import current_user, Security, SQLAlchemyUserDatastore, UserMixin
import ultide.common as common
import ultide.config as config
from werkzeug.security import generate_password_hash, check_password_hash
from pprint import pprint
from datetime import datetime
import re

# Initialize Flask extensions
db = SQLAlchemy()                            # Initialize Flask-SQLAlchemy

# Define the User data model. Make sure to add flask.ext.user UserMixin !!!
class User(db.Model, UserMixin):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)

    # User authentication information
    username = db.Column(db.String(50), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False, server_default='')
    reset_password_token = db.Column(db.String(100), nullable=False, server_default='')

    # User email information
    email = db.Column(db.String(255), nullable=False, unique=False)
    avatar = db.Column(db.String(255), nullable=False, unique=False)
    confirmed_at = db.Column(db.DateTime())

    # User information
    active = db.Column('is_active', db.Boolean(), nullable=False, server_default='0')
    first_name = db.Column(db.String(100), nullable=False, server_default='')
    last_name = db.Column(db.String(100), nullable=False, server_default='')

    group = db.Column('group', db.Integer(), nullable=False, server_default='0')
    # 0000 0000
    # ││││ ││││
    # ││││ │││└── (1)   - Role 1
    # ││││ ││└─── (2)   - Role 2
    # ││││ │└──── (4)   - Role 3
    # ││││ └───── (8)   - Role 4
    # │││└─────── (16)  - Role 5
    # ││└──────── (32)  - Role 6
    # │└───────── (64)  - Role 7
    # └────────── (128) - Admin

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'group': self.group,
            'email': self.email,
            'avatar': self.avatar,
            'create_date': self.confirmed_at,
            'active': self.active,
            'is_admin': self.is_admin,
        }
        
    def user_exists(self, usrname):
        return not (not User.query.filter(User.username==usrname).first())

    def del_user(self, user):
        del_user = User.query.filter(User.username==user['username']).first()
        db.session.delete(del_user)
        db.session.commit()

    def add_user(self, user):
        new_user = User(
            first_name   = str(user['first_name']),
            last_name    = str(user['last_name']),
            username     = str(user['username']),
            email        = str(user['email']),
            group        = int(user['group']),
            avatar       = str(user['avatar']),
            confirmed_at = datetime.now(),
            active       = True
        )
        new_user.set_password(str(user['password']))
        db.session.add(new_user)
        db.session.commit()

    def save(self):
        db.session.commit()
    
    def IsPwdEncrypted(password):
        tf = not not re.match(config.PASSWORD_ENCRYPTION_METHOD+':.*', password)
        return tf

    def encrypt_password(password, method=config.PASSWORD_ENCRYPTION_METHOD, salt_length=config.PASSWORD_SALT_LENGTH):
        if ( User.IsPwdEncrypted(password) ):
            return password
        else:
            return generate_password_hash(password, method, salt_length)

    def set_password(self, password):
        if ( User.IsPwdEncrypted(password) ):
            # password is allready a hash
            self.password = password
        else:
            # generate a hash from text password
            self.password = generate_password_hash(password, method=config.PASSWORD_ENCRYPTION_METHOD, salt_length=config.PASSWORD_SALT_LENGTH)

    def verify_password(self, password):
        if ( User.IsPwdEncrypted(password) ):
            return (self.password == password)
        else:
            return check_password_hash(self.password, password)
        #return common.user_manager.verify_password(password, self)

    @property
    def is_admin(self):
        return ( int(self.group) & 128 ) == 128 # config.DB_USER['group'] = 255 = 'Superuser'

    def get_property(self, name):
        prop = UserProperties.query.filter_by(user_id=self.id,name=name).first()
        #pprint(('@get_property:', name, prop))
        if (prop is None):
            return None
        else:
            return prop.value

    def set_property(self, name, value):
        prop = UserProperties.query.filter_by(user_id=self.id,name=name).first()
        #pprint(('@set_property:', name, prop, value))
        if (prop is not None):
            prop.value = value
        else:
            prop = UserProperties(user_id=self.id, name=name, value=value)
            db.session.add(prop)
        db.session.commit()

class UserProperties(db.Model):
    user_id = db.Column(db.Integer,     primary_key=True, autoincrement=False)
    name    = db.Column(db.String(255), primary_key=True, autoincrement=False, nullable=False, server_default='')
    value   = db.Column(db.Text(),      nullable=True)

class DevLang(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    lang_name    = db.Column(db.String(50),  nullable=False, unique=True)
    lang_version = db.Column(db.String(255), nullable=False, server_default='')
    lang_modules = db.Column(db.Text(),      nullable=False, server_default='')

    def get_version_perl ():  # returns perl version
        perlExe = 'perl'
        if (os.name == 'nt'):
            perlExe = config.PERL_EXEC.replace('/','\\')
        else:
            perlExe = config.PERL_BIN
        cmd = [ perlExe, '-e print $^V;' ]
        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return ret.replace("v","").replace("\r\n","")

    def cpan_list_all_modsJSON (_objList):
        _jsonStr = ''
        _sep = ''
        for line in _objList.split("\n"):
            if (line!=''):
                try:
                    (_libname,_version) = line.split("\t")
                    _version = _version.replace(" ","").replace("undef","").replace(u"\u0004","4.").replace(u"\u0003","3.").replace(u"\u0002","2.").replace(u"\u0001","1.").replace(u"\u0000","0.")
                    _version = re.sub(r'^v', '', _version)
                    _version = re.sub(r'\.$', '', _version)
                    #pprint(((_libname,_version)))
                    _jsonStr += _sep + '"' + _libname + '":"' + _version + '"'
                    if (_sep==''): _sep = ','
                except Exception as err:
                    pprint(('Error:', {'err':err, 'line':line}))
        return "{"+_jsonStr+"}"

    def get_version_perl_modules ():  # returns perl modules
        perlExe = 'perl'
        _stdErr = sys.stdout
        if (os.name == 'nt'):
            perlExe = config.PERL_EXEC.replace('/','\\')
            #cmd = [ perlExe, '-MExtUtils::Installed', '-e $i=ExtUtils::Installed->new();$sep=\'\';print \'{\';for($i->modules()){print $sep.\'\\\'\'.$_.\'\\\':\\\'\'.$i->version($_).\'\\\'\';$sep=\',\';};print \'}\';' ]
            cmd = [ perlExe, '-e', 'use App::Cpan; App::Cpan::_list_all_mods();']
        else:
            perlExe = config.PERL_BIN
            #cmd = [ perlExe, '-MExtUtils::Installed', '-e', "$i=ExtUtils::Installed->new(); $sep='';print '{';for $d ($i->modules()){ print $sep.\"'\".$d.\"':'\".$i->version($d).\"'\"; $sep=',';};print '}';" ]
            cmd = [ perlExe, '-e', 'use App::Cpan; App::Cpan::_list_all_mods();']
            _stdErr = subprocess.DEVNULL

        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=_stdErr).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        
        return DevLang.cpan_list_all_modsJSON(ret).replace("\r\n","").replace("'","\"")

    def get_version_python ():  # returns python version
        pythonExe = sys.executable
        if (os.name == 'nt'):
            pythonExe = config.PYTHON_EXEC.replace('/','\\')
        else:
            pythonExe = config.PYTHON_BIN
        cmd = [ pythonExe, '--version' ]
        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return ret.replace("Python ","").replace("\r\n","").replace("\n","")

    def get_version_python_modules ():  # returns python modules
        installed_packages = pkg_resources.working_set
        all_packages = dict()
        obj = {}
        for i in installed_packages:
            obj[i.key] = i.version
            all_packages.update( obj )
        return json.dumps(all_packages)

    def get_version_tcl ():  # returns tcl version
        cmd = []
        tclExe = 'tclsh'
        if (os.name == 'nt'):
            tclExe = config.TCL_EXEC.replace('/','\\')
            cmd = [ 'cmd', '/c', 'echo puts -nonewline [info patchlevel]|' + tclExe ]
        else:
            tclExe = config.TCL_BIN
            cmd = [ 'bash', '-c', 'echo puts -nonewline [info patchlevel]|' + tclExe ]

        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return ret

    def get_version_tcl_modules ():  # returns tcl modules
        cmd = []
        tclExe = 'tclsh'
        if (os.name == 'nt'):
            tclExe = config.TCL_EXEC.replace('/','\\')
            cmd = [ 'cmd', '/c', "echo set x [package require paths];set t {};set s {};foreach x [package names] {set v [package version $x];set t $t$s'$x':'$v';set s {,};};puts -nonewline \{$t\};|" + tclExe]
        else:
            tclExe = config.TCL_BIN
            cmd = [ 'bash', '-c', 'echo "set x [package require paths];set t {};set s {};foreach x [package names] { set v [package version \$x]; set t \"\$t\$s\\\'\$x\\\':\\\'\$v\\\'\";set s {,};};puts -nonewline \"\\\{\$t\\\}\"; " | ' + tclExe ]

        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return ret.replace("'","\"")

    def get_version_expect ():  # returns expect version
        cmd = []
        expectExe = 'expect'
        if (os.name == 'nt'):
            expectExe = config.EXPECT_EXEC.replace('/','\\')
            cmd = [ 'cmd', '/c', 'echo send_user [info patchlevel]|' + expectExe ]
        else:
            expectExe = config.EXPECT_BIN
            cmd = [ 'bash', '-c', 'echo send_user [info patchlevel]|' + expectExe ]

        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return ret

    def get_version_expect_modules ():  # returns expect modules
        cmd = []
        expectExe = 'expect'
        if (os.name == 'nt'):
            expectExe = config.EXPECT_EXEC.replace('/','\\')
            cmd = [ 'cmd', '/c', "echo set x [package require paths];set t {};set s {};foreach x [package names] {set v [package version $x];set t $t$s'$x':'$v';set s {,};};send_user \{$t\};|" + expectExe]
        else:
            expectExe = config.EXPECT_BIN
            cmd = [ 'bash', '-c', 'echo "set x [package require paths];set t {};set s {};foreach x [package names] { set v [package version \$x]; set t \"\$t\$s\\\'\$x\\\':\\\'\$v\\\'\";set s {,};};send_user \"\\\{\$t\\\}\"; " | ' + expectExe ]

        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return ret.replace("'","\"")

    def get_version_node ():  # returns node version
        nodeExe = 'node'
        if (os.name == 'nt'):
            nodeExe = config.NODE_EXEC.replace('/','\\')
        else:
            nodeExe = config.NODE_BIN
        cmd = [ nodeExe, '--version' ]
        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return ret.replace("v","").replace("\r\n","") + ( ' (npm: '+ DevLang.get_version_npm()+')' )

    def get_version_npm ():  # returns npm version
        npmExe = 'npm'
        if (os.name == 'nt'):
            npmExe = config.NPM_EXEC.replace('/','\\')
        else:
            npmExe = config.NPM_BIN
        cmd = [ npmExe, '--version' ]
        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return ret.replace("\n","")

    def get_version_node_modules ():  # returns node GLOBAL modules from npm
        npmExe = 'npm'
        if (os.name == 'nt'):
            npmExe = config.NPM_EXEC.replace('/','\\')
        else:
            npmExe = config.NPM_BIN
        cmd = [ npmExe, '-g', 'list', '--json' ]
        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return json.dumps(json.loads(ret.replace("\r\n","").replace("'","\"")))

class Library(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    uid = db.Column(db.Integer, nullable=False)
    lib_name = db.Column(db.String(255), nullable=False, server_default='', autoincrement=False)
    lib_oper = db.Column(db.String(255), nullable=False, server_default='', autoincrement=False)
    lib_code = db.Column(db.Text(),      nullable=False, server_default='')
