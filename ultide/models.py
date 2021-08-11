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

    def user_exists(self, usrname):
        return not (not User.query.filter(User.username==usrname).first())

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
                   
    def set_password(self, password):
        if ( password.startswith('sha256$') ):
            # password is allready a hash
            self.password = password
        else:
            # generate a hash from text password
            self.password = generate_password_hash(password, method='sha256')

    def verify_password(self, password):
        if ( password.startswith('sha256$') ):
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
        cmd = [ 'perl', '-e print $^V;' ]
        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout, shell=True).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return ret.replace("v","").replace("\r\n","")

    def get_version_perl_modules ():  # returns perl modules
        cmd = [ 'perl', '-MExtUtils::Installed', '-e $i=ExtUtils::Installed->new();$sep=\'\';print \'{\';for($i->modules()){print $sep.\'\\\'\'.$_.\'\\\':\\\'\'.$i->version($_).\'\\\'\';$sep=\',\';};print \'}\';' ]
        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout, shell=True).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return ret.replace("\r\n","").replace("'","\"")

    def get_version_python ():  # returns python version
        cmd = [ sys.executable, '--version' ]
        ret = ''
        try:
            ret = subprocess.check_output(cmd, stderr=sys.stdout, shell=True).decode('ascii')
        except Exception as e:
            print(e, e.output.decode()) # To print out the exception message , print out the stdout messages up to the exception
        return ret.replace("Python ","").replace("\r\n","")

    def get_version_python_modules ():  # returns python modules
        installed_packages = pkg_resources.working_set
        all_packages = dict()
        obj = {}
        for i in installed_packages:
            obj[i.key] = i.version
            all_packages.update( obj )
        return json.dumps(all_packages)

class Library(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    uid = db.Column(db.Integer, nullable=False)
    lib_name = db.Column(db.String(255), nullable=False, server_default='', autoincrement=False)
    lib_oper = db.Column(db.String(255), nullable=False, server_default='', autoincrement=False)
    lib_code = db.Column(db.Text(),      nullable=False, server_default='')
