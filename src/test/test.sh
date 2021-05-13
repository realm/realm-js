clang++ -g -std=c++17 -Wall -I catch.hpp -I test_bed.hpp -I ../ \
    -I ../../vendor/realm-core/src/ \
    -I includes/ \
    -I ../..//cmake-build-debug/vendor/realm-core/src/ \
    -I ../object-store/external/json \
    -framework Foundation -framework JavaScriptCore -o testing.o main.cpp catch.cpp \
    -mmacosx-version-min=11.2 \
    -fvisibility=hidden\
    $(find ../../build -name "librealm-dbg.a") \
    $(find ../../build -name "librealm-sync-dbg.a") \
    $(find ../../build -name "librealm-object-store-dbg.a") \
 #   && 

#./testing.o  
# missing realm::ConstLstIf
