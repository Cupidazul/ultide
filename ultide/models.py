import sys
import json
import subprocess
import pkg_resources
from flask_sqlalchemy import SQLAlchemy
from flask_user import UserMixin
import ultide.common as common

# Initialize Flask extensions
db = SQLAlchemy()                            # Initialize Flask-SQLAlchemy

# Define the User data model. Make sure to add flask.ext.user UserMixin !!!
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)

    # User authentication information
    username = db.Column(db.String(50), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False, server_default='')
    reset_password_token = db.Column(db.String(100), nullable=False, server_default='')

    # User email information
    email = db.Column(db.String(255), nullable=False, unique=True)
    confirmed_at = db.Column(db.DateTime())

    # User information
    active = db.Column('is_active', db.Boolean(), nullable=False, server_default='0')
    first_name = db.Column(db.String(100), nullable=False, server_default='')
    last_name = db.Column(db.String(100), nullable=False, server_default='')
    
    def verify_password(self, password):
        return common.user_manager.verify_password(password, self)
      
    def get_property(self, name):
        prop = UserProperties.query.filter_by(name=name).first()
        if (prop is None):
            return None
        else:
            return prop.value
    def set_property(self, name, value):
        prop = UserProperties.query.filter_by(user_id=self.id,name=name).first()
        if (prop is not None):
            prop.value = value
        else:
            prop = UserProperties(user_id=self.id, name=name, value=value)
            db.session.add(prop)
        db.session.commit()
      
      
class UserProperties(db.Model):
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=False)
    name = db.Column(db.String(255), primary_key=True, autoincrement=False, nullable=False, server_default='')
    value = db.Column(db.Text(), nullable=True)
    

class DevLang(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)

    # User authentication information
    lang_name = db.Column(db.String(50), nullable=False, unique=True)
    lang_version = db.Column(db.String(255), nullable=False, server_default='')
    lang_modules = db.Column(db.Text(), nullable=False, server_default='')

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

