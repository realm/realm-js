////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
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

#include "query_builder.hpp"
#include "parser.hpp"

#include <realm.hpp>
#include "object_store.hpp"
#include "schema.hpp"

#include <assert.h>

namespace realm {
namespace query_builder {
using namespace parser;

// check a precondition and throw an exception if it is not met
// this should be used iff the condition being false indicates a bug in the caller
// of the function checking its preconditions
static void precondition(bool condition, const std::string message) {
    if (__builtin_expect(condition, 1)) {
        return;
    }
    throw std::runtime_error(message);
}

// FIXME: TrueExpression and FalseExpression should be supported by core in some way
struct TrueExpression : realm::Expression {
    size_t find_first(size_t start, size_t end) const override
    {
        if (start != end)
            return start;

        return not_found;
    }
    void set_table() override {}
    const Table* get_table() const override { return nullptr; }
};

struct FalseExpression : realm::Expression {
    size_t find_first(size_t, size_t) const override { return not_found; }
    void set_table() override {}
    const Table* get_table() const override { return nullptr; }
};


// add a clause for numeric constraints based on operator type
template <typename A, typename B>
void add_numeric_constraint_to_query(Query& query,
                                     Predicate::Operator operatorType,
                                     A lhs,
                                     B rhs)
{
    switch (operatorType) {
        case Predicate::Operator::LessThan:
            query.and_query(lhs < rhs);
            break;
        case Predicate::Operator::LessThanOrEqual:
            query.and_query(lhs <= rhs);
            break;
        case Predicate::Operator::GreaterThan:
            query.and_query(lhs > rhs);
            break;
        case Predicate::Operator::GreaterThanOrEqual:
            query.and_query(lhs >= rhs);
            break;
        case Predicate::Operator::Equal:
            query.and_query(lhs == rhs);
            break;
        case Predicate::Operator::NotEqual:
            query.and_query(lhs != rhs);
            break;
        default:
            throw std::runtime_error("Unsupported operator for numeric queries.");
    }
}

template <typename A, typename B>
void add_bool_constraint_to_query(Query &query, Predicate::Operator operatorType, A lhs, B rhs) {
    switch (operatorType) {
        case Predicate::Operator::Equal:
            query.and_query(lhs == rhs);
            break;
        case Predicate::Operator::NotEqual:
            query.and_query(lhs != rhs);
            break;
        default:
            throw std::runtime_error("Unsupported operator for numeric queries.");
    }
}

void add_string_constraint_to_query(Query &query,
                                    Predicate::Operator op,
                                    Columns<String> &&column,
                                    StringData value) {
    bool case_sensitive = true;
    StringData sd = value;
    switch (op) {
        case Predicate::Operator::BeginsWith:
            query.and_query(column.begins_with(sd, case_sensitive));
            break;
        case Predicate::Operator::EndsWith:
            query.and_query(column.ends_with(sd, case_sensitive));
            break;
        case Predicate::Operator::Contains:
            query.and_query(column.contains(sd, case_sensitive));
            break;
        case Predicate::Operator::Equal:
            query.and_query(column.equal(sd, case_sensitive));
            break;
        case Predicate::Operator::NotEqual:
            query.and_query(column.not_equal(sd, case_sensitive));
            break;
        default:
            throw std::runtime_error("Unsupported operator for string queries.");
    }
}

void add_string_constraint_to_query(realm::Query& query,
                                    Predicate::Operator op,
                                    StringData value,
                                    Columns<String> &&column) {
    bool case_sensitive = true;
    StringData sd = value;
    switch (op) {
        case Predicate::Operator::Equal:
            query.and_query(column.equal(sd, case_sensitive));
            break;
        case Predicate::Operator::NotEqual:
            query.and_query(column.not_equal(sd, case_sensitive));
            break;
        default:
            throw std::runtime_error("Substring comparison not supported for keypath substrings.");
    }
}


using KeyPath = std::vector<std::string>;
KeyPath key_path_from_string(const std::string &s) {
    std::stringstream ss(s);
    std::string item;
    KeyPath key_path;
    while (std::getline(ss, item, '.')) {
        key_path.push_back(item);
    }
    return key_path;
}

struct PropertyExpression
{
    Property *prop = nullptr;
    std::vector<size_t> indexes;
    std::function<Table *()> table_getter;

    PropertyExpression(Query &query, Schema &schema, ObjectSchema &desc, const std::string &key_path_string)
    {
        KeyPath key_path = key_path_from_string(key_path_string);
        for (size_t index = 0; index < key_path.size(); index++) {
            if (prop) {
                precondition(prop->type == PropertyTypeObject || prop->type == PropertyTypeArray,
                             (std::string)"Property '" + key_path[index] + "' is not a link in object of type '" + desc.name + "'");
                indexes.push_back(prop->table_column);

            }
            prop = desc.property_for_name(key_path[index]);
            precondition(prop != nullptr, "No property '" + key_path[index] + "' on object of type '" + desc.name + "'");

            if (prop->object_type.size()) {
                desc = *schema.find(prop->object_type);
            }
        }

        table_getter = [&] {
            TableRef& tbl = query.get_table();
            for (size_t col : indexes) {
                tbl->link(col); // mutates m_link_chain on table
            }
            return tbl.get();
        };
    }
};

template <typename RetType, typename TableGetter>
struct ColumnGetter {
    static Columns<RetType> convert(TableGetter&& table, const PropertyExpression & expr, Arguments &args)
    {
        return table()->template column<RetType>(expr.prop->table_column);
    }
};

template <typename RequestedType, typename TableGetter>
struct ValueGetter;

template <typename TableGetter>
struct ValueGetter<DateTime, TableGetter> {
    static Int convert(TableGetter&&, const parser::Expression & value, Arguments &args)
    {
        if (value.type != parser::Expression::Type::Argument) {
            throw std::runtime_error("You must pass in a date argument to compare");
        }
        DateTime dt = args.datetime_for_argument(std::stoi(value.s));
        return dt.get_datetime();
    }
};

template <typename TableGetter>
struct ValueGetter<bool, TableGetter> {
    static bool convert(TableGetter&&, const parser::Expression & value, Arguments &args)
    {
        if (value.type == parser::Expression::Type::Argument) {
            return args.bool_for_argument(std::stoi(value.s));
        }
        return value.type == parser::Expression::Type::True;
    }
};

template <typename TableGetter>
struct ValueGetter<Double, TableGetter> {
    static Double convert(TableGetter&&, const parser::Expression & value, Arguments &args)
    {
        if (value.type == parser::Expression::Type::Argument) {
            return args.double_for_argument(std::stoi(value.s));
        }
        return std::stod(value.s);
    }
};

template <typename TableGetter>
struct ValueGetter<Float, TableGetter> {
    static Float convert(TableGetter&&, const parser::Expression & value, Arguments &args)
    {
        if (value.type == parser::Expression::Type::Argument) {
            return args.float_for_argument(std::stoi(value.s));
        }
        return std::stof(value.s);
    }
};

template <typename TableGetter>
struct ValueGetter<Int, TableGetter> {
    static Int convert(TableGetter&&, const parser::Expression & value, Arguments &args)
    {
        if (value.type == parser::Expression::Type::Argument) {
            return args.long_for_argument(std::stoi(value.s));
        }
        return std::stoll(value.s);
    }
};

template <typename TableGetter>
struct ValueGetter<String, TableGetter> {
    static std::string convert(TableGetter&&, const parser::Expression & value, Arguments &args)
    {
        if (value.type == parser::Expression::Type::Argument) {
            return args.string_for_argument(std::stoi(value.s));
        }
        return value.s;
    }
};

template <typename RetType, typename Value, typename TableGetter>
auto value_of_type_for_query(TableGetter&& tables, Value&& value, Arguments &args)
{
    const bool isColumn = std::is_same<PropertyExpression, typename std::remove_reference<Value>::type>::value;
    using helper = std::conditional_t<isColumn, ColumnGetter<RetType, TableGetter>, ValueGetter<RetType, TableGetter>>;
    return helper::convert(std::forward<TableGetter>(tables), std::forward<Value>(value), args);
}

template <typename A, typename B>
void do_add_comparison_to_query(Query &query, Schema &schema, ObjectSchema &object_schema, Predicate::Operator op,
                                PropertyExpression &expr, A &lhs, B &rhs, Arguments &args)
{
    auto type = expr.prop->type;
    switch (type) {
        case PropertyTypeBool:
            add_bool_constraint_to_query(query, op, value_of_type_for_query<bool>(expr.table_getter, lhs, args),
                                                    value_of_type_for_query<bool>(expr.table_getter, rhs, args));
            break;
        case PropertyTypeDate:
            add_numeric_constraint_to_query(query, op, value_of_type_for_query<DateTime>(expr.table_getter, lhs, args),
                                                       value_of_type_for_query<DateTime>(expr.table_getter, rhs, args));
            break;
        case PropertyTypeDouble:
            add_numeric_constraint_to_query(query, op, value_of_type_for_query<Double>(expr.table_getter, lhs, args),
                                                       value_of_type_for_query<Double>(expr.table_getter, rhs, args));
            break;
        case PropertyTypeFloat:
            add_numeric_constraint_to_query(query, op, value_of_type_for_query<Float>(expr.table_getter, lhs, args),
                                                       value_of_type_for_query<Float>(expr.table_getter, rhs, args));
            break;
        case PropertyTypeInt:
            add_numeric_constraint_to_query(query, op, value_of_type_for_query<Int>(expr.table_getter, lhs, args),
                                                       value_of_type_for_query<Int>(expr.table_getter, rhs, args));
            break;
        case PropertyTypeString:
        case PropertyTypeData:
            add_string_constraint_to_query(query, op, value_of_type_for_query<String>(expr.table_getter, lhs, args),
                                                      value_of_type_for_query<String>(expr.table_getter, rhs, args));
            break;
        default: {
            throw std::runtime_error((std::string)"Object type " + string_for_property_type(type) + " not supported");
        }
    }
}

void add_comparison_to_query(Query &query, Predicate &pred, Arguments &args, Schema &schema, ObjectSchema &object_schema)
{
    Predicate::Comparison &cmpr = pred.cmpr;
    auto t0 = cmpr.expr[0].type, t1 = cmpr.expr[1].type;
    if (t0 == parser::Expression::Type::KeyPath && t1 != parser::Expression::Type::KeyPath) {
        PropertyExpression expr(query, schema, object_schema, cmpr.expr[0].s);
        do_add_comparison_to_query(query, schema, object_schema, cmpr.op, expr, expr, cmpr.expr[1], args);
    }
    else if (t0 != parser::Expression::Type::KeyPath && t1 == parser::Expression::Type::KeyPath) {
        PropertyExpression expr(query, schema, object_schema, cmpr.expr[1].s);
        do_add_comparison_to_query(query, schema, object_schema, cmpr.op, expr, cmpr.expr[0], expr, args);
    }
    else {
        throw std::runtime_error("Predicate expressions must compare a keypath and another keypath or a constant value");
    }
}

void update_query_with_predicate(Query &query, Predicate &pred, Arguments &arguments, Schema &schema, ObjectSchema &object_schema)
{
    if (pred.negate) {
        query.Not();
    }
    
    switch (pred.type) {
        case Predicate::Type::And:
            query.group();
            for (auto &sub : pred.cpnd.sub_predicates) {
                update_query_with_predicate(query, sub, arguments, schema, object_schema);
            }
            if (!pred.cpnd.sub_predicates.size()) {
                query.and_query(new TrueExpression);
            }
            query.end_group();
            break;
            
        case Predicate::Type::Or:
            query.group();
            for (auto &sub : pred.cpnd.sub_predicates) {
                query.Or();
                update_query_with_predicate(query, sub, arguments, schema, object_schema);
            }
            if (!pred.cpnd.sub_predicates.size()) {
                query.and_query(new FalseExpression);
            }
            query.end_group();
            break;
            
        case Predicate::Type::Comparison: {
            add_comparison_to_query(query, pred, arguments, schema, object_schema);
            break;
        }
        case Predicate::Type::True:
            query.and_query(new TrueExpression);
            break;
            
        case Predicate::Type::False:
            query.and_query(new FalseExpression);
            break;
            
        default:
            throw std::runtime_error("Invalid predicate type");
            break;
    }
}

void apply_predicate(Query &query, Predicate &predicate, Arguments &arguments, Schema &schema, std::string objectType)
{
    update_query_with_predicate(query, predicate, arguments, schema, *schema.find(objectType));
    
    // Test the constructed query in core
    std::string validateMessage = query.validate();
    precondition(validateMessage.empty(), validateMessage.c_str());
}

}}
