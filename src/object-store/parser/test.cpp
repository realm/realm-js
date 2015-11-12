
#include "parser.hpp"

#include <vector>
#include <string>
#include <exception>
#include <iostream>

static std::vector<std::string> valid_queries = {
    // true/false predicates
    "truepredicate",
    "falsepredicate",
    "TRUEPREDICATE",
    "FALSEPREDICATE",

    // characters/strings
    "\"\" = ''",
    "'azAZ09/ :()[]{}<>,.^@-+=*&~`' = '\\\" \\' \\\\ \\/ \\b \\f \\n \\r \\t \\0'",
    "\"azAZ09/\" = \"\\\" \\' \\\\ \\/ \\b \\f \\n \\r \\t \\0\"",
    "'\\uffFf' = '\\u0020'",
    "'\\u01111' = 'asdf\\u0111asdf'",

    // numbers, bools, keypaths
    "-1 = 12",
    "0 = 001",
    "0x0 = -0X398235fcAb",
    "10. = -.034",
    "10.0 = 5.034",
    "true = false",
    "_ = a",
    "_a = _.aZ",
    "a09._br.z = __-__.Z-9",
};

static std::vector<std::string> invalid_queries = {
    "predicate",
    "'\\a' = ''",        // invalid escape

    // invalid unicode
    "'\\u0' = ''",

    // invalid strings
    "\"' = ''",
    "\" = ''",
    "' = ''",

    // invalid numbers, bools, keypaths
    "03a = 1",
    "1..0 = 1",
    "1.0. = 1",
    "0x = 1",
    "truey = false",

    "truepredicate &&",
    "truepredicate & truepredicate",
};

int main( int argc, char ** argv )
{
    for (auto &query : valid_queries) {
        std::cout << "valid query: " << query << std::endl;
        try {
            realm::parser::parse(query);
        } catch (std::exception &ex) {
            std::cout << "FAILURE - " << ex.what() << std::endl;
        }
    }

    for (auto &query : invalid_queries) {
        std::cout << "invalid query: " << query << std::endl;
        try {
            realm::parser::parse(query);
        } catch (std::exception &ex) {
            // std::cout << "message: " << ex.what() << std::endl;
            continue;
        }
        std::cout << "FAILURE - query should throw an exception" << std::endl;
    }
}

