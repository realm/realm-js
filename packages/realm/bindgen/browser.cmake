add_executable(realm-js-wasm)
target_link_options(realm-js-wasm PRIVATE -d -sALLOW_MEMORY_GROWTH=1 -sLLD_REPORT_UNDEFINED -sFETCH=1 -lembind -fwasm-exceptions -sEXPORT_ES6=1 -sWASM_BIGINT=1 -sENVIRONMENT=web --pre-js=../web_polyfill.js)

target_link_libraries(realm-js-wasm realm-js)
