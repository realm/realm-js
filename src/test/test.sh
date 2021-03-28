g++ -std=c++17 -Wall -I catch.hpp -I ../ -I ../object-store/src/ \
    -I ../../vendor/realm-mac-x64/include/ \
    -I ../object-store/external/json \
    -o testing logger.cpp \
    ../../vendor/realm-mac-x64/osx/librealm-dbg.a \
    ../../vendor/realm-mac-x64/osx/librealm-server-dbg.a \
    ../../vendor/realm-mac-x64/osx/librealm-sync-dbg.a \
    && 

./testing  
# missing realm::ConstLstIf
