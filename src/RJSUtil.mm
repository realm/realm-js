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

#import "RJSUtil.hpp"

void RJSRegisterGlobalClass(JSContextRef ctx, JSObjectRef globalObject, JSClassRef classRef, const char * name, JSValueRef *exception) {
    JSObjectRef classObject = JSObjectMake(ctx, classRef, NULL);
    JSStringRef nameString = JSStringCreateWithUTF8CString(name);
    JSObjectSetProperty(ctx, globalObject, nameString, classObject, kJSPropertyAttributeNone, exception);
    JSStringRelease(nameString);
}

JSValueRef RJSMakeError(JSContextRef ctx, RJSException &exp) {
    JSValueRef value = exp.exception();
    return JSObjectMakeError(ctx, 1, &value, NULL);
}

JSValueRef RJSMakeError(JSContextRef ctx, std::exception &exp) {
    if (RJSException *rjsExp = dynamic_cast<RJSException *>(&exp)) {
        return RJSMakeError(ctx, *rjsExp);
    }
    return RJSMakeError(ctx, exp.what());
}

JSValueRef RJSMakeError(JSContextRef ctx, const std::string &message) {
    JSValueRef value = RJSValueForString(ctx, message);
    return JSObjectMakeError(ctx, 1, &value, NULL);
}

std::string RJSStringForJSString(JSStringRef jsString) {
    std::string str;
    size_t maxSize = JSStringGetMaximumUTF8CStringSize(jsString);
    str.resize(maxSize);
    str.resize(JSStringGetUTF8CString(jsString, &str[0], maxSize) - 1);
    return str;
}

std::string RJSValidatedStringForValue(JSContextRef ctx, JSValueRef value, const char * name) {
    if (!JSValueIsString(ctx, value)) {
        if (name) {
            throw std::invalid_argument((std::string)"'" + name + "' must be of type 'string'");
        }
        else {
            throw std::invalid_argument("JSValue must be of type 'string'");
        }
    }

    JSValueRef *exception;
    JSStringRef jsString = JSValueToStringCopy(ctx, value, exception);
    if (!jsString) {
        throw RJSException(ctx, *exception);
    }

    return RJSStringForJSString(jsString);
}

JSStringRef RJSStringForString(const std::string &str) {
    return JSStringCreateWithUTF8CString(str.c_str());
}

JSValueRef RJSValueForString(JSContextRef ctx, const std::string &str) {
    JSStringRef jsStr = RJSStringForString(str);
    JSValueRef value = JSValueMakeString(ctx, jsStr);
    JSStringRelease(jsStr);
    return value;
}

bool RJSIsValueArray(JSContextRef ctx, JSValueRef value) {
    static JSStringRef arrayString = JSStringCreateWithUTF8CString("Array");
    return RJSIsValueObjectOfType(ctx, value, arrayString);
}



#include <realm.hpp>
#include "object_store.hpp"

// check a precondition and throw an exception if it is not met
// this should be used iff the condition being false indicates a bug in the caller
// of the function checking its preconditions
static void RLMPrecondition(bool condition, NSString *name, NSString *format, ...) {
    if (__builtin_expect(condition, 1)) {
        return;
    }

    va_list args;
    va_start(args, format);
    NSString *reason = [[NSString alloc] initWithFormat:format arguments:args];
    va_end(args);

    throw std::runtime_error(reason.UTF8String);
}

// FIXME: TrueExpression and FalseExpression should be supported by core in some way
struct TrueExpression : realm::Expression {
    size_t find_first(size_t start, size_t end) const override
    {
        if (start != end)
            return start;

        return realm::not_found;
    }
    void set_table() override {}
    const realm::Table* get_table() override { return nullptr; }
};

struct FalseExpression : realm::Expression {
    size_t find_first(size_t, size_t) const override { return realm::not_found; }
    void set_table() override {}
    const realm::Table* get_table() override { return nullptr; }
};

NSString *operatorName(NSPredicateOperatorType operatorType)
{
    switch (operatorType) {
        case NSLessThanPredicateOperatorType:
            return @"<";
        case NSLessThanOrEqualToPredicateOperatorType:
            return @"<=";
        case NSGreaterThanPredicateOperatorType:
            return @">";
        case NSGreaterThanOrEqualToPredicateOperatorType:
            return @">=";
        case NSEqualToPredicateOperatorType:
            return @"==";
        case NSNotEqualToPredicateOperatorType:
            return @"!=";
        case NSMatchesPredicateOperatorType:
            return @"MATCHES";
        case NSLikePredicateOperatorType:
            return @"LIKE";
        case NSBeginsWithPredicateOperatorType:
            return @"BEGINSWITH";
        case NSEndsWithPredicateOperatorType:
            return @"ENDSWITH";
        case NSInPredicateOperatorType:
            return @"IN";
        case NSContainsPredicateOperatorType:
            return @"CONTAINS";
        case NSBetweenPredicateOperatorType:
            return @"BETWEENS";
        case NSCustomSelectorPredicateOperatorType:
            return @"custom selector";
    }

    return [NSString stringWithFormat:@"unknown operator %lu", (unsigned long)operatorType];
}

// add a clause for numeric constraints based on operator type
template <typename A, typename B>
void add_numeric_constraint_to_query(realm::Query& query,
                                     realm::PropertyType datatype,
                                     NSPredicateOperatorType operatorType,
                                     A lhs,
                                     B rhs)
{
    switch (operatorType) {
        case NSLessThanPredicateOperatorType:
            query.and_query(lhs < rhs);
            break;
        case NSLessThanOrEqualToPredicateOperatorType:
            query.and_query(lhs <= rhs);
            break;
        case NSGreaterThanPredicateOperatorType:
            query.and_query(lhs > rhs);
            break;
        case NSGreaterThanOrEqualToPredicateOperatorType:
            query.and_query(lhs >= rhs);
            break;
        case NSEqualToPredicateOperatorType:
            query.and_query(lhs == rhs);
            break;
        case NSNotEqualToPredicateOperatorType:
            query.and_query(lhs != rhs);
            break;
        default: {
            NSString *error = [NSString stringWithFormat:@"Operator '%@' not supported for type %s", operatorName(operatorType), realm::string_for_property_type(datatype)];
            throw std::runtime_error(error.UTF8String);
        }
    }
}

template <typename A, typename B>
void add_bool_constraint_to_query(realm::Query &query, NSPredicateOperatorType operatorType, A lhs, B rhs) {
    switch (operatorType) {
        case NSEqualToPredicateOperatorType:
            query.and_query(lhs == rhs);
            break;
        case NSNotEqualToPredicateOperatorType:
            query.and_query(lhs != rhs);
            break;
        default: {
            NSString *error = [NSString stringWithFormat:@"Operator '%@' not supported for bool type", operatorName(operatorType)];
            throw std::runtime_error(error.UTF8String);
        }
    }
}

void add_string_constraint_to_query(realm::Query &query,
                                    NSPredicateOperatorType operatorType,
                                    NSComparisonPredicateOptions predicateOptions,
                                    realm::Columns<realm::String> &&column,
                                    NSString *value) {
    bool caseSensitive = !(predicateOptions & NSCaseInsensitivePredicateOption);
    bool diacriticInsensitive = (predicateOptions & NSDiacriticInsensitivePredicateOption);
    RLMPrecondition(!diacriticInsensitive, @"Invalid predicate option",
                    @"NSDiacriticInsensitivePredicateOption not supported for string type");

    realm::StringData sd = value.UTF8String;
    switch (operatorType) {
        case NSBeginsWithPredicateOperatorType:
            query.and_query(column.begins_with(sd, caseSensitive));
            break;
        case NSEndsWithPredicateOperatorType:
            query.and_query(column.ends_with(sd, caseSensitive));
            break;
        case NSContainsPredicateOperatorType:
            query.and_query(column.contains(sd, caseSensitive));
            break;
        case NSEqualToPredicateOperatorType:
            query.and_query(column.equal(sd, caseSensitive));
            break;
        case NSNotEqualToPredicateOperatorType:
            query.and_query(column.not_equal(sd, caseSensitive));
            break;
        default: {
            NSString *error = [NSString stringWithFormat:@"Operator '%@' not supported for string type", operatorName(operatorType)];
            throw std::runtime_error(error.UTF8String);
        }
    }
}

void add_string_constraint_to_query(realm::Query& query,
                                    NSPredicateOperatorType operatorType,
                                    NSComparisonPredicateOptions predicateOptions,
                                    NSString *value,
                                    realm::Columns<realm::String>&& column) {
    switch (operatorType) {
        case NSEqualToPredicateOperatorType:
        case NSNotEqualToPredicateOperatorType:
            add_string_constraint_to_query(query, operatorType, predicateOptions, std::move(column), value);
            break;
        default: {
            NSString *error = [NSString stringWithFormat:@"Operator '%@' is not supported for string type with key path on right side of operator",
                               operatorName(operatorType)];
            throw std::runtime_error(error.UTF8String);
        }
    }
}

template<typename T>
static inline T *RLMDynamicCast(__unsafe_unretained id obj) {
    if ([obj isKindOfClass:[T class]]) {
        return obj;
    }
    return nil;
}

id value_from_constant_expression_or_value(id value) {
    if (NSExpression *exp = RLMDynamicCast<NSExpression>(value)) {
        RLMPrecondition(exp.expressionType == NSConstantValueExpressionType,
                        @"Invalid value",
                        @"Expressions within predicate aggregates must be constant values");
        return exp.constantValue;
    }
    return value;
}

// iterate over an array of subpredicates, using @func to build a query from each
// one and ORing them together
template<typename Func>
void process_or_group(realm::Query &query, id array, Func&& func) {
    RLMPrecondition([array conformsToProtocol:@protocol(NSFastEnumeration)],
                    @"Invalid value", @"IN clause requires an array of items");

    query.group();

    bool first = true;
    for (id item in array) {
        if (!first) {
            query.Or();
        }
        first = false;

        func(item);
    }

    if (first) {
        // Queries can't be empty, so if there's zero things in the OR group
        // validation will fail. Work around this by adding an expression which
        // will never find any rows in a table.
        query.expression(new FalseExpression);
    }

    query.end_group();
}

template <typename RequestedType, typename TableGetter>
struct ColumnOfTypeHelper {
    static realm::Columns<RequestedType> convert(TableGetter&& table, NSUInteger idx)
    {
        return table()->template column<RequestedType>(idx);
    }
};

template <typename TableGetter>
struct ColumnOfTypeHelper<realm::DateTime, TableGetter> {
    static realm::Columns<realm::Int> convert(TableGetter&& table, NSUInteger idx)
    {
        return table()->template column<realm::Int>(idx);
    }
};

template <typename RequestedType, typename TableGetter>
struct ValueOfTypeHelper;

template <typename TableGetter>
struct ValueOfTypeHelper<realm::DateTime, TableGetter> {
    static realm::Int convert(TableGetter&&, id value)
    {
        return [value timeIntervalSince1970];
    }
};

template <typename TableGetter>
struct ValueOfTypeHelper<bool, TableGetter> {
    static bool convert(TableGetter&&, id value)
    {
        return [value boolValue];
    }
};

template <typename TableGetter>
struct ValueOfTypeHelper<realm::Double, TableGetter> {
    static realm::Double convert(TableGetter&&, id value)
    {
        return [value doubleValue];
    }
};

template <typename TableGetter>
struct ValueOfTypeHelper<realm::Float, TableGetter> {
    static realm::Float convert(TableGetter&&, id value)
    {
        return [value floatValue];
    }
};

template <typename TableGetter>
struct ValueOfTypeHelper<realm::Int, TableGetter> {
    static realm::Int convert(TableGetter&&, id value)
    {
        return [value longLongValue];
    }
};

template <typename TableGetter>
struct ValueOfTypeHelper<realm::String, TableGetter> {
    static id convert(TableGetter&&, id value)
    {
        return value;
    }
};

template <typename RequestedType, typename Value, typename TableGetter>
auto value_of_type_for_query(TableGetter&& tables, Value&& value)
{
    const bool isColumnIndex = std::is_same<NSUInteger, typename std::remove_reference<Value>::type>::value;
    using helper = std::conditional_t<isColumnIndex,
    ColumnOfTypeHelper<RequestedType, TableGetter>,
    ValueOfTypeHelper<RequestedType, TableGetter>>;
    return helper::convert(std::forward<TableGetter>(tables), std::forward<Value>(value));
}

template <typename... T>
void add_constraint_to_query(realm::Query &query, realm::PropertyType type,
                             NSPredicateOperatorType operatorType,
                             NSComparisonPredicateOptions predicateOptions,
                             std::vector<NSUInteger> linkColumns, T... values)
{
    static_assert(sizeof...(T) == 2, "add_constraint_to_query accepts only two values as arguments");

    auto table = [&] {
        realm::TableRef& tbl = query.get_table();
        for (NSUInteger col : linkColumns) {
            tbl->link(col); // mutates m_link_chain on table
        }
        return tbl.get();
    };

    switch (type) {
        case realm::PropertyTypeBool:
            add_bool_constraint_to_query(query, operatorType, value_of_type_for_query<bool>(table, values)...);
            break;
        case realm::PropertyTypeDate:
            add_numeric_constraint_to_query(query, type, operatorType, value_of_type_for_query<realm::DateTime>(table, values)...);
            break;
        case realm::PropertyTypeDouble:
            add_numeric_constraint_to_query(query, type, operatorType, value_of_type_for_query<realm::Double>(table, values)...);
            break;
        case realm::PropertyTypeFloat:
            add_numeric_constraint_to_query(query, type, operatorType, value_of_type_for_query<realm::Float>(table, values)...);
            break;
        case realm::PropertyTypeInt:
            add_numeric_constraint_to_query(query, type, operatorType, value_of_type_for_query<realm::Int>(table, values)...);
            break;
        case realm::PropertyTypeString:
        case realm::PropertyTypeData:
            add_string_constraint_to_query(query, operatorType, predicateOptions, value_of_type_for_query<realm::String>(table, values)...);
            break;
        default: {
            NSString *error = [NSString stringWithFormat:@"Object type %s not supported", realm::string_for_property_type(type)];
            throw std::runtime_error(error.UTF8String);
        }
    }
}


realm::Property *get_property_from_key_path(realm::Schema &schema, realm::ObjectSchema &desc,
                                        NSString *keyPath, std::vector<NSUInteger> &indexes, bool isAny)
{
    realm::Property *prop = nullptr;

    NSString *prevPath = nil;
    NSUInteger start = 0, length = keyPath.length, end = NSNotFound;
    do {
        end = [keyPath rangeOfString:@"." options:0 range:{start, length - start}].location;
        NSString *path = [keyPath substringWithRange:{start, end == NSNotFound ? length - start : end - start}];
        if (prop) {
            RLMPrecondition(prop->type == realm::PropertyTypeObject || prop->type == realm::PropertyTypeArray,
                            @"Invalid value", @"Property '%@' is not a link in object of type '%s'", prevPath, desc.name.c_str());
            indexes.push_back(prop->table_column);
            prop = desc.property_for_name(path.UTF8String);
            RLMPrecondition(prop, @"Invalid property name",
                            @"Property '%@' not found in object of type '%s'", path, desc.name.c_str());
        }
        else {
            prop = desc.property_for_name(path.UTF8String);
            RLMPrecondition(prop, @"Invalid property name",
                            @"Property '%@' not found in object of type '%s'", path, desc.name.c_str());

            if (isAny) {
                RLMPrecondition(prop->type == realm::PropertyTypeArray,
                                @"Invalid predicate",
                                @"ANY modifier can only be used for RLMArray properties");
            }
            else {
                RLMPrecondition(prop->type != realm::PropertyTypeArray,
                                @"Invalid predicate",
                                @"RLMArray predicates must contain the ANY modifier");
            }
        }

        if (prop->object_type.length()) {
            desc = *schema.find(prop->object_type);
        }
        prevPath = path;
        start = end + 1;
    } while (end != NSNotFound);
    
    return prop;
}

void update_query_with_value_expression(realm::Schema &schema,
                                        realm::ObjectSchema &desc,
                                        realm::Query &query,
                                        NSString *keyPath,
                                        id value,
                                        NSComparisonPredicate *pred)
{
    bool isAny = pred.comparisonPredicateModifier == NSAnyPredicateModifier;
    std::vector<NSUInteger> indexes;
    realm::Property *prop = get_property_from_key_path(schema, desc, keyPath, indexes, isAny);

    NSUInteger index = prop->table_column;

    // check to see if this is a between query
    if (pred.predicateOperatorType == NSBetweenPredicateOperatorType) {
        throw std::runtime_error("BETWEEN queries not supported");
    }

    // turn IN into ored together ==
    if (pred.predicateOperatorType == NSInPredicateOperatorType) {
        process_or_group(query, value, [&](id item) {
            id normalized = value_from_constant_expression_or_value(item);
            add_constraint_to_query(query, prop->type, NSEqualToPredicateOperatorType,
                                    pred.options, indexes, index, normalized);
        });
        return;
    }

    if (pred.leftExpression.expressionType == NSKeyPathExpressionType) {
        add_constraint_to_query(query, prop->type, pred.predicateOperatorType,
                                pred.options, indexes, index, value);
    } else {
        add_constraint_to_query(query, prop->type, pred.predicateOperatorType,
                                pred.options, indexes, value, index);
    }
}


void update_query_with_predicate(NSPredicate *predicate, realm::Schema &schema, realm::ObjectSchema &objectSchema, realm::Query &query)
{
    // Compound predicates.
    if ([predicate isMemberOfClass:[NSCompoundPredicate class]]) {
        NSCompoundPredicate *comp = (NSCompoundPredicate *)predicate;

        switch ([comp compoundPredicateType]) {
            case NSAndPredicateType:
                if (comp.subpredicates.count) {
                    // Add all of the subpredicates.
                    query.group();
                    for (NSPredicate *subp in comp.subpredicates) {
                        update_query_with_predicate(subp, schema, objectSchema, query);
                    }
                    query.end_group();
                } else {
                    // NSCompoundPredicate's documentation states that an AND predicate with no subpredicates evaluates to TRUE.
                    query.expression(new TrueExpression);
                }
                break;

            case NSOrPredicateType: {
                // Add all of the subpredicates with ors inbetween.
                process_or_group(query, comp.subpredicates, [&](__unsafe_unretained NSPredicate *const subp) {
                    update_query_with_predicate(subp, schema, objectSchema, query);
                });
                break;
            }

            case NSNotPredicateType:
                // Add the negated subpredicate
                query.Not();
                update_query_with_predicate(comp.subpredicates.firstObject, schema, objectSchema, query);
                break;

            default:
                throw std::runtime_error("Invalid compound predicate type - Only support AND, OR and NOT predicate types");
        }
    }
    else if ([predicate isMemberOfClass:[NSComparisonPredicate class]]) {
        NSComparisonPredicate *compp = (NSComparisonPredicate *)predicate;

        // check modifier
        RLMPrecondition(compp.comparisonPredicateModifier != NSAllPredicateModifier,
                        @"Invalid predicate", @"ALL modifier not supported");

        NSExpressionType exp1Type = compp.leftExpression.expressionType;
        NSExpressionType exp2Type = compp.rightExpression.expressionType;

        if (compp.comparisonPredicateModifier == NSAnyPredicateModifier) {
            // for ANY queries
            RLMPrecondition(exp1Type == NSKeyPathExpressionType && exp2Type == NSConstantValueExpressionType,
                            @"Invalid predicate",
                            @"Predicate with ANY modifier must compare a KeyPath with RLMArray with a value");
        }

        if (compp.predicateOperatorType == NSBetweenPredicateOperatorType || compp.predicateOperatorType == NSInPredicateOperatorType) {
            // Inserting an array via %@ gives NSConstantValueExpressionType, but
            // including it directly gives NSAggregateExpressionType
            if (exp1Type != NSKeyPathExpressionType || (exp2Type != NSAggregateExpressionType && exp2Type != NSConstantValueExpressionType)) {
                NSString * error = [NSString stringWithFormat:@"Predicate with %s operator must compare a KeyPath with an aggregate with two values", compp.predicateOperatorType == NSBetweenPredicateOperatorType ? "BETWEEN" : "IN"];
                throw std::runtime_error(error.UTF8String);
            }
            exp2Type = NSConstantValueExpressionType;
        }

        if (exp1Type == NSKeyPathExpressionType && exp2Type == NSConstantValueExpressionType) {
            // comparing keypath to value
            update_query_with_value_expression(schema, objectSchema, query, compp.leftExpression.keyPath,
                                               compp.rightExpression.constantValue, compp);
        }
        else if (exp1Type == NSConstantValueExpressionType && exp2Type == NSKeyPathExpressionType) {
            // comparing value to keypath
            update_query_with_value_expression(schema, objectSchema, query, compp.rightExpression.keyPath,
                                               compp.leftExpression.constantValue, compp);
        }
        //if (exp1Type == NSKeyPathExpressionType && exp2Type == NSKeyPathExpressionType) {
            // both expression are KeyPaths
        //    update_query_with_column_expression(objectSchema, query, compp.leftExpression.keyPath,
        //                                        compp.rightExpression.keyPath, compp);
        //}
        else {
            throw std::runtime_error("Predicate expressions must compare a keypath and another keypath or a constant value");
        }
    }
    else if ([predicate isEqual:[NSPredicate predicateWithValue:YES]]) {
        query.expression(new TrueExpression);
    } else if ([predicate isEqual:[NSPredicate predicateWithValue:NO]]) {
        query.expression(new FalseExpression);
    }
    else {
        // invalid predicate type
        throw std::runtime_error("Only support compound, comparison, and constant predicates");
    }
}

void RLMUpdateQueryWithPredicate(realm::Query *query, NSPredicate *predicate, realm::Schema &schema, realm::ObjectSchema &objectSchema)
{
    // passing a nil predicate is a no-op
    if (!predicate) {
        return;
    }

    RLMPrecondition([predicate isKindOfClass:NSPredicate.class], @"Invalid argument", @"predicate must be an NSPredicate object");

    update_query_with_predicate(predicate, schema, objectSchema, *query);

    // Test the constructed query in core
    std::string validateMessage = query->validate();
    RLMPrecondition(validateMessage.empty(), @"Invalid query", @"%.*s", (int)validateMessage.size(), validateMessage.c_str());
}
