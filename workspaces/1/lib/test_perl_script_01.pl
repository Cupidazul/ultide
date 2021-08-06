#/usr/bin/perl

use strict;
use warnings;
no if $] >= 5.020, warnings => 'experimental::smartmatch';
use Data::Dumper;
use JSON;
use Encode qw(decode encode is_utf8);
use Getopt::Long;
use IO::Handle;
use utf8;
use MIME::Base64;
use IO::Compress::Gzip qw(gzip $GzipError);
use IO::Uncompress::Gunzip qw(gunzip $GunzipError);
use IO::Compress::Deflate   qw(deflate $DeflateError);
use IO::Uncompress::Inflate qw(inflate $InflateError);
  
my $OUTPUT='';inflate \decode_base64($ARGV[0]) => \$OUTPUT or die "deflate failed: $DeflateError\n";

print('Internal: test_perl_script_01 + ', $OUTPUT||'');
