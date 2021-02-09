#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include <vector>
#include "js_dictionary.hpp"

using Catch::Matchers::Contains;

TEST_CASE( "Testing DictionarySchema#Constructor" ) {
    realm::js::DictionarySchema schm {"string{}"};
    REQUIRE( schm.is_dictionary() == true);
}
