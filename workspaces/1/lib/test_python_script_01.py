#!/usr/bin/python3

import sys; sys.dont_write_bytecode = True; # don't write __pycache__ DIR

from pprint import pprint, pformat
import subprocess
import psycopg2
import base64
import json
import os
import zlib
import base64

osSEP = '/' if ( not os.name == 'nt') else '\\';sys.path.insert(0,os.path.abspath(os.path.join(os.path.dirname(__file__),'..'+osSEP+'..'+osSEP+'..')))
import ultide.core as UltideCore
UltideCore.UltideInitVARS()

#print("\n\nOUTPUT:::",pformat(UltideCore.OUTPUT))
#print("\n\nVARS:::"  ,pformat(UltideCore.VARS  ))

#print("\n\ngetVAR:",
#pformat({
#            '_parent_'                     : UltideCore.getVAR( UltideCore.getVAR('_parent_') ),
#            '_parent_.input_1'             : UltideCore.getVAR( UltideCore.getVAR('_parent_') + '.input_1' ),
#            'Multiple 3 Ins/Outs.input_1'  : UltideCore.getVAR( 'Multiple 3 Ins/Outs.input_1' ),
#            'Multiple 3 Ins/Outs.input_2'  : UltideCore.getVAR( 'Multiple 3 Ins/Outs.input_2' ),
#            'Multiple 3 Ins/Outs.input_3'  : UltideCore.getVAR( 'Multiple 3 Ins/Outs.input_3' ),
#            'Perl: Init.perl_init'         : UltideCore.getVAR( 'Perl: Init.perl_init' ),
#            '__RAWOUTPUT__'                : UltideCore.getVAR( '__RAWOUTPUT__', 1 ),
#            '__OUTPUT__'                   : UltideCore.getVAR( '__OUTPUT__' ),
#        }
#    )
#)

print("Internal: test_python_script_01 + \n RAWOUTPUT:", UltideCore.RAWOUTPUT, "\n OUTPUT:", pformat(UltideCore.OUTPUT), end = "")
