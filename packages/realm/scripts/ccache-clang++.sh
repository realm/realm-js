#!/bin/sh
if command -v ccache &> /dev/null; then
# reference for xcode specific cacche settings: reactnative docs and ccache manpage
# https://reactnative.dev/docs/build-speed#xcode-specific-setup
# https://ccache.dev/manual/4.3.html
  export CCACHE_MAXSIZE=10G
  export CCACHE_CPP2=true
  export CCACHE_DIRECT=true
  export CCACHE_DEPEND=true
  export CCACHE_HARDLINK=true
  export CCACHE_FILECLONE=true
  export CCACHE_INODECACHE=true
  export CCACHE_SLOPPINESS=file_macro,time_macros,include_file_mtime,include_file_ctime,file_stat_matches,modules,ivfsoverlay,pch_defines,system_headers
  exec ccache clang++ "$@"
else
  exec clang++ "$@"
fi
