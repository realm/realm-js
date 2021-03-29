#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include <vector>
#include "logger.hpp"
#include "common/object/jsc_object.hpp"

using Catch::Matchers::Contains;

TEST_CASE( "Testing Logger#get_level" ) {
    REQUIRE( realm::common::logger::Logger::get_level("all") == realm::common::logger::LoggerLevel::all );
    REQUIRE( realm::common::logger::Logger::get_level("debug") == realm::common::logger::LoggerLevel::debug );
    REQUIRE_THROWS_WITH(realm::common::logger::Logger::get_level("coffeebabe"), Contains("Bad log level"));
}


TEST_CASE( "Testing Class" ) {

} 
