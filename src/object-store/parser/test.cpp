
#include "parser.hpp"

#include <vector>
#include <string>
#include <exception>
#include <iostream>

static std::vector<std::string> valid_queries = {
    "truepredicate",
    "falsepredicate",
    "TRUEPREDICATE",
    "FALSEPREDICATE",
    "truepredicate && truepredicate"
};

static std::vector<std::string> invalid_queries = {
    "predicate",
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

