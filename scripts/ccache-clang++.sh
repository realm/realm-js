#!/bin/sh
if type -p /usr/local/bin/ccache >/dev/null 2>&1; then
  export CCACHE_MAXSIZE=10G
  export CCACHE_CPP2=true
  export CCACHE_HARDLINK=true
  export CCACHE_SLOPPINESS=file_macro,time_macros,include_file_mtime,include_file_ctime,file_stat_matches
  exec /usr/local/bin/ccache /usr/bin/clang++ "$@"
else
  exec clang++ "$@"
fi

