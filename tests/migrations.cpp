#include "catch.hpp"

#include "util/test_file.hpp"

#include "object_schema.hpp"
#include "object_store.hpp"
#include "property.hpp"
#include "schema.hpp"

#include <realm/group.hpp>
#include <realm/table.hpp>

using namespace realm;

#define VERIFY_SCHEMA(r) do { \
    for (auto&& object_schema : (r).schema()) { \
        auto table = ObjectStore::table_for_object_type((r).read_group(), object_schema.name); \
        REQUIRE(table); \
        CAPTURE(object_schema.name) \
        for (auto&& prop : object_schema.persisted_properties) { \
            size_t col = table->get_column_index(prop.name); \
            CAPTURE(prop.name) \
            REQUIRE(col != npos); \
            REQUIRE(col == prop.table_column); \
            REQUIRE(table->get_column_type(col) == static_cast<int>(prop.type)); \
            REQUIRE(table->has_search_index(col) == prop.requires_index()); \
        } \
    } \
} while (0)

#define REQUIRE_UPDATE_SUCCEEDS(r, s, version) do { \
    REQUIRE_NOTHROW((r).update_schema(s, version)); \
    VERIFY_SCHEMA(r); \
    REQUIRE((r).schema() == s); \
} while (0)

#define REQUIRE_NO_MIGRATION_NEEDED(r, schema1, schema2) do { \
    REQUIRE_UPDATE_SUCCEEDS(r, schema1, 0); \
    REQUIRE_UPDATE_SUCCEEDS(r, schema2, 0); \
} while (0)

#define REQUIRE_MIGRATION_NEEDED(r, schema1, schema2) do { \
    REQUIRE_UPDATE_SUCCEEDS(r, schema1, 0); \
    REQUIRE_THROWS((r).update_schema(schema2)); \
    REQUIRE((r).schema() == schema1); \
    REQUIRE_UPDATE_SUCCEEDS(r, schema2, 1); \
} while (0)

namespace {
// Helper functions for modifying Schema objects, mostly for the sake of making
// it clear what exactly is different about the 2+ schema objects used in
// various tests
Schema add_table(Schema const& schema, ObjectSchema object_schema)
{
    std::vector<ObjectSchema> new_schema(schema.begin(), schema.end());
    new_schema.push_back(std::move(object_schema));
    return new_schema;
}

Schema remove_table(Schema const& schema, StringData object_name)
{
    std::vector<ObjectSchema> new_schema;
    std::remove_copy_if(schema.begin(), schema.end(), std::back_inserter(new_schema),
                        [&](auto&& object_schema) { return object_schema.name == object_name; });
    return new_schema;
}

Schema add_property(Schema schema, StringData object_name, Property property)
{
    schema.find(object_name)->persisted_properties.push_back(std::move(property));
    return schema;
}

Schema remove_property(Schema schema, StringData object_name, StringData property_name)
{
    auto& properties = schema.find(object_name)->persisted_properties;
    properties.erase(find_if(begin(properties), end(properties),
                             [&](auto&& prop) { return prop.name == property_name; }));
    return schema;
}

Schema set_indexed(Schema schema, StringData object_name, StringData property_name, bool value)
{
    schema.find(object_name)->property_for_name(property_name)->is_indexed = value;
    return schema;
}

Schema set_optional(Schema schema, StringData object_name, StringData property_name, bool value)
{
    schema.find(object_name)->property_for_name(property_name)->is_nullable = value;
    return schema;
}

Schema set_type(Schema schema, StringData object_name, StringData property_name, PropertyType value)
{
    schema.find(object_name)->property_for_name(property_name)->type = value;
    return schema;
}

Schema set_target(Schema schema, StringData object_name, StringData property_name, StringData new_target)
{
    schema.find(object_name)->property_for_name(property_name)->object_type = new_target;
    return schema;
}

Schema set_primary_key(Schema schema, StringData object_name, StringData new_primary_property)
{
    auto& object_schema = *schema.find(object_name);
    if (auto old_primary = object_schema.primary_key_property()) {
        old_primary->is_primary = false;
    }
    if (new_primary_property.size()) {
        object_schema.property_for_name(new_primary_property)->is_primary = true;
    }
    object_schema.primary_key = new_primary_property;
    return schema;
}
} // anonymous namespace

TEST_CASE("[migration] Automatic") {
    InMemoryTestFile config;
    config.automatic_change_notifications = false;

    SECTION("no migration required") {
        SECTION("add object schema") {
            auto realm = Realm::get_shared_realm(config);

            Schema schema1 = {};
            Schema schema2 = add_table(schema1, {"object", {
                {"value", PropertyType::Int, "", "", false, false, false}
            }});
            Schema schema3 = add_table(schema2, {"object2", {
                {"value", PropertyType::Int, "", "", false, false, false}
            }});
            REQUIRE_UPDATE_SUCCEEDS(*realm, schema1, 0);
            REQUIRE_UPDATE_SUCCEEDS(*realm, schema2, 0);
            REQUIRE_UPDATE_SUCCEEDS(*realm, schema3, 0);
        }

        SECTION("remove object schema") {
            auto realm = Realm::get_shared_realm(config);

            Schema schema1 = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false}
                }},
                {"object2", {
                    {"value", PropertyType::Int, "", "", false, false, false}
                }},
            };
            Schema schema2 = remove_table(schema1, "object2");
            Schema schema3 = remove_table(schema2, "object");
            REQUIRE_UPDATE_SUCCEEDS(*realm, schema3, 0);
            REQUIRE_UPDATE_SUCCEEDS(*realm, schema2, 0);
            REQUIRE_UPDATE_SUCCEEDS(*realm, schema1, 0);
        }

        SECTION("add index") {
            auto realm = Realm::get_shared_realm(config);
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false}
                }},
            };
            REQUIRE_NO_MIGRATION_NEEDED(*realm, schema, set_indexed(schema, "object", "value", true));
        }

        SECTION("remove index") {
            auto realm = Realm::get_shared_realm(config);
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, true, false}
                }},
            };
            REQUIRE_NO_MIGRATION_NEEDED(*realm, schema, set_indexed(schema, "object", "value", false));
        }

        SECTION("reordering properties") {
            auto realm = Realm::get_shared_realm(config);

            Schema schema1 = {
                {"object", {
                    {"col1", PropertyType::Int, "", "", false, false, false},
                    {"col2", PropertyType::Int, "", "", false, false, false},
                }},
            };
            Schema schema2 = {
                {"object", {
                    {"col2", PropertyType::Int, "", "", false, false, false},
                    {"col1", PropertyType::Int, "", "", false, false, false},
                }},
            };
            REQUIRE_NO_MIGRATION_NEEDED(*realm, schema1, schema2);
        }
    }

    SECTION("migration required") {
        SECTION("add property to existing object schema") {
            auto realm = Realm::get_shared_realm(config);

            Schema schema1 = {
                {"object", {
                    {"col1", PropertyType::Int, "", "", false, false, false},
                }},
            };
            auto schema2 = add_property(schema1, "object",
                                        {"col2", PropertyType::Int, "", "", false, false, false});
            REQUIRE_MIGRATION_NEEDED(*realm, schema1, schema2);
        }

        SECTION("remove property from existing object schema") {
            auto realm = Realm::get_shared_realm(config);
            Schema schema = {
                {"object", {
                    {"col1", PropertyType::Int, "", "", false, false, false},
                    {"col2", PropertyType::Int, "", "", false, false, false},
                }},
            };
            REQUIRE_MIGRATION_NEEDED(*realm, schema, remove_property(schema, "object", "col2"));
        }

        SECTION("change property type") {
            auto realm = Realm::get_shared_realm(config);
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            REQUIRE_MIGRATION_NEEDED(*realm, schema, set_type(schema, "object", "value", PropertyType::Float));
        }

        SECTION("make property nullable") {
            auto realm = Realm::get_shared_realm(config);

            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            REQUIRE_MIGRATION_NEEDED(*realm, schema, set_optional(schema, "object", "value", true));
        }

        SECTION("make property required") {
            auto realm = Realm::get_shared_realm(config);

            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, true},
                }},
            };
            REQUIRE_MIGRATION_NEEDED(*realm, schema, set_optional(schema, "object", "value", false));
        }

        SECTION("change link target") {
            auto realm = Realm::get_shared_realm(config);

            Schema schema = {
                {"target 1", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
                {"target 2", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
                {"origin", {
                    {"value", PropertyType::Object, "target 1", "", false, false, true},
                }},
            };
            REQUIRE_MIGRATION_NEEDED(*realm, schema, set_target(schema, "origin", "value", "target 2"));
        }

        SECTION("add pk") {
            auto realm = Realm::get_shared_realm(config);

            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            REQUIRE_MIGRATION_NEEDED(*realm, schema, set_primary_key(schema, "object", "value"));
        }

        SECTION("remove pk") {
            auto realm = Realm::get_shared_realm(config);

            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", true, false, false},
                }},
            };
            REQUIRE_MIGRATION_NEEDED(*realm, schema, set_primary_key(schema, "object", ""));
        }
    }

    SECTION("migration block invocations") {
        SECTION("not called for initial creation of schema") {
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema, 5, [](SharedRealm, SharedRealm, Schema&) { REQUIRE(false); });
        }

        SECTION("not called when schema version is unchanged even if there are schema changes") {
            Schema schema1 = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            Schema schema2 = add_table(schema1, {"second object", {
                {"value", PropertyType::Int, "", "", false, false, false},
            }});
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema1, 1);
            realm->update_schema(schema2, 1, [](SharedRealm, SharedRealm, Schema&) { REQUIRE(false); });
        }

        SECTION("called when schema version is bumped even if there are no schema changes") {
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema);
            bool called = false;
            realm->update_schema(schema, 5, [&](SharedRealm, SharedRealm, Schema&) { called = true; });
            REQUIRE(called);
        }
    }

    SECTION("migration errors") {
        SECTION("schema version cannot go down") {
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema({}, 1);
            realm->update_schema({}, 2);
            REQUIRE_THROWS(realm->update_schema({}, 0));
        }

        SECTION("insert duplicate keys for existing PK during migration") {
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", true, false, false},
                }},
            };
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema, 1);
            REQUIRE_THROWS(realm->update_schema(schema, 2, [](SharedRealm, SharedRealm realm, Schema&) {
                auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
                table->add_empty_row(2);
            }));
        }

        SECTION("add pk to existing table with duplicate keys") {
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema, 1);

            auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
            table->add_empty_row(2);

            schema = set_primary_key(schema, "object", "value");
            REQUIRE_THROWS(realm->update_schema(schema, 2, nullptr));
        }

        SECTION("throwing an exception from migration function rolls back all changes") {
            Schema schema1 = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            Schema schema2 = add_property(schema1, "object",
                                          {"value2", PropertyType::Int, "", "", false, false, false});
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema1, 1);

            REQUIRE_THROWS(realm->update_schema(schema2, 2, [](SharedRealm, SharedRealm realm, Schema&) {
                auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
                table->add_empty_row();
                throw 5;
            }));

            auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
            REQUIRE(table->size() == 0);
            REQUIRE(realm->schema_version() == 1);
            REQUIRE(realm->schema() == schema1);
        }
    }

    SECTION("valid migrations") {
        SECTION("changing all columns does not lose row count") {
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema, 1);

            realm->begin_transaction();
            auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
            table->add_empty_row(10);
            realm->commit_transaction();

            schema = set_type(schema, "object", "value", PropertyType::Float);
            realm->update_schema(schema, 2);
            REQUIRE(table->size() == 10);
        }

        SECTION("values for required properties are copied when converitng to nullable") {
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema, 1);

            realm->begin_transaction();
            auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
            table->add_empty_row(10);
            for (size_t i = 0; i < 10; ++i)
                table->set_int(0, i, i);
            realm->commit_transaction();

            realm->update_schema(set_optional(schema, "object", "value", true), 2);
            for (size_t i = 0; i < 10; ++i)
                REQUIRE(table->get_int(0, i) == i);
        }

        SECTION("values for nullable properties are discarded when converitng to required") {
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, true},
                }},
            };
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema, 1);

            realm->begin_transaction();
            auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
            table->add_empty_row(10);
            for (size_t i = 0; i < 10; ++i)
                table->set_int(0, i, i);
            realm->commit_transaction();

            realm->update_schema(set_optional(schema, "object", "value", false), 2);
            for (size_t i = 0; i < 10; ++i)
                REQUIRE(table->get_int(0, i) == 0);
        }

        SECTION("deleting table removed from the schema deletes it") {
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, true},
                }},
            };
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema, 1);

            realm->update_schema({}, 2, [](SharedRealm, SharedRealm realm, Schema&) {
                ObjectStore::delete_data_for_object(realm->read_group(), "object");
            });
            REQUIRE_FALSE(ObjectStore::table_for_object_type(realm->read_group(), "object"));
        }

        SECTION("deleting table still in the schema recreates it with no rows") {
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, true},
                }},
            };
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema, 1);

            realm->begin_transaction();
            ObjectStore::table_for_object_type(realm->read_group(), "object")->add_empty_row();
            realm->commit_transaction();

            realm->update_schema(schema, 2, [](SharedRealm, SharedRealm realm, Schema&) {
                ObjectStore::delete_data_for_object(realm->read_group(), "object");
            });
            auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
            REQUIRE(table);
            REQUIRE(table->size() == 0);
        }

        SECTION("deleting table which doesn't exist does nothing") {
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, true},
                }},
            };
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(schema, 1);

            REQUIRE_NOTHROW(realm->update_schema({}, 2, [](SharedRealm, SharedRealm realm, Schema&) {
                ObjectStore::delete_data_for_object(realm->read_group(), "foo");
            }));
        }
    }

    SECTION("schema correctness during migration") {
        InMemoryTestFile config;
        config.schema_mode = SchemaMode::Automatic;
        auto realm = Realm::get_shared_realm(config);

        Schema schema = {
            {"object", {
                {"pk", PropertyType::Int, "", "", true, false, false},
                {"value", PropertyType::Int, "", "", false, true, false},
                {"optional", PropertyType::Int, "", "", false, false, true},
            }},
            {"link origin", {
                {"not a pk", PropertyType::Int, "", "", false, false, false},
                {"object", PropertyType::Object, "object", "", false, false, true},
                {"array", PropertyType::Array, "object", "", false, false, false},
            }}
        };
        realm->update_schema(schema);

#define VERIFY_SCHEMA_IN_MIGRATION(target_schema) do { \
    Schema new_schema = (target_schema); \
    realm->update_schema(new_schema, 1, [&](SharedRealm old_realm, SharedRealm new_realm, Schema&) { \
        REQUIRE(old_realm->schema_version() == 0); \
        REQUIRE(old_realm->schema() == schema); \
        REQUIRE(new_realm->schema_version() == 1); \
        REQUIRE(new_realm->schema() == new_schema); \
        VERIFY_SCHEMA(*old_realm); \
        VERIFY_SCHEMA(*new_realm); \
    }); \
} while (false)

        SECTION("add new table") {
            VERIFY_SCHEMA_IN_MIGRATION(add_table(schema, {"new table", {
                {"value", PropertyType::Int, "", "", false, false, false},
            }}));
        }
        SECTION("add property to table") {
            VERIFY_SCHEMA_IN_MIGRATION(add_property(schema, "object", {"new", PropertyType::Int, "", "", false, false, false}));
        }
        SECTION("remove property from table") {
            VERIFY_SCHEMA_IN_MIGRATION(remove_property(schema, "object", "value"));
        }
        SECTION("add primary key to table") {
            VERIFY_SCHEMA_IN_MIGRATION(set_primary_key(schema, "link origin", "not a pk"));
        }
        SECTION("remove primary key from table") {
            VERIFY_SCHEMA_IN_MIGRATION(set_primary_key(schema, "object", ""));
        }
        SECTION("change primary key") {
            VERIFY_SCHEMA_IN_MIGRATION(set_primary_key(schema, "object", "value"));
        }
        SECTION("change property type") {
            VERIFY_SCHEMA_IN_MIGRATION(set_type(schema, "object", "value", PropertyType::Date));
        }
        SECTION("change link target") {
            VERIFY_SCHEMA_IN_MIGRATION(set_target(schema, "link origin", "object", "link origin"));
        }
        SECTION("change linklist target") {
            VERIFY_SCHEMA_IN_MIGRATION(set_target(schema, "link origin", "array", "link origin"));
        }
        SECTION("make property optional") {
            VERIFY_SCHEMA_IN_MIGRATION(set_optional(schema, "object", "value", true));
        }
        SECTION("make property required") {
            VERIFY_SCHEMA_IN_MIGRATION(set_optional(schema, "object", "optional", false));
        }
        SECTION("add index") {
            VERIFY_SCHEMA_IN_MIGRATION(set_indexed(schema, "object", "optional", true));
        }
        SECTION("remove index") {
            VERIFY_SCHEMA_IN_MIGRATION(set_indexed(schema, "object", "value", false));
        }
        SECTION("reorder properties") {
            auto schema2 = schema;
            auto& properties = schema2.find("object")->persisted_properties;
            std::swap(properties[0], properties[1]);
            VERIFY_SCHEMA_IN_MIGRATION(schema2);
        }
    }
}

TEST_CASE("[migration] ReadOnly") {
    TestFile config;

    auto realm_with_schema = [&](Schema schema) {
        {
            auto realm = Realm::get_shared_realm(config);
            realm->update_schema(std::move(schema));
        }
        config.schema_mode = SchemaMode::ReadOnly;
        return Realm::get_shared_realm(config);
    };

    SECTION("allowed schema mismatches") {
        SECTION("index") {
            auto realm = realm_with_schema({
                {"object", {
                    {"indexed", PropertyType::Int, "", "", false, true, false},
                    {"unindexed", PropertyType::Int, "", "", false, false, false},
                }},
            });
            Schema schema = {
                {"object", {
                    {"indexed", PropertyType::Int, "", "", false, false, false},
                    {"unindexed", PropertyType::Int, "", "", false, true, false},
                }},
            };
            REQUIRE_NOTHROW(realm->update_schema(schema));
            REQUIRE(realm->schema() == schema);
        }

        SECTION("missing tables") {
            auto realm = realm_with_schema({
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            });
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
                {"second object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            REQUIRE_NOTHROW(realm->update_schema(schema));
            REQUIRE(realm->schema() == schema);
        }
    }

    SECTION("disallowed mismatches") {
        SECTION("add column") {
            auto realm = realm_with_schema({
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            });
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                    {"value 2", PropertyType::Int, "", "", false, false, false},
                }},
            };
            REQUIRE_THROWS(realm->update_schema(schema));
        }

        SECTION("bump schema version") {
            Schema schema = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            auto realm = realm_with_schema(schema);
            REQUIRE_THROWS(realm->update_schema(schema, 1));
        }
    }
}

TEST_CASE("[migration] ResetFile") {
    TestFile config;
    config.schema_mode = SchemaMode::ResetFile;

    Schema initial_schema = {
        {"object", {
            {"value", PropertyType::Int, "", "", false, false, false},
        }},
    };

    {
        auto realm = Realm::get_shared_realm(config);
        realm->update_schema(initial_schema);
        realm->begin_transaction();
        ObjectStore::table_for_object_type(realm->read_group(), "object")->add_empty_row();
        realm->commit_transaction();
    }
    auto realm = Realm::get_shared_realm(config);

    SECTION("file is reset when schema version increases") {
        realm->update_schema(initial_schema, 1);
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->size() == 0);
    }

    SECTION("file is reset when an existing table is modified") {
        realm->update_schema(add_property(initial_schema, "object",
                                          {"value 2", PropertyType::Int, "", "", false, false, false}));
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->size() == 0);
    }

    SECTION("file is not reset when adding a new table") {
        realm->update_schema(add_table(initial_schema, {"object 2", {
            {"value", PropertyType::Int, "", "", false, false, false},
        }}));
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->size() == 1);
    }

    SECTION("file is not reset when adding an index") {
        realm->update_schema(set_indexed(initial_schema, "object", "value", true));
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->size() == 1);
    }

    SECTION("file is not reset when removing an index") {
        realm->update_schema(set_indexed(initial_schema, "object", "value", true));
        realm->update_schema(initial_schema);
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->size() == 1);
    }
}
