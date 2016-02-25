#include "catch.hpp"

#include "util/test_file.hpp"

#include "impl/realm_coordinator.hpp"
#include "impl/transact_log_handler.hpp"
#include "property.hpp"
#include "object_schema.hpp"
#include "schema.hpp"

#include <realm/commit_log.hpp>
#include <realm/group_shared.hpp>

using namespace realm;

TEST_CASE("Transaction log parsing") {
    InMemoryTestFile path;
    Realm::Config config = path;

    SECTION("schema change validation") {
        config.schema = std::make_unique<Schema>(Schema{
            {"table", "", {
                {"unindexed", PropertyTypeInt},
                {"indexed", PropertyTypeInt, "", false, true}
            }},
        });
        auto r = Realm::get_shared_realm(std::move(config));
        r->read_group();

        auto history = make_client_history(config.path);
        SharedGroup sg(*history, SharedGroup::durability_MemOnly);

        SECTION("adding a table is allowed") {
            WriteTransaction wt(sg);
            TableRef table = wt.add_table("new table");
            table->add_column(type_String, "new col");
            wt.commit();

            REQUIRE_NOTHROW(r->refresh());
        }

        SECTION("adding an index to an existing column is allowed") {
            WriteTransaction wt(sg);
            TableRef table = wt.get_table("class_table");
            table->add_search_index(0);
            wt.commit();

            REQUIRE_NOTHROW(r->refresh());
        }

        SECTION("removing an index from an existing column is allowed") {
            WriteTransaction wt(sg);
            TableRef table = wt.get_table("class_table");
            table->remove_search_index(1);
            wt.commit();

            REQUIRE_NOTHROW(r->refresh());
        }

        SECTION("adding a column to an existing table is not allowed (but eventually should be)") {
            WriteTransaction wt(sg);
            TableRef table = wt.get_table("class_table");
            table->add_column(type_String, "new col");
            wt.commit();

            REQUIRE_THROWS(r->refresh());
        }

        SECTION("removing a column is not allowed") {
            WriteTransaction wt(sg);
            TableRef table = wt.get_table("class_table");
            table->remove_column(1);
            wt.commit();

            REQUIRE_THROWS(r->refresh());
        }

        SECTION("removing a table is not allowed") {
            WriteTransaction wt(sg);
            wt.get_group().remove_table("class_table");
            wt.commit();

            REQUIRE_THROWS(r->refresh());
        }
    }
}
