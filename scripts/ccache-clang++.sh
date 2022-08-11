#!/bin/sh
if command -v ccache &> /dev/null; then
  export CCACHE_MAXSIZE=10G
  export CCACHE_CPP2=true
  export CCACHE_HARDLINK=true
  export CCACHE_SLOPPINESS=file_macro,time_macros,include_file_mtime,include_file_ctime,file_stat_matches
  exec ccache clang++ "$@"
else
  exec clang++ "$@"
fi
