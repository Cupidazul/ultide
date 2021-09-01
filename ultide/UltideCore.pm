package UltideCore;

use 5.010;
use strict 'vars';
use warnings;
no if $] >= 5.020, warnings => qw(experimental::smartmatch);
#use 2.006 Socket qw(AF_INET AF_INET6 inet_pton);
require(Exporter);
our @ISA = qw(Exporter);
our @EXPORT = qw(getVAR setVAR readVARS processOUTPUT UltideInitVARS);

use JSON;
use Encode;
use MIME::Base64;
use Data::Dumper;
use URI::Escape;
use IO::Compress::Gzip qw(gzip $GzipError); 
use IO::Uncompress::Gunzip qw(gunzip $GunzipError);
use IO::Compress::Deflate   qw(deflate $DeflateError);
use IO::Uncompress::Inflate qw(inflate $InflateError);

our $VARS={};
our $RAWOUTPUT='';
our $OUTPUT='';

sub UltideInitVARS{
    my $_arg = shift;
    if ($_arg) { _readVARS( processOUTPUT($_arg) ); }
    else       { _readVARS( processOUTPUT()      ); }
}

sub processOUTPUT {
    my $_arg = shift;
    if ($_arg) { inflate \decode_base64($_arg   ) => \$OUTPUT or die "deflate failed: $DeflateError\n"; }
    else       { inflate \decode_base64($ARGV[0]) => \$OUTPUT or die "deflate failed: $DeflateError\n"; }
    $RAWOUTPUT = $OUTPUT;
    $OUTPUT = JSON->new->utf8->allow_nonref(1)->decode($RAWOUTPUT);
    setVAR ('__OUTPUT__',$OUTPUT);
    setVAR ('__RAWOUTPUT__',$RAWOUTPUT);
    return $OUTPUT;
}

sub unescapeOnce {
    my $val = shift;
    if ($val) {
        if (uri_unescape($val) eq $val) { return $val;               } # key is not escaped. return!
        else                            { return uri_unescape($val); } # key is escaped. return unescaped!
    }
}

sub escapeOnce {
    my $val = shift;
    if ($val) {
        if (uri_unescape($val) eq $val) { return uri_escape($val); } # key is not escaped. escape!
        else                            { return $val;             } # escape not needed!
    }
}

sub getVAR {
    my ($key) = shift;
    my ($dont_escape) = shift;
    my $val = '';
    if ($key) {
        $val = $VARS->{$key} if ($VARS->{$key});
        $val = $VARS->{uri_escape($key)} if ($VARS->{uri_escape($key)});
        $val = $VARS->{'root.'.$key} if ($val eq '' && $VARS->{'root.'.$key});
        $val = $VARS->{'root.'.uri_escape($key)} if ($val eq '' && $VARS->{'root.'.uri_escape($key)});
    }
    return ($dont_escape)?$val:unescapeOnce($val);
}

sub setVAR {
    my ($key,$val) = @_;
    if ($key) {
        my $_retObj = {};
        my $_retKey = {};
        $_retKey = escapeOnce($key);
        $_retObj = $VARS->{$_retKey} = $val; # we could simply: unescapeOnce($val)
        return ( $_retObj, $_retKey );
    }
}

sub readVARS {
    my ($obj,$root) = @_;
    $obj  = $OUTPUT if (!$obj);
    $root = ''      if (!$root);
    _readVARS($obj,$root) if ($obj);
}

sub _sub_readVARS {
    my ($k,$v) = @_;
    if (ref($v) eq "HASH") {
            while (my ($k1, $v1) = each (%$v)) {
                if (ref($v1) eq "HASH") {
                    if ($k1 ne 'name') {
                        if ($v1 =~ /^\{/) {
                            eval {
                                my ($_obj, $_objNm) = setVAR( escapeOnce($v1->{'name'}) , JSON->new->utf8->allow_nonref(1)->decode($v1));
                                _readVARS($_obj, $_objNm);
                            };
                        } else {
                            eval {
                                my ($_obj, $_objNm) = setVAR( escapeOnce($v1->{'name'}) , $v1);
                                _readVARS($_obj, $_objNm);
                            };
                        }
                    }
                }
            }
            if ($k ne 'name') {
                if ($v =~ /^\{/) {
                    eval {
                        my ($_obj, $_objNm) = setVAR( escapeOnce($v->{'name'}) , JSON->new->utf8->allow_nonref(1)->decode($v));
                        _readVARS($_obj, $_objNm);
                        setVAR( '_parent_', escapeOnce($v->{'name'}) );
                    };
                } else {
                    eval {
                        my ($_obj, $_objNm) = setVAR( escapeOnce($v->{'name'}) , $v);
                        _readVARS($_obj, $_objNm);
                        setVAR( '_parent_', escapeOnce($v->{'name'}) );
                    };
                }
                #_readVARS($v, $k);
            }
        }

    return !(ref($v) eq "HASH");
}

sub _readVARS {
    my ($obj, $root, $depth) = @_;
    return ''      if (!$obj);
    $root = ''     if (!$root);
    $depth = -1    if (!$depth); $depth++;
    
    while (my ($k, $v) = each (%$obj)) {
        $v =~ s/\'/"/g if ($v =~ /^\{\'/);

        #print("\n\nreadVARS: [depth:". $depth ."]: ". $root .".". $k ." ". ref($v) ."->>", Dumper( \($v, $k)),' <<-' );

        if ( _sub_readVARS($k,$v) ) {
            if ($k ne 'name') {
                #if ($root ne '') { setVAR( $root.'.'.escapeOnce($k), $v );}
                #else             { setVAR(   'root.'.escapeOnce($k), $v );}
                my ($_obj, $_objNm) = ();

                if ($v =~ /^\{/) {
                    eval {
                        if ($depth==0) {
                            ($_obj, $_objNm) = setVAR( $root.(($root ne '')?'':'root')                  , JSON->new->utf8->allow_nonref(1)->decode($v));
                            _readVARS($_obj, $_objNm, \$depth);
                        }
                            ($_obj, $_objNm) = setVAR( $root.(($root ne '')?'.':'root.').escapeOnce($k) , JSON->new->utf8->allow_nonref(1)->decode($v));
                            _readVARS($_obj, $_objNm, \$depth);
                        #_readVARS(JSON->new->utf8->allow_nonref(1)->decode($v), $k);
                    };
                } else {
                    eval {
                        if ($k ne 'start_date' && $k ne 'end_date' && $k ne 'RetVal') {
                            ($_obj, $_objNm) = setVAR( $root.(($root ne '')?'.':'root.').escapeOnce($k) , $v);
                            _readVARS($_obj, $_objNm, \$depth);
                        }
                        #_readVARS($v, $k);
                    };
                }

                if ($k ne 'start_date' && $k ne 'end_date' && $k ne 'RetVal') {
                    setVAR(escapeOnce($k) , $v) # save all sub-vars as globals
                }

                eval { 
                    $v = JSON->new->utf8->allow_nonref(1)->decode($v);
                    _sub_readVARS($k,$v);
                };
            }
        } else {
            if ($k !~ /^output/ && $k !~ /^input/ && $k !~ /^RetVal/) {
                _readVARS($v, $root.(($root ne '')?'.':'root.').escapeOnce($k) , $depth)
            } else {
                _readVARS($v, $root.(($root ne '')?'':'root'), $depth)
            }
        }
    }
    setVAR( 'root', $obj ) if ($root eq '');
}

1;