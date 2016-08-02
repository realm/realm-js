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

#include "object_schema.hpp"
#include "property.hpp"
#include "schema.hpp"

#include <realm/group.hpp>
#include <realm/table.hpp>

using namespace realm;

struct SchemaChangePrinter {
    std::ostream& out;

    template<typename Value>
    void print(Value value) const
    {
        out << value;
    }

    template<typename Value, typename... Rest>
    void print(Value value, Rest... rest) const
    {
        out << value << ", ";
        print(rest...);
    }

#define REALM_SC_PRINT(type, ...) \
    void operator()(schema_change::type v) const \
    { \
        out << #type << "{"; \
        print(__VA_ARGS__); \
        out << "}"; \
    }

    REALM_SC_PRINT(AddIndex, v.object, v.property)
    REALM_SC_PRINT(AddProperty, v.object, v.property)
    REALM_SC_PRINT(AddTable, v.object)
    REALM_SC_PRINT(ChangePrimaryKey, v.object, v.property)
    REALM_SC_PRINT(ChangePropertyType, v.object, v.old_property, v.new_property)
    REALM_SC_PRINT(MakePropertyNullable, v.object, v.property)
    REALM_SC_PRINT(MakePropertyRequired, v.object, v.property)
    REALM_SC_PRINT(RemoveIndex, v.object, v.property)
    REALM_SC_PRINT(RemoveProperty, v.object, v.property)

#undef REALM_SC_PRINT
};

namespace Catch {
std::string toString(SchemaChange const& sc)
{
    std::stringstream ss;
    sc.visit(SchemaChangePrinter{ss});
    return ss.str();
}
}

TEST_CASE("ObjectSchema") {
    SECTION("from a Group") {
        Group g;
        TableRef pk = g.add_table("pk");
        pk->add_column(type_String, "pk_table");
        pk->add_column(type_String, "pk_property");
        pk->add_empty_row();
        pk->set_string(0, 0, "table");
        pk->set_string(1, 0, "pk");

        TableRef table = g.add_table("class_table");
        TableRef target = g.add_table("class_target");

        table->add_column(type_Int, "pk");

        table->add_column(type_Int, "int");
        table->add_column(type_Bool, "bool");
        table->add_column(type_Float, "float");
        table->add_column(type_Double, "double");
        table->add_column(type_String, "string");
        table->add_column(type_Binary, "data");
        table->add_column(type_Timestamp, "date");

        table->add_column_link(type_Link, "object", *target);
        table->add_column_link(type_LinkList, "array", *target);

        table->add_column(type_Int, "int?", true);
        table->add_column(type_Bool, "bool?", true);
        table->add_column(type_Float, "float?", true);
        table->add_column(type_Double, "double?", true);
        table->add_column(type_String, "string?", true);
        table->add_column(type_Binary, "data?", true);
        table->add_column(type_Timestamp, "date?", true);

        size_t indexed_start = table->get_column_count();
        table->add_column(type_Int, "indexed int");
        table->add_column(type_Bool, "indexed bool");
        table->add_column(type_String, "indexed string");
        table->add_column(type_Timestamp, "indexed date");

        table->add_column(type_Int, "indexed int?", true);
        table->add_column(type_Bool, "indexed bool?", true);
        table->add_column(type_String, "indexed string?", true);
        table->add_column(type_Timestamp, "indexed date?", true);

        for (size_t i = indexed_start; i < table->get_column_count(); ++i)
            table->add_search_index(i);

        ObjectSchema os(g, "table");

#define REQUIRE_PROPERTY(name, type, ...) do { \
    auto prop = os.property_for_name(name); \
    REQUIRE(prop); \
    REQUIRE(*prop == Property(name, PropertyType::type, __VA_ARGS__)); \
    REQUIRE(prop->table_column == expected_col++); \
} while (0)

        size_t expected_col = 0;

        REQUIRE(os.property_for_name("nonexistent property") == nullptr);

        // bools are (primary, indexed, nullable)
        REQUIRE_PROPERTY("pk", Int, "", "",true, false, false);

        REQUIRE_PROPERTY("int", Int, "", "", false, false, false);
        REQUIRE_PROPERTY("bool", Bool, "", "", false, false, false);
        REQUIRE_PROPERTY("float", Float, "", "", false, false, false);
        REQUIRE_PROPERTY("double", Double, "", "", false, false, false);
        REQUIRE_PROPERTY("string", String, "", "", false, false, false);
        REQUIRE_PROPERTY("data", Data, "", "", false, false, false);
        REQUIRE_PROPERTY("date", Date, "", "", false, false, false);

        REQUIRE_PROPERTY("object", Object, "target", "", false, false, true);
        REQUIRE_PROPERTY("array", Array, "target", "", false, false, false);

        REQUIRE_PROPERTY("int?", Int, "", "", false, false, true);
        REQUIRE_PROPERTY("bool?", Bool, "", "", false, false, true);
        REQUIRE_PROPERTY("float?", Float, "", "", false, false, true);
        REQUIRE_PROPERTY("double?", Double, "", "", false, false, true);
        REQUIRE_PROPERTY("string?", String, "", "", false, false, true);
        REQUIRE_PROPERTY("data?", Data, "", "", false, false, true);
        REQUIRE_PROPERTY("date?", Date, "", "", false, false, true);

        REQUIRE_PROPERTY("indexed int", Int, "", "", false, true, false);
        REQUIRE_PROPERTY("indexed bool", Bool, "", "", false, true, false);
        REQUIRE_PROPERTY("indexed string", String, "", "", false, true, false);
        REQUIRE_PROPERTY("indexed date", Date, "", "", false, true, false);

        REQUIRE_PROPERTY("indexed int?", Int, "", "", false, true, true);
        REQUIRE_PROPERTY("indexed bool?", Bool, "", "", false, true, true);
        REQUIRE_PROPERTY("indexed string?", String, "", "", false, true, true);
        REQUIRE_PROPERTY("indexed date?", Date, "", "", false, true, true);

        pk->set_string(1, 0, "nonexistent property");
        REQUIRE(ObjectSchema(g, "table").primary_key_property() == nullptr);
    }
}

TEST_CASE("Schema") {
    SECTION("validate()") {
        SECTION("rejects link properties with no target object") {
            Schema schema = {
                {"object", {
                    {"link", PropertyType::Object, "", "", false, false, true}
                }},
            };
            REQUIRE_THROWS(schema.validate());
        }

        SECTION("rejects array properties with no target object") {
            Schema schema = {
                {"object", {
                    {"array", PropertyType::Array, "", "", false, false, true}
                }},
            };
            REQUIRE_THROWS(schema.validate());
        }

        SECTION("rejects link properties with a target not in the schema") {
            Schema schema = {
                {"object", {
                    {"link", PropertyType::Object, "invalid target", "", false, false, true}
                }}
            };
            REQUIRE_THROWS(schema.validate());
        }

        SECTION("rejects array properties with a target not in the schema") {
            Schema schema = {
                {"object", {
                    {"array", PropertyType::Array, "invalid target", "", false, false, true}
                }}
            };
            REQUIRE_THROWS(schema.validate());
        }

        SECTION("rejects target object types for non-link properties") {
            Schema schema = {
                {"object", {
                    {"int", PropertyType::Int, "", "", false, false, false},
                    {"bool", PropertyType::Bool, "", "", false, false, false},
                    {"float", PropertyType::Float, "", "", false, false, false},
                    {"double", PropertyType::Double, "", "", false, false, false},
                    {"string", PropertyType::String, "", "", false, false, false},
                    {"date", PropertyType::Date, "", "", false, false, false},
                }}
            };
            for (auto& prop : schema.begin()->persisted_properties) {
                REQUIRE_NOTHROW(schema.validate());
                prop.object_type = "object";
                REQUIRE_THROWS(schema.validate());
                prop.object_type = "";
            }
        }

        SECTION("rejects non-nullable link properties") {
            Schema schema = {
                {"object", {
                    {"link", PropertyType::Object, "target", "", false, false, false}
                }},
                {"target", {
                    {"value", PropertyType::Int}
                }}
            };
            REQUIRE_THROWS(schema.validate());
        }

        SECTION("rejects nullable array properties") {
            Schema schema = {
                {"object", {
                    {"array", PropertyType::Array, "target", "", false, false, true}
                }},
                {"target", {
                    {"value", PropertyType::Int}
                }}
            };
            REQUIRE_THROWS(schema.validate());
        }

        SECTION("rejects duplicate primary keys") {
            Schema schema = {
                {"object", {
                    {"pk1", PropertyType::Int, "", "", true, false, false},
                    {"pk2", PropertyType::Int, "", "", true, false, false},
                }}
            };
            REQUIRE_THROWS(schema.validate());
        }

        SECTION("rejects indexes for types that cannot be indexed") {
            Schema schema = {
                {"object", {
                    {"float", PropertyType::Float, "", "", false, false, false},
                    {"double", PropertyType::Double, "", "", false, false, false},
                    {"data", PropertyType::Data, "", "", false, false, false},
                    {"object", PropertyType::Object, "object", "", false, false, true},
                    {"array", PropertyType::Array, "object", "", false, false, false},
                }}
            };
            for (auto& prop : schema.begin()->persisted_properties) {
                REQUIRE_NOTHROW(schema.validate());
                prop.is_indexed = true;
                REQUIRE_THROWS(schema.validate());
                prop.is_indexed = false;
            }
        }

        SECTION("allows indexing types that can be indexed") {
            Schema schema = {
                {"object", {
                    {"int", PropertyType::Int, "", "", false, true, false},
                    {"bool", PropertyType::Bool, "", "", false, true, false},
                    {"string", PropertyType::String, "", "", false, true, false},
                    {"date", PropertyType::Date, "", "", false, true, false},
                }}
            };
            REQUIRE_NOTHROW(schema.validate());
        }
    }

    SECTION("compare()") {
        using namespace schema_change;
        using vec = std::vector<SchemaChange>;
        SECTION("add table") {
            Schema schema1 = {
                {"object 1", {
                    {"int", PropertyType::Int, "", "", false, false, false},
                }}
            };
            Schema schema2 = {
                {"object 1", {
                    {"int", PropertyType::Int, "", "", false, false, false},
                }},
                {"object 2", {
                    {"int", PropertyType::Int, "", "", false, false, false},
                }}
            };
            REQUIRE(schema1.compare(schema2) == vec{AddTable{&*schema2.find("object 2")}});
        }

        SECTION("add property") {
            Schema schema1 = {
                {"object", {
                    {"int 1", PropertyType::Int, "", "", false, false, false},
                }}
            };
            Schema schema2 = {
                {"object", {
                    {"int 1", PropertyType::Int, "", "", false, false, false},
                    {"int 2", PropertyType::Int, "", "", false, false, false},
                }}
            };
            REQUIRE(schema1.compare(schema2) == vec{(AddProperty{&*schema1.find("object"), &schema2.find("object")->persisted_properties[1]})});
        }

        SECTION("remove property") {
            Schema schema1 = {
                {"object", {
                    {"int 1", PropertyType::Int, "", "", false, false, false},
                    {"int 2", PropertyType::Int, "", "", false, false, false},
                }}
            };
            Schema schema2 = {
                {"object", {
                    {"int 1", PropertyType::Int, "", "", false, false, false},
                }}
            };
            REQUIRE(schema1.compare(schema2) == vec{(RemoveProperty{&*schema1.find("object"), &schema1.find("object")->persisted_properties[1]})});
        }

        SECTION("change property type") {
            Schema schema1 = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }}
            };
            Schema schema2 = {
                {"object", {
                    {"value", PropertyType::Double, "", "", false, false, false},
                }}
            };
            REQUIRE(schema1.compare(schema2) == vec{(ChangePropertyType{
                &*schema1.find("object"),
                &schema1.find("object")->persisted_properties[0],
                &schema2.find("object")->persisted_properties[0]})});
        };

        SECTION("change link target") {
            Schema schema1 = {
                {"object", {
                    {"value", PropertyType::Object, "target 1", "", false, false, false},
                }},
                {"target 1", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
                {"target 2", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            Schema schema2 = {
                {"object", {
                    {"value", PropertyType::Object, "target 2", "", false, false, false},
                }},
                {"target 1", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
                {"target 2", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }},
            };
            REQUIRE(schema1.compare(schema2) == vec{(ChangePropertyType{
                &*schema1.find("object"),
                &schema1.find("object")->persisted_properties[0],
                &schema2.find("object")->persisted_properties[0]})});
        }

        SECTION("add index") {
            Schema schema1 = {
                {"object", {
                    {"int", PropertyType::Int, "", "", false, false, false},
                }}
            };
            Schema schema2 = {
                {"object", {
                    {"int", PropertyType::Int, "", "", false, true, false},
                }}
            };
            auto object_schema = &*schema1.find("object");
            REQUIRE(schema1.compare(schema2) == vec{(AddIndex{object_schema, &object_schema->persisted_properties[0]})});
        }

        SECTION("remove index") {
            Schema schema1 = {
                {"object", {
                    {"int", PropertyType::Int, "", "", false, true, false},
                }}
            };
            Schema schema2 = {
                {"object", {
                    {"int", PropertyType::Int, "", "", false, false, false},
                }}
            };
            auto object_schema = &*schema1.find("object");
            REQUIRE(schema1.compare(schema2) == vec{(RemoveIndex{object_schema, &object_schema->persisted_properties[0]})});
        }

        SECTION("add index and make nullable") {
            Schema schema1 = {
                {"object", {
                    {"int", PropertyType::Int, "", "", false, false, false},
                }}
            };
            Schema schema2 = {
                {"object", {
                    {"int", PropertyType::Int, "", "", false, true, true},
                }}
            };
            auto object_schema = &*schema1.find("object");
            REQUIRE(schema1.compare(schema2) == (vec{
                MakePropertyNullable{object_schema, &object_schema->persisted_properties[0]},
                AddIndex{object_schema, &object_schema->persisted_properties[0]}}));
        }

        SECTION("add index and change type") {
            Schema schema1 = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }}
            };
            Schema schema2 = {
                {"object", {
                    {"value", PropertyType::Double, "", "", false, true, false},
                }}
            };
            REQUIRE(schema1.compare(schema2) == vec{(ChangePropertyType{
                &*schema1.find("object"),
                &schema1.find("object")->persisted_properties[0],
                &schema2.find("object")->persisted_properties[0]})});
        }

        SECTION("make nullable and change type") {
            Schema schema1 = {
                {"object", {
                    {"value", PropertyType::Int, "", "", false, false, false},
                }}
            };
            Schema schema2 = {
                {"object", {
                    {"value", PropertyType::Double, "", "", false, false, true},
                }}
            };
            REQUIRE(schema1.compare(schema2) == vec{(ChangePropertyType{
                &*schema1.find("object"),
                &schema1.find("object")->persisted_properties[0],
                &schema2.find("object")->persisted_properties[0]})});
        }
    }
}
