#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include <vector>
#include "logger.hpp"

using Catch::Matchers::Contains;

TEST_CASE( "Testing Logger#get_level" ) {
    REQUIRE( realm::common::Logger::get_level("all") == realm::common::LoggerLevel::all );
    REQUIRE( realm::common::Logger::get_level("debug") == realm::common::LoggerLevel::debug );
    REQUIRE_THROWS_WITH(realm::common::Logger::get_level("coffeebabe"), Contains("Bad log level"));
}
