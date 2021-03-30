clear &&
g++ -std=c++17 -Wall -I catch.hpp -I test_bed.hpp -I ../ \
    -I ../../vendor/realm-core/src/ \
    -I ../..//cmake-build-debug/vendor/realm-core/src/ \
    -I ../object-store/external/json \
    -framework Foundation -framework JavaScriptCore -o testing main_testing.cpp catch.cpp \
    $(find ../../ -name "librealm-dbg.a") \
    $(find ../../cmake-build-debug -name "librealm-sync-dbg.a") \
    $(find ../../cmake-build-debug -name "librealm-object-store-dbg.a") \
    && 

./testing  
# missing realm::ConstLstIf
