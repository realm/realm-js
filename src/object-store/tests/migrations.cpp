////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

#include "catch.hpp"

#include "util/test_file.hpp"

#include "object_schema.hpp"
#include "object_store.hpp"
#include "property.hpp"
#include "schema.hpp"

#include <realm/descriptor.hpp>
#include <realm/group.hpp>
#include <realm/table.hpp>

using namespace realm;

#define VERIFY_SCHEMA(r) do { \
    for (auto&& object_schema : (r).schema()) { \
        auto table = ObjectStore::table_for_object_type((r).read_group(), object_schema.name); \
        REQUIRE(table); \
        CAPTURE(object_schema.name) \
        std::string primary_key = ObjectStore::get_primary_key_for_object((r).read_group(), object_schema.name); \
        REQUIRE(primary_key == object_schema.primary_key); \
        for (auto&& prop : object_schema.persisted_properties) { \
            size_t col = table->get_column_index(prop.name); \
            CAPTURE(prop.name) \
            REQUIRE(col != npos); \
            REQUIRE(col == prop.table_column); \
            REQUIRE(table->get_column_type(col) == static_cast<int>(prop.type)); \
            REQUIRE(table->has_search_index(col) == prop.requires_index()); \
            REQUIRE(prop.is_primary == (prop.name == primary_key)); \
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

TEST_CASE("migration: Automatic") {
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

    SECTION("property renaming") {
        InMemoryTestFile config;
        config.schema_mode = SchemaMode::Automatic;
        auto realm = Realm::get_shared_realm(config);

        struct Rename {
            StringData object_type;
            StringData old_name;
            StringData new_name;
        };

        auto apply_renames = [&](std::initializer_list<Rename> renames) -> Realm::MigrationFunction {
            return [=](SharedRealm, SharedRealm realm, Schema& schema) {
                for (auto rename : renames) {
                    ObjectStore::rename_property(realm->read_group(), schema,
                                                 rename.object_type, rename.old_name, rename.new_name);
                }
            };
        };

#define FAILED_RENAME(old_schema, new_schema, error, ...) do { \
    realm->update_schema(old_schema, 1); \
    REQUIRE_THROWS_WITH(realm->update_schema(new_schema, 2, apply_renames({__VA_ARGS__})), error); \
} while (false)

        Schema schema = {
            {"object", {
                {"value", PropertyType::Int, "", "", false, false, false},
            }},
        };

        SECTION("table does not exist in old schema") {
            auto schema2 = add_table(schema, {"object 2", {
                {"value 2", PropertyType::Int, "", "", false, false, false},
            }});
            FAILED_RENAME(schema, schema2,
                          "Cannot rename property 'object 2.value' because it does not exist.",
                          {"object 2", "value", "value 2"});
        }

        SECTION("table does not exist in new schema") {
            FAILED_RENAME(schema, {},
                          "Cannot rename properties for type 'object' because it has been removed from the Realm.",
                          {"object", "value", "value 2"});
        }

        SECTION("property does not exist in old schema") {
            auto schema2 = add_property(schema, "object", {"new", PropertyType::Int, "", "", false, false, false});
            FAILED_RENAME(schema, schema2,
                          "Cannot rename property 'object.nonexistent' because it does not exist.",
                          {"object", "nonexistent", "new"});
        }

        auto rename_value = [](Schema schema) {
            schema.find("object")->property_for_name("value")->name = "new";
            return schema;
        };

        SECTION("property does not exist in new schema") {
            FAILED_RENAME(schema, rename_value(schema),
                          "Renamed property 'object.nonexistent' does not exist.",
                          {"object", "value", "nonexistent"});
        }

        SECTION("source propety still exists in the new schema") {
            auto schema2 = add_property(schema, "object",
                                        {"new", PropertyType::Int, "", "", false, false, false});
            FAILED_RENAME(schema, schema2,
                          "Cannot rename property 'object.value' to 'new' because the source property still exists.",
                          {"object", "value", "new"});
        }

        SECTION("different type") {
            auto schema2 = rename_value(set_type(schema, "object", "value", PropertyType::Date));
            FAILED_RENAME(schema, schema2,
                          "Cannot rename property 'object.value' to 'new' because it would change from type 'int' to 'date'.",
                          {"object", "value", "new"});
        }

        SECTION("different link targets") {
            Schema schema = {
                {"target", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
                {"origin", {
                    {"link", PropertyType::Object, "target", "", false, false, true},
                }},
            };
            auto schema2 = set_target(schema, "origin", "link", "origin");
            schema2.find("origin")->property_for_name("link")->name = "new";
            FAILED_RENAME(schema, schema2,
                          "Cannot rename property 'origin.link' to 'new' because it would change from type '<target>' to '<origin>'.",
                          {"origin", "link", "new"});
        }

        SECTION("different linklist targets") {
            Schema schema = {
                {"target", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
                {"origin", {
                    {"link", PropertyType::Array, "target", "", false, false, false},
                }},
            };
            auto schema2 = set_target(schema, "origin", "link", "origin");
            schema2.find("origin")->property_for_name("link")->name = "new";
            FAILED_RENAME(schema, schema2,
                          "Cannot rename property 'origin.link' to 'new' because it would change from type 'array<target>' to 'array<origin>'.",
                          {"origin", "link", "new"});
        }

        SECTION("make required") {
            schema = set_optional(schema, "object", "value", true);
            auto schema2 = rename_value(set_optional(schema, "object", "value", false));
            FAILED_RENAME(schema, schema2,
                          "Cannot rename property 'object.value' to 'new' because it would change from optional to required.",
                          {"object", "value", "new"});
        }

        auto init = [&](Schema const& old_schema) {
            realm->update_schema(old_schema, 1);
            realm->begin_transaction();
            auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
            table->add_empty_row();
            table->set_int(0, 0, 10);
            realm->commit_transaction();
        };

#define SUCCESSFUL_RENAME(old_schema, new_schema, ...) do { \
    init(old_schema); \
    REQUIRE_NOTHROW(realm->update_schema(new_schema, 2, apply_renames({__VA_ARGS__}))); \
    REQUIRE(realm->schema() == new_schema); \
    VERIFY_SCHEMA(*realm); \
    REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->get_int(0, 0) == 10); \
} while (false)

        SECTION("basic valid rename") {
            auto schema2 = rename_value(schema);
            SUCCESSFUL_RENAME(schema, schema2,
                              {"object", "value", "new"});
        }

        SECTION("chained rename") {
            auto schema2 = rename_value(schema);
            SUCCESSFUL_RENAME(schema, schema2,
                              {"object", "value", "a"},
                              {"object", "a", "b"},
                              {"object", "b", "new"});
        }

        SECTION("old is pk, new is not") {
            auto schema2 = rename_value(schema);
            schema = set_primary_key(schema, "object", "value");
            SUCCESSFUL_RENAME(schema, schema2, {"object", "value", "new"});
        }

        SECTION("new is pk, old is not") {
            auto schema2 = set_primary_key(rename_value(schema), "object", "new");
            SUCCESSFUL_RENAME(schema, schema2, {"object", "value", "new"});
        }

        SECTION("both are pk") {
            schema = set_primary_key(schema, "object", "value");
            auto schema2 = set_primary_key(rename_value(schema), "object", "new");
            SUCCESSFUL_RENAME(schema, schema2, {"object", "value", "new"});
        }

        SECTION("make optional") {
            auto schema2 = rename_value(set_optional(schema, "object", "value", true));
            SUCCESSFUL_RENAME(schema, schema2,
                              {"object", "value", "new"});
        }

        SECTION("add index") {
            auto schema2 = rename_value(set_indexed(schema, "object", "value", true));
            SUCCESSFUL_RENAME(schema, schema2, {"object", "value", "new"});
        }

        SECTION("remove index") {
            auto schema2 = rename_value(schema);
            schema = set_indexed(schema, "object", "value", true);
            SUCCESSFUL_RENAME(schema, schema2, {"object", "value", "new"});
        }
    }
}

TEST_CASE("migration: ReadOnly") {
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

            for (auto& object_schema : realm->schema()) {
                for (size_t i = 0; i < object_schema.persisted_properties.size(); ++i) {
                    REQUIRE(i == object_schema.persisted_properties[i].table_column);
                }
            }
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

            auto object_schema = realm->schema().find("object");
            REQUIRE(object_schema->persisted_properties.size() == 1);
            REQUIRE(object_schema->persisted_properties[0].table_column == 0);

            object_schema = realm->schema().find("second object");
            REQUIRE(object_schema->persisted_properties.size() == 1);
            REQUIRE(object_schema->persisted_properties[0].table_column == size_t(-1));
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

TEST_CASE("migration: ResetFile") {
    TestFile config;
    config.schema_mode = SchemaMode::ResetFile;

    Schema schema = {
        {"object", {
            {"value", PropertyType::Int, "", "", false, false, false},
        }},
    };

    {
        auto realm = Realm::get_shared_realm(config);
        realm->update_schema(schema);
        realm->begin_transaction();
        ObjectStore::table_for_object_type(realm->read_group(), "object")->add_empty_row();
        realm->commit_transaction();
    }
    auto realm = Realm::get_shared_realm(config);

    SECTION("file is reset when schema version increases") {
        realm->update_schema(schema, 1);
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->size() == 0);
    }

    SECTION("file is reset when an existing table is modified") {
        realm->update_schema(add_property(schema, "object",
                                          {"value 2", PropertyType::Int, "", "", false, false, false}));
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->size() == 0);
    }

    SECTION("file is not reset when adding a new table") {
        realm->update_schema(add_table(schema, {"object 2", {
            {"value", PropertyType::Int, "", "", false, false, false},
        }}));
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->size() == 1);
    }

    SECTION("file is not reset when adding an index") {
        realm->update_schema(set_indexed(schema, "object", "value", true));
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->size() == 1);
    }

    SECTION("file is not reset when removing an index") {
        realm->update_schema(set_indexed(schema, "object", "value", true));
        realm->update_schema(schema);
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->size() == 1);
    }
}

TEST_CASE("migration: Additive") {
    InMemoryTestFile config;
    config.schema_mode = SchemaMode::Additive;
    config.cache = false;
    auto realm = Realm::get_shared_realm(config);

    Schema schema = {
        {"object", {
            {"value", PropertyType::Int, "", "", false, true, false},
            {"value 2", PropertyType::Int, "", "", false, false, true},
        }},
    };
    realm->update_schema(schema);

    SECTION("can add new properties to existing tables") {
        REQUIRE_NOTHROW(realm->update_schema(add_property(schema, "object",
                                                          {"value 3", PropertyType::Int, "", "", false, false, false})));
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->get_column_count() == 3);
    }

    SECTION("can add new tables") {
        REQUIRE_NOTHROW(realm->update_schema(add_table(schema, {"object 2", {
            {"value", PropertyType::Int, "", "", false, false, false},
        }})));
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object"));
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object 2"));
    }

    SECTION("indexes are updated when schema version is bumped") {
        auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
        REQUIRE(table->has_search_index(0));
        REQUIRE(!table->has_search_index(1));

        REQUIRE_NOTHROW(realm->update_schema(set_indexed(schema, "object", "value", false), 1));
        REQUIRE(!table->has_search_index(0));

        REQUIRE_NOTHROW(realm->update_schema(set_indexed(schema, "object", "value 2", true), 2));
        REQUIRE(table->has_search_index(1));
    }

    SECTION("indexes are not updated when schema version is not bumped") {
        auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
        REQUIRE(table->has_search_index(0));
        REQUIRE(!table->has_search_index(1));

        REQUIRE_NOTHROW(realm->update_schema(set_indexed(schema, "object", "value", false)));
        REQUIRE(table->has_search_index(0));

        REQUIRE_NOTHROW(realm->update_schema(set_indexed(schema, "object", "value 2", true)));
        REQUIRE(!table->has_search_index(1));
    }

    SECTION("can remove properties from existing tables, but column is not removed") {
        auto table = ObjectStore::table_for_object_type(realm->read_group(), "object");
        REQUIRE_NOTHROW(realm->update_schema(remove_property(schema, "object", "value")));
        REQUIRE(ObjectStore::table_for_object_type(realm->read_group(), "object")->get_column_count() == 2);
        auto const& properties = realm->schema().find("object")->persisted_properties;
        REQUIRE(properties.size() == 1);
        REQUIRE(properties[0].table_column == 1);
    }

    SECTION("cannot change existing property types") {
        REQUIRE_THROWS(realm->update_schema(set_type(schema, "object", "value", PropertyType::Float)));
    }

    SECTION("cannot change existing property nullability") {
        REQUIRE_THROWS(realm->update_schema(set_optional(schema, "object", "value", true)));
        REQUIRE_THROWS(realm->update_schema(set_optional(schema, "object", "value 2", false)));
    }

    SECTION("cannot change existing link targets") {
        REQUIRE_NOTHROW(realm->update_schema(add_table(schema, {"object 2", {
            {"link", PropertyType::Object, "object", "", false, false, true},
        }})));
        REQUIRE_THROWS(realm->update_schema(set_target(realm->schema(), "object 2", "link", "object 2")));
    }

    SECTION("cannot change primary keys") {
        REQUIRE_THROWS(realm->update_schema(set_primary_key(schema, "object", "value")));

        REQUIRE_NOTHROW(realm->update_schema(add_table(schema, {"object 2", {
            {"pk", PropertyType::Int, "", "", true, false, false},
        }})));

        REQUIRE_THROWS(realm->update_schema(set_primary_key(realm->schema(), "object 2", "")));
    }

    SECTION("schema version is allowed to go down") {
        REQUIRE_NOTHROW(realm->update_schema(schema, 1));
        REQUIRE(realm->schema_version() == 1);
        REQUIRE_NOTHROW(realm->update_schema(schema, 0));
        REQUIRE(realm->schema_version() == 1);
    }

    SECTION("migration function is not used") {
        REQUIRE_NOTHROW(realm->update_schema(schema, 1,
                                             [&](SharedRealm, SharedRealm, Schema&) { REQUIRE(false); }));
    }

    SECTION("add new columns at end from different SG") {
        auto realm2 = Realm::get_shared_realm(config);
        auto& group = realm2->read_group();
        realm2->begin_transaction();
        auto table = ObjectStore::table_for_object_type(group, "object");
        table->add_column(type_Int, "new column");
        realm2->commit_transaction();

        REQUIRE_NOTHROW(realm->refresh());
        REQUIRE(realm->schema() == schema);
        REQUIRE(realm->schema().find("object")->persisted_properties[0].table_column == 0);
        REQUIRE(realm->schema().find("object")->persisted_properties[1].table_column == 1);
    }

    SECTION("add new columns at beginning from different SG") {
        auto realm2 = Realm::get_shared_realm(config);
        auto& group = realm2->read_group();
        realm2->begin_transaction();
        auto table = ObjectStore::table_for_object_type(group, "object");
        table->insert_column(0, type_Int, "new column");
        realm2->commit_transaction();

        REQUIRE_NOTHROW(realm->refresh());
        REQUIRE(realm->schema() == schema);
        REQUIRE(realm->schema().find("object")->persisted_properties[0].table_column == 1);
        REQUIRE(realm->schema().find("object")->persisted_properties[1].table_column == 2);
    }

    SECTION("rearrange columns at beginning from different SG") {
        auto realm2 = Realm::get_shared_realm(config);
        auto& group = realm2->read_group();
        realm2->begin_transaction();
        auto table = ObjectStore::table_for_object_type(group, "object");
        // There currently isn't actually any way to produce a column move from the public API
        _impl::TableFriend::move_column(*table->get_descriptor(), 1, 0);
        realm2->commit_transaction();

        REQUIRE_NOTHROW(realm->refresh());
        REQUIRE(realm->schema() == schema);
        REQUIRE(realm->schema().find("object")->persisted_properties[0].table_column == 1);
        REQUIRE(realm->schema().find("object")->persisted_properties[1].table_column == 0);
    }
}

TEST_CASE("migration: Manual") {
    TestFile config;
    config.schema_mode = SchemaMode::Manual;
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

#define REQUIRE_MIGRATION(schema, migration) do { \
    Schema new_schema = (schema); \
    REQUIRE_THROWS(realm->update_schema(new_schema)); \
    REQUIRE(realm->schema_version() == 0); \
    REQUIRE_THROWS(realm->update_schema(new_schema, 1, [](SharedRealm, SharedRealm, Schema&){})); \
    REQUIRE(realm->schema_version() == 0); \
    REQUIRE_NOTHROW(realm->update_schema(new_schema, 1, migration)); \
    REQUIRE(realm->schema_version() == 1); \
} while (false)

    SECTION("add new table") {
        REQUIRE_MIGRATION(add_table(schema, {"new table", {
            {"value", PropertyType::Int, "", "", false, false, false},
        }}), [](SharedRealm, SharedRealm realm, Schema&) {
            realm->read_group().add_table("class_new table")->add_column(type_Int, "value");
        });
    }
    SECTION("add property to table") {
        REQUIRE_MIGRATION(add_property(schema, "object", {"new", PropertyType::Int, "", "", false, false, false}),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              realm->read_group().get_table("class_object")->add_column(type_Int, "new");
                          });
    }
    SECTION("remove property from table") {
        REQUIRE_MIGRATION(remove_property(schema, "object", "value"),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              realm->read_group().get_table("class_object")->remove_column(1);
                          });
    }
    SECTION("add primary key to table") {
        REQUIRE_MIGRATION(set_primary_key(schema, "link origin", "not a pk"),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              ObjectStore::set_primary_key_for_object(realm->read_group(), "link origin", "not a pk");
                              realm->read_group().get_table("class_link origin")->add_search_index(0);
                          });
    }
    SECTION("remove primary key from table") {
        REQUIRE_MIGRATION(set_primary_key(schema, "object", ""),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              ObjectStore::set_primary_key_for_object(realm->read_group(), "object", "");
                              realm->read_group().get_table("class_object")->remove_search_index(0);
                          });
    }
    SECTION("change primary key") {
        REQUIRE_MIGRATION(set_primary_key(schema, "object", "value"),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              ObjectStore::set_primary_key_for_object(realm->read_group(), "object", "value");
                              auto table = realm->read_group().get_table("class_object");
                              table->remove_search_index(0);
                              table->add_search_index(1);
                          });
    }
    SECTION("change property type") {
        REQUIRE_MIGRATION(set_type(schema, "object", "value", PropertyType::Date),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              auto table = realm->read_group().get_table("class_object");
                              table->remove_column(1);
                              size_t col = table->add_column(type_Timestamp, "value");
                              table->add_search_index(col);
                          });
    }
    SECTION("change link target") {
        REQUIRE_MIGRATION(set_target(schema, "link origin", "object", "link origin"),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              auto table = realm->read_group().get_table("class_link origin");
                              table->remove_column(1);
                              table->add_column_link(type_Link, "object", *table);
                          });
    }
    SECTION("change linklist target") {
        REQUIRE_MIGRATION(set_target(schema, "link origin", "array", "link origin"),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              auto table = realm->read_group().get_table("class_link origin");
                              table->remove_column(2);
                              table->add_column_link(type_LinkList, "array", *table);
                          });
    }
    SECTION("make property optional") {
        REQUIRE_MIGRATION(set_optional(schema, "object", "value", true),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              auto table = realm->read_group().get_table("class_object");
                              table->remove_column(1);
                              size_t col = table->add_column(type_Int, "value", true);
                              table->add_search_index(col);
                          });
    }
    SECTION("make property required") {
        REQUIRE_MIGRATION(set_optional(schema, "object", "optional", false),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              auto table = realm->read_group().get_table("class_object");
                              table->remove_column(2);
                              table->add_column(type_Int, "optional", false);
                          });
    }
    SECTION("add index") {
        REQUIRE_MIGRATION(set_indexed(schema, "object", "optional", true),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              realm->read_group().get_table("class_object")->add_search_index(2);
                          });
    }
    SECTION("remove index") {
        REQUIRE_MIGRATION(set_indexed(schema, "object", "value", false),
                          [](SharedRealm, SharedRealm realm, Schema&) {
                              realm->read_group().get_table("class_object")->remove_search_index(1);
                          });
    }
    SECTION("reorder properties") {
        auto schema2 = schema;
        auto& properties = schema2.find("object")->persisted_properties;
        std::swap(properties[0], properties[1]);
        REQUIRE_NOTHROW(realm->update_schema(schema2));
    }

    SECTION("cannot lower schema version") {
        REQUIRE_NOTHROW(realm->update_schema(schema, 1, [](SharedRealm, SharedRealm, Schema&){}));
        REQUIRE(realm->schema_version() == 1);
        REQUIRE_THROWS(realm->update_schema(schema, 0, [](SharedRealm, SharedRealm, Schema&){}));
        REQUIRE(realm->schema_version() == 1);
    }
}
