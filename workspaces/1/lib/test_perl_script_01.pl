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

BEGIN { push(@INC, ($ENV{'PWD'}||'.')."/ultide"); }; use core; UltideInitVARS();

#print("\n\nOUTPUT:::",Dumper($core::OUTPUT));
#print("\n\nVARS:::",Dumper($core::VARS));
#
#print("\ngetVAR:",
#Dumper( 
#        \{(
#            'Multiple%203%20Ins%2FOuts.output_2.input_1' => getVAR('Multiple%203%20Ins%2FOuts.output_2.input_1'),
#            'Multiple%203%20Ins%2FOuts.output_2.input_2' => getVAR('Multiple%203%20Ins%2FOuts.output_2.input_2'),
#            'Multiple%203%20Ins%2FOuts.output_2.input_3' => getVAR('Multiple%203%20Ins%2FOuts.output_2.input_3'),
#            'Perl: Init.perl_init' => getVAR('Perl: Init.perl_init'),
#            '__RAWOUTPUT__' => getVAR('__RAWOUTPUT__', 1 ),
#            '__OUTPUT__' => getVAR('__OUTPUT__'),
#        )}
#    )
#);

print("Internal: test_perl_script_01 + ", $core::RAWOUTPUT||'' );