add_executable(fuzzer
  command_file.hpp
  command_file.cpp
  fuzzer.cpp)
target_link_libraries(fuzzer realm-object-store)
