#!/usr/bin/python3

import sys; sys.dont_write_bytecode = True; # don't write __pycache__ DIR

from pprint import pprint
import subprocess
import psycopg2
import base64
import json
import os
import zlib
import base64

osLF = '/' if ( not os.name == 'nt') else '\\';
sys.path.insert(0,os.path.abspath(os.path.join(os.path.dirname(__file__),'..'+osLF+'..'+osLF+'..')));import ultide.core as UltideCore;
OUTPUT = UltideCore.decodeZlibString(sys.argv[1])

print('PythonFinal: + ' + OUTPUT, end = '')
