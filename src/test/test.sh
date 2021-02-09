g++ -std=c++17 -Wall -I catch.hpp -I ../ -I ../../vendor/realm-core/src/realm/object-store/ \
    -I ../../vendor/realm-core/src/ \
    -o testing js_dictionary.cpp \
    core/src/realm/librealm-dbg.a \
    core/src/realm/sync/librealm-server-dbg.a \
    core/src/realm/sync/librealm-sync-dbg.a \
    && 

./testing  
# missing realm::ConstLstIf
