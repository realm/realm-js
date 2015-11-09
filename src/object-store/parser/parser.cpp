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

using namespace pegtl;

namespace realm {
namespace parser {

// strings
struct unicode : list< seq< one< 'u' >, rep< 4, must< xdigit > > >, one< '\\' > > {};
struct escaped_char : one< '"', '\\', '/', 'b', 'f', 'n', 'r', 't' > {};
struct escaped : sor< escaped_char, unicode > {};
struct unescaped : utf8::range< 0x20, 0x10FFFF > {};
struct char_ : if_then_else< one< '\\' >, must< escaped >, unescaped > {};

struct string_content : until< at< one< '"' > >, must< char_ > > {};
struct string : seq< one< '"' >, must< string_content >, any >
{
    using content = string_content;
};

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

// expressions and operators
struct expr : sor< string, key_path, number > {};

struct eq : sor< two< '=' >, one< '=' > > {};
struct noteq : pegtl::string< '!', '=' > {};
struct lteq : pegtl::string< '<', '=' > {};
struct lt : one< '<' > {};
struct gteq : pegtl::string< '>', '=' > {};
struct gt : one< '<' > {};
struct begins : istring< 'b', 'e', 'g', 'i', 'n', 's', 'w', 'i', 't', 'h' > {};
struct ends : istring< 'e', 'n', 'd', 's', 'w', 'i', 't', 'h' > {};
struct contains : istring< 'c', 'o', 'n', 't', 'a', 'i', 'n', 's' > {};
struct oper : sor< eq, noteq, lteq, lt, gteq, gt, begins, ends, contains > {};

// predicates
struct comparison_pred : seq< expr, pad< oper, blank >, expr > {};

struct pred;
struct group_pred : if_must< one< '(' >, pad< pred, blank >, one< ')' > > {};

struct not_pre : sor< seq< one< '!' >, star< blank > >, seq< istring< 'N', 'O', 'T' >, plus< blank > > > {};
struct atom_pred : seq< opt< not_pre >, pad< sor< group_pred, comparison_pred >, blank > > {};

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
    Predicate *current() { return predicate_stack.back(); }
    bool negate_next;

    void addExpression(Expression exp)
    {
        if (current()->type == Predicate::Type::Comparison) {
            current()->sub_expressions.emplace_back(std::move(exp));
            predicate_stack.pop_back();
        }
        else {
            Predicate p;
            p.type = Predicate::Type::Comparison;
            p.sub_expressions.emplace_back(std::move(exp));
            if (negate_next) {
                p.negate = true;
                negate_next = false;
            }
            current()->sub_predicates.emplace_back(std::move(p));
            predicate_stack.push_back(&current()->sub_predicates.back());
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
        auto current = state.current();
        if (current->type == Predicate::Type::Or) {
            auto &sub_preds = state.current()->sub_predicates;
            auto second_last = sub_preds[sub_preds.size()-2];
            if (second_last.type == Predicate::Type::And) {
                // if we are in an OR group and second to last predicate group is
                // an AND group then move the last predicate inside
                second_last.sub_predicates.push_back(sub_preds.back());
                sub_preds.pop_back();
            }
            else {
                // otherwise combine last two into a new AND group
                Predicate pred;
                pred.type = Predicate::Type::And;
                pred.sub_predicates = { second_last, sub_preds.back() };
                sub_preds.pop_back();
                sub_preds.pop_back();
                sub_preds.push_back(pred);
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
        auto current = state.current();
        if (current->type == Predicate::Type::Or) {
            return;
        }

        // if only two predicates in the group, then convert to OR
        auto &sub_preds = state.current()->sub_predicates;
        if (sub_preds.size()) {
            current->type = Predicate::Type::Or;
            return;
        }

        // split the current group into to groups which are ORed together
        Predicate pred1, pred2;
        pred1.type = Predicate::Type::And;
        pred2.type = Predicate::Type::And;
        pred1.sub_predicates.insert(sub_preds.begin(), sub_preds.back());
        pred2.sub_predicates.push_back(sub_preds.back());

        current->type = Predicate::Type::Or;
        sub_preds = { pred1, pred2 };
    }
};

template<> struct action< string >
{
    static void apply( const input & in, ParserState & state )
    {
        std::cout << in.string() << std::endl;

        Expression exp;
        exp.type = Expression::Type::String;
        exp.s = in.string();

        state.addExpression(exp);
    }
};

template<> struct action< key_path >
{
    static void apply( const input & in, ParserState & state )
    {
        std::cout << in.string() << std::endl;

        Expression exp;
        exp.type = Expression::Type::KeyPath;
        exp.s = in.string();

        state.addExpression(std::move(exp));
    }
};

template<> struct action< number >
{
    static void apply( const input & in, ParserState & state )
    {
        std::cout << in.string() << std::endl;

        Expression exp;
        exp.type = Expression::Type::Number;
        exp.s = in.string();

        state.addExpression(std::move(exp));
    }
};

#define OPERATOR_ACTION(rule, oper)                                 \
template<> struct action< rule > {                                  \
    static void apply( const input & in, ParserState & state ) {    \
        std::cout << in.string() << std::endl;      \
        state.current()->op = oper; }};

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

        Predicate group;
        group.type = Predicate::Type::And;
        if (state.negate_next) {
            group.negate = true;
            state.negate_next = false;
        }

        state.current()->sub_predicates.emplace_back(std::move(group));
        state.predicate_stack.push_back(&state.current()->sub_predicates.back());
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

    Predicate out_predicate;
    out_predicate.type = Predicate::Type::And;

    ParserState state;
    state.predicate_stack.push_back(&out_predicate);

    pegtl::parse< must< pred, eof >, action >(query, source, state);
    return out_predicate;
}

}}


