#/usr/bin/perl

use strict;
use warnings;
no if $] >= 5.020, warnings => qw(experimental::smartmatch);
use Data::Dumper;
use JSON;
use Getopt::Long;
use IO::Handle;
use MIME::Base64;
use URI::Escape;
use utf8;

BEGIN { push(@INC, ($ENV{'PWD'}||'.')."/ultide"); };
use UltideCore;
UltideInitVARS();

#print("\n\nOUTPUT:::",Dumper($UltideCore::OUTPUT));
#print("\n\nVARS:::"  ,Dumper($UltideCore::VARS  ));

#print("\n\ngetVAR:",
#Dumper({
#            '_parent_'                    => getVAR( getVAR('_parent_') ),
#            '_parent_.input_1'            => Dumper( getVAR( getVAR('_parent_').'.input_1' ) ),
#            'Multiple 3 Ins/Outs.input_1' => getVAR( 'Multiple 3 Ins/Outs.input_1' ),
#            'Multiple 3 Ins/Outs.input_2' => getVAR( 'Multiple 3 Ins/Outs.input_2' ),
#            'Multiple 3 Ins/Outs.input_3' => getVAR( 'Multiple 3 Ins/Outs.input_3' ),
#            'Perl: Init.perl_init'        => getVAR( 'Perl: Init.perl_init' ),
#            '__RAWOUTPUT__'               => getVAR( '__RAWOUTPUT__', 1 ),
#            '__OUTPUT__'                  => getVAR( '__OUTPUT__' ),
#        }
#    )
#);

#print("Internal: test_perl_script_01 + \n RAWOUTPUT:", $UltideCore::RAWOUTPUT||'', "\n OUTPUT:", Dumper($UltideCore::OUTPUT||'') );

# VARS Usage Example: 
# "Perl Init" : print( JSON->new->utf8->encode({'TTT1'=> 'TestVal_TTT1'}) );
# "All fields" : text := "var: {{VARS.TTT0}} {{VARS.TTT1}}"

print("Internal: test_perl_script_01 VAR.TTT1: ", getVAR('TTT1'));
