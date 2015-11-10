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

#include "parser.hpp"

#include <iostream>

#include <pegtl.hh>
#include <pegtl/analyze.hh>
#include <pegtl/trace.hh>

#include <realm.hpp>
#include "object_store.hpp"
#include "schema.hpp"

using namespace pegtl;

namespace realm {
namespace parser {

// strings
struct unicode : list< seq< one< 'u' >, rep< 4, must< xdigit > > >, one< '\\' > > {};
struct escaped_char : one< '"', '\'', '\\', '/', 'b', 'f', 'n', 'r', 't' > {};
struct escaped : sor< escaped_char, unicode > {};
struct unescaped : utf8::range< 0x20, 0x10FFFF > {};
struct char_ : if_then_else< one< '\\' >, must< escaped >, unescaped > {};

struct dq_string_content : until< at< one< '"' > >, must< char_ > > {};
struct dq_string : seq< one< '"' >, must< dq_string_content >, any > {};

struct sq_string_content : until< at< one< '\'' > >, must< char_ > > {};
struct sq_string : seq< one< '\'' >, must< sq_string_content >, any > {};

// numbers
struct minus : opt< one< '-' > > {};
struct dot : one< '.' > {};

struct float_num : sor<
    seq< plus< digit >, dot, star< digit > >,
    seq< star< digit >, dot, plus< digit > >
> {};
struct hex_num : seq< one< '0' >, one< 'x', 'X' >, plus< xdigit > > {};
struct int_num : plus< digit > {};

struct number : seq< minus, sor< float_num, hex_num, int_num > > {};

// key paths
struct key_path : list< seq< sor< alpha, one< '_' > >, star< sor< alnum, one< '_', '-' > > > >, one< '.' > > {};

// argument
struct argument_index : until< at< one< '}' > >, must< digit > > {};
struct argument : seq< one< '{' >, must< argument_index >, any > {};

// expressions and operators
struct expr : sor< dq_string, sq_string, key_path, number, argument > {};

struct eq : sor< two< '=' >, one< '=' > > {};
struct noteq : pegtl::string< '!', '=' > {};
struct lteq : pegtl::string< '<', '=' > {};
struct lt : one< '<' > {};
struct gteq : pegtl::string< '>', '=' > {};
struct gt : one< '>' > {};
struct begins : istring< 'b','e','g','i','n','s','w','i','t','h' > {};
struct ends : istring< 'e','n','d','s','w','i','t','h' > {};
struct contains : istring< 'c','o','n','t','a','i','n','s' > {};
struct oper : sor< eq, noteq, lteq, lt, gteq, gt, begins, ends, contains > {};

// predicates
struct comparison_pred : seq< expr, pad< oper, blank >, expr > {};

struct pred;
struct group_pred : if_must< one< '(' >, pad< pred, blank >, one< ')' > > {};
struct true_pred : sor< istring<'t','r','u','e','p','r','e','d','i','c','a','t','e'>, istring<'t','r','u','e'> > {};
struct false_pred : sor< istring<'f','a','l','s','e','p','r','e','d','i','c','a','t','e'>, istring<'f','a','l','s','e'> > {};

struct not_pre : sor< seq< one< '!' >, star< blank > >, seq< istring< 'N', 'O', 'T' >, plus< blank > > > {};
struct atom_pred : seq< opt< not_pre >, pad< sor< group_pred, true_pred, false_pred, comparison_pred >, blank > > {};

struct and_op : sor< two< '&' >, istring< 'A', 'N', 'D' > > {};
struct or_op : sor< two< '|' >, istring< 'O', 'R' > > {};

struct or_ext : seq< pad< or_op, blank >, pred > {};
struct and_ext : seq< pad< and_op, blank >, pred > {};
struct and_pred : seq< atom_pred, star< and_ext > > {};

struct pred : seq< and_pred, star< or_ext > > {};

// state
struct ParserState
{
    std::vector<Predicate *> predicate_stack;
    Predicate &current() {
        return *predicate_stack.back();
    }

    bool negate_next = false;

    void addExpression(Expression && exp)
    {
        if (current().type == Predicate::Type::Comparison) {
            current().cmpr.expr[1] = std::move(exp);
            predicate_stack.pop_back();
        }
        else {
            Predicate p(Predicate::Type::Comparison);
            p.cmpr.expr[0] = std::move(exp);
            if (negate_next) {
                p.negate = true;
                negate_next = false;
            }
            current().cpnd.sub_predicates.emplace_back(std::move(p));
            predicate_stack.push_back(&current().cpnd.sub_predicates.back());
        }
    }
};

// rules
template< typename Rule >
struct action : nothing< Rule > {};

template<> struct action< and_ext >
{
    static void apply( const input & in, ParserState & state )
    {
        std::cout << "<and>" << in.string() << std::endl;

        // if we were put into an OR group we need to rearrange
        auto &current = state.current();
        if (current.type == Predicate::Type::Or) {
            auto &sub_preds = state.current().cpnd.sub_predicates;
            auto &second_last = sub_preds[sub_preds.size()-2];
            if (second_last.type == Predicate::Type::And) {
                // if we are in an OR group and second to last predicate group is
                // an AND group then move the last predicate inside
                second_last.cpnd.sub_predicates.push_back(std::move(sub_preds.back()));
                sub_preds.pop_back();
            }
            else {
                // otherwise combine last two into a new AND group
                Predicate pred(Predicate::Type::And);
                pred.cpnd.sub_predicates.emplace_back(std::move(second_last));
                pred.cpnd.sub_predicates.emplace_back(std::move(sub_preds.back()));
                sub_preds.pop_back();
                sub_preds.pop_back();
                sub_preds.push_back(std::move(pred));
            }
        }
    }
};

template<> struct action< or_ext >
{
    static void apply( const input & in, ParserState & state )
    {
        std::cout << "<or>" << in.string() << std::endl;

        // if already an OR group do nothing
        auto &current = state.current();
        if (current.type == Predicate::Type::Or) {
            return;
        }

        // if only two predicates in the group, then convert to OR
        auto &sub_preds = state.current().cpnd.sub_predicates;
        if (sub_preds.size()) {
            current.type = Predicate::Type::Or;
            return;
        }

        // split the current group into to groups which are ORed together
        Predicate pred1(Predicate::Type::And), pred2(Predicate::Type::And);
        pred1.cpnd.sub_predicates.insert(sub_preds.begin(), sub_preds.back());
        pred2.cpnd.sub_predicates.push_back(std::move(sub_preds.back()));

        current.type = Predicate::Type::Or;
        sub_preds.clear();
        sub_preds.emplace_back(std::move(pred1));
        sub_preds.emplace_back(std::move(pred2));
    }
};


#define EXPRESSION_ACTION(rule, type)                               \
template<> struct action< rule > {                                  \
    static void apply( const input & in, ParserState & state ) {    \
        std::cout << in.string() << std::endl;                      \
        state.addExpression(Expression(type, in.string())); }};

EXPRESSION_ACTION(dq_string_content, Expression::Type::String)
EXPRESSION_ACTION(sq_string_content, Expression::Type::String)
EXPRESSION_ACTION(key_path, Expression::Type::KeyPath)
EXPRESSION_ACTION(number, Expression::Type::Number)
EXPRESSION_ACTION(argument_index, Expression::Type::Argument)


template<> struct action< true_pred >
{
    static void apply( const input & in, ParserState & state )
    {
        std::cout << in.string() << std::endl;
        state.current().cpnd.sub_predicates.emplace_back(Predicate::Type::True);
    }
};

template<> struct action< false_pred >
{
    static void apply( const input & in, ParserState & state )
    {
        std::cout << in.string() << std::endl;
        state.current().cpnd.sub_predicates.emplace_back(Predicate::Type::False);
    }
};


#define OPERATOR_ACTION(rule, oper)                                 \
template<> struct action< rule > {                                  \
    static void apply( const input & in, ParserState & state ) {    \
        std::cout << in.string() << std::endl;      \
        state.current().cmpr.op = oper; }};

OPERATOR_ACTION(eq, Predicate::Operator::Equal)
OPERATOR_ACTION(noteq, Predicate::Operator::NotEqual)
OPERATOR_ACTION(gteq, Predicate::Operator::GreaterThanOrEqual)
OPERATOR_ACTION(gt, Predicate::Operator::GreaterThan)
OPERATOR_ACTION(lteq, Predicate::Operator::LessThanOrEqual)
OPERATOR_ACTION(lt, Predicate::Operator::LessThan)
OPERATOR_ACTION(begins, Predicate::Operator::BeginsWith)
OPERATOR_ACTION(ends, Predicate::Operator::EndsWith)
OPERATOR_ACTION(contains, Predicate::Operator::Contains)


template<> struct action< one< '(' > >
{
    static void apply( const input & in, ParserState & state )
    {
        std::cout << "<begin_group>" << std::endl;

        Predicate group(Predicate::Type::And);
        if (state.negate_next) {
            group.negate = true;
            state.negate_next = false;
        }

        state.current().cpnd.sub_predicates.emplace_back(std::move(group));
        state.predicate_stack.push_back(&state.current().cpnd.sub_predicates.back());
    }
};

template<> struct action< group_pred >
{
    static void apply( const input & in, ParserState & state )
    {
        std::cout << "<end_group>" << std::endl;
        state.predicate_stack.pop_back();
    }
};

template<> struct action< not_pre >
{
    static void apply( const input & in, ParserState & state )
    {
        std::cout << "<not>" << std::endl;
        state.negate_next = true;
    }
};

Predicate parse(const std::string &query)
{
    analyze< pred >();
    const std::string source = "user query";

    Predicate out_predicate(Predicate::Type::And);

    ParserState state;
    state.predicate_stack.push_back(&out_predicate);

    pegtl::parse< must< pred, eof >, action >(query, source, state);
    if (out_predicate.type == Predicate::Type::And && out_predicate.cpnd.sub_predicates.size() == 1) {
        return std::move(out_predicate.cpnd.sub_predicates.back());
    }
    return std::move(out_predicate);
}


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
                                     PropertyType datatype,
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

template <typename RequestedType, typename TableGetter>
struct ColumnOfTypeHelper {
    static Columns<RequestedType> convert(TableGetter&& table, unsigned int idx)
    {
        return table()->template column<RequestedType>(idx);
    }
};

template <typename TableGetter>
struct ColumnOfTypeHelper<DateTime, TableGetter> {
    static Columns<Int> convert(TableGetter&& table, unsigned int idx)
    {
        return table()->template column<Int>(idx);
    }
};

template <typename RequestedType, typename TableGetter>
struct ValueOfTypeHelper;

template <typename TableGetter>
struct ValueOfTypeHelper<DateTime, TableGetter> {
    static Int convert(TableGetter&&, const std::string & value)
    {
        assert(0);
    }
};

template <typename TableGetter>
struct ValueOfTypeHelper<bool, TableGetter> {
    static bool convert(TableGetter&&, const std::string & value)
    {
        assert(0);
    }
};

template <typename TableGetter>
struct ValueOfTypeHelper<Double, TableGetter> {
    static Double convert(TableGetter&&, const std::string & value)
    {
        return std::stod(value);
    }
};

template <typename TableGetter>
struct ValueOfTypeHelper<Float, TableGetter> {
    static Float convert(TableGetter&&, const std::string & value)
    {
        return std::stof(value);
    }
};

template <typename TableGetter>
struct ValueOfTypeHelper<Int, TableGetter> {
    static Int convert(TableGetter&&, const std::string & value)
    {
        return std::stoll(value);
    }
};

template <typename TableGetter>
struct ValueOfTypeHelper<String, TableGetter> {
    static std::string convert(TableGetter&&, const std::string & value)
    {
        return value;
    }
};

template <typename RequestedType, typename Value, typename TableGetter>
auto value_of_type_for_query(TableGetter&& tables, Value&& value)
{
    const bool isColumnIndex = std::is_same<size_t, typename std::remove_reference<Value>::type>::value;
    using helper = std::conditional_t<isColumnIndex,
    ColumnOfTypeHelper<RequestedType, TableGetter>,
    ValueOfTypeHelper<RequestedType, TableGetter>>;
    return helper::convert(std::forward<TableGetter>(tables), std::forward<Value>(value));
}

std::vector<std::string> &split(const std::string &s, char delim, std::vector<std::string> &elems) {
    std::stringstream ss(s);
    std::string item;
    while (std::getline(ss, item, delim)) {
        elems.push_back(item);
    }
    return elems;
}

std::vector<std::string> split(const std::string &s, char delim) {
    std::vector<std::string> elems;
    split(s, delim, elems);
    return elems;
}

Property *get_property_from_key_path(Schema &schema, ObjectSchema &desc, const std::string &key_path, std::vector<size_t> &indexes)
{
    Property *prop = nullptr;

    auto paths = split(key_path, '.');
    for (size_t index = 0; index < paths.size(); index++) {
        if (prop) {
            precondition(prop->type == PropertyTypeObject || prop->type == PropertyTypeArray,
                         (std::string)"Property '" + paths[index] + "' is not a link in object of type '" + desc.name + "'");
            indexes.push_back(prop->table_column);

        }
        prop = desc.property_for_name(paths[index]);
        precondition(prop != nullptr, "No property '" + paths[index] + "' on object of type '" + desc.name + "'");

        if (prop->object_type.size()) {
            desc = *schema.find(prop->object_type);
        }
    }
    return prop;
}

template <typename... T>
    void do_add_comparison_to_query(Query &query, Schema &schema, ObjectSchema &object_schema, Property *prop,
                                    Predicate::Operator op, const std::vector<size_t>& indexes, T... values)
{
    auto table = [&] {
        TableRef& tbl = query.get_table();
        for (size_t col : indexes) {
            tbl->link(col); // mutates m_link_chain on table
        }
        return tbl.get();
    };

    auto type = prop->type;
    switch (type) {
        case PropertyTypeBool:
            add_bool_constraint_to_query(query, op, value_of_type_for_query<bool>(table, values)...);
            break;
        case PropertyTypeDate:
            add_numeric_constraint_to_query(query, type, op, value_of_type_for_query<DateTime>(table, values)...);
            break;
        case PropertyTypeDouble:
            add_numeric_constraint_to_query(query, type, op, value_of_type_for_query<Double>(table, values)...);
            break;
        case PropertyTypeFloat:
            add_numeric_constraint_to_query(query, type, op, value_of_type_for_query<Float>(table, values)...);
            break;
        case PropertyTypeInt:
            add_numeric_constraint_to_query(query, type, op, value_of_type_for_query<Int>(table, values)...);
            break;
        case PropertyTypeString:
        case PropertyTypeData:
            add_string_constraint_to_query(query, op, value_of_type_for_query<String>(table, values)...);
            break;
        default: {
            throw std::runtime_error((std::string)"Object type " + string_for_property_type(type) + " not supported");
        }
    }
}

void add_comparison_to_query(Query &query, Predicate &pred, Schema &schema, ObjectSchema &object_schema)
{
    std::vector<size_t> indexes;
    Predicate::Comparison &cmpr = pred.cmpr;
    auto t0 = cmpr.expr[0].type, t1 = cmpr.expr[1].type;
    if (t0 == Expression::Type::KeyPath && t1 != Expression::Type::KeyPath) {
        Property *prop = get_property_from_key_path(schema, object_schema, cmpr.expr[0].s, indexes);
        do_add_comparison_to_query(query, schema, object_schema, prop, cmpr.op, indexes, prop->table_column, cmpr.expr[1].s);
    }
    else if (t0 != Expression::Type::KeyPath && t1 == Expression::Type::KeyPath) {
        Property *prop = get_property_from_key_path(schema, object_schema, cmpr.expr[1].s, indexes);
        do_add_comparison_to_query(query, schema, object_schema, prop, cmpr.op, indexes, cmpr.expr[0].s, prop->table_column);
    }
    else {
        throw std::runtime_error("Predicate expressions must compare a keypath and another keypath or a constant value");
    }
}

void update_query_with_predicate(Query &query, Predicate &pred, Schema &schema, ObjectSchema &object_schema)
{
    if (pred.negate) {
        query.Not();
    }

    switch (pred.type) {
        case Predicate::Type::And:
            query.group();
            for (auto &sub : pred.cpnd.sub_predicates) {
                update_query_with_predicate(query, sub, schema, object_schema);
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
                update_query_with_predicate(query, sub, schema, object_schema);
            }
            if (!pred.cpnd.sub_predicates.size()) {
                query.and_query(new FalseExpression);
            }
            query.end_group();
            break;

        case Predicate::Type::Comparison: {
            add_comparison_to_query(query, pred, schema, object_schema);
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

void apply_predicate(Query &query, Predicate &predicate, Schema &schema, std::string objectType) {
    update_query_with_predicate(query, predicate, schema, *schema.find(objectType));

    // Test the constructed query in core
    std::string validateMessage = query.validate();
    precondition(validateMessage.empty(), validateMessage.c_str());
}

}}


