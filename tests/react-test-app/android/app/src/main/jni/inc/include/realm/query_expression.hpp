/*************************************************************************
 *
 * REALM CONFIDENTIAL
 * __________________
 *
 *  [2011] - [2012] Realm Inc
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Realm Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Realm Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Realm Incorporated.
 *
 **************************************************************************/

/*
This file lets you write queries in C++ syntax like: Expression* e = (first + 1 / second >= third + 12.3);

Type conversion/promotion semantics is the same as in the C++ expressions, e.g float + int > double == float +
(float)int > double.


Grammar:
-----------------------------------------------------------------------------------------------------------------------
    Expression:         Subexpr2<T>  Compare<Cond, T>  Subexpr2<T>
                        operator! Expression

    Subexpr2<T>:        Value<T>
                        Columns<T>
                        Subexpr2<T>  Operator<Oper<T>  Subexpr2<T>
                        power(Subexpr2<T>) // power(x) = x * x, as example of unary operator

    Value<T>:           T

    Operator<Oper<T>>:  +, -, *, /

    Compare<Cond, T>:   ==, !=, >=, <=, >, <

    T:                  bool, int, int64_t, float, double, StringData


Class diagram
-----------------------------------------------------------------------------------------------------------------------
Subexpr2
    void evaluate(size_t i, ValueBase* destination)

Compare: public Subexpr2
    size_t find_first(size_t start, size_t end)     // main method that executes query

    unique_ptr<Subexpr2> m_left;                               // left expression subtree
    unique_ptr<Subexpr2> m_right;                              // right expression subtree

Operator: public Subexpr2
    void evaluate(size_t i, ValueBase* destination)
    unique_ptr<Subexpr2> m_left;                               // left expression subtree
    unique_ptr<Subexpr2> m_right;                              // right expression subtree

Value<T>: public Subexpr2
    void evaluate(size_t i, ValueBase* destination)
    T m_v[8];

Columns<T>: public Subexpr2
    void evaluate(size_t i, ValueBase* destination)
    SequentialGetter<T> sg;                         // class bound to a column, lets you read values in a fast way
    Table* m_table;

class ColumnAccessor<>: public Columns<double>


Call diagram:
-----------------------------------------------------------------------------------------------------------------------
Example of 'table.first > 34.6 + table.second':

size_t Compare<Greater>::find_first()-------------+
         |                                        |
         |                                        |
         |                                        |
         +--> Columns<float>::evaluate()          +--------> Operator<Plus>::evaluate()
                                                                |               |
                                               Value<float>::evaluate()    Columns<float>::evaluate()

Operator, Value and Columns have an evaluate(size_t i, ValueBase* destination) method which returns a Value<T>
containing 8 values representing table rows i...i + 7.

So Value<T> contains 8 concecutive values and all operations are based on these chunks. This is
to save overhead by virtual calls needed for evaluating a query that has been dynamically constructed at runtime.


Memory allocation:
-----------------------------------------------------------------------------------------------------------------------
Subexpressions created by the end-user are stack allocated. They are cloned to the heap when passed to UnaryOperator,
Operator, and Compare. Those types own the clones and deallocate them when destroyed.


Caveats, notes and todos
-----------------------------------------------------------------------------------------------------------------------
    * Perhaps disallow columns from two different tables in same expression
    * The name Columns (with s) an be confusing because we also have Column (without s)
    * We have Columns::m_table, Query::m_table and ColumnAccessorBase::m_table that point at the same thing, even with
      ColumnAccessor<> extending Columns. So m_table is redundant, but this is in order to keep class dependencies and
      entanglement low so that the design is flexible (if you perhaps later want a Columns class that is not dependent
      on ColumnAccessor)

Nulls
-----------------------------------------------------------------------------------------------------------------------
First note that at array level, nulls are distinguished between non-null in different ways:
String:
    m_data == 0 && m_size == 0

Integer, Bool, DateTime stored in ArrayIntNull:
    value == get(0) (entry 0 determins a magic value that represents nulls)

Float/double:
    null::is_null(value) which tests if value bit-matches one specific bit pattern reserved for null

The Columns class encapsulates all this into a simple class that, for any type T has
    evaluate(size_t index) that reads values from a column, taking nulls in count
    get(index)
    set(index)
    is_null(index)
    set_null(index)
*/

#ifndef REALM_QUERY_EXPRESSION_HPP
#define REALM_QUERY_EXPRESSION_HPP

#include <realm/column_type_traits.hpp>
#include <realm/util/optional.hpp>
#include <realm/impl/sequential_getter.hpp>

// Normally, if a next-generation-syntax condition is supported by the old query_engine.hpp, a query_engine node is
// created because it's faster (by a factor of 5 - 10). Because many of our existing next-generation-syntax unit
// unit tests are indeed simple enough to fallback to old query_engine, query_expression gets low test coverage. Undef
// flag to get higher query_expression test coverage. This is a good idea to try out each time you develop on/modify
// query_expression.

#define REALM_OLDQUERY_FALLBACK

namespace realm {

template<class T>
T minimum(T a, T b)
{
    return a < b ? a : b;
}

// FIXME, this needs to exist elsewhere
typedef int64_t             Int;
typedef bool                Bool;
typedef realm::DateTime   DateTime;
typedef float               Float;
typedef double              Double;
typedef realm::StringData String;
typedef realm::BinaryData Binary;

// Hack to avoid template instantiation errors. See create(). Todo, see if we can simplify only_numeric somehow
namespace {
template<class T, class U>
T only_numeric(U in)
{
    return static_cast<T>(util::unwrap(in));
}

template<class T>
int only_numeric(const StringData&)
{
    REALM_ASSERT(false);
    return 0;
}

template<class T>
int only_numeric(const BinaryData&)
{
    REALM_ASSERT(false);
    return 0;
}

template<class T>
StringData only_string(T in)
{
    REALM_ASSERT(false);
    static_cast<void>(in);
    return StringData();
}

StringData only_string(StringData in)
{
    return in;
}

// Modify in to refer to a deep clone of the data it points to, if applicable,
// and return a pointer which must be deleted if non-NULL
template<class T>
char* in_place_deep_clone(T* in)
{
    static_cast<void>(in);
    return 0;
}

char* in_place_deep_clone(StringData* in)
{
    if (in->is_null())
        return nullptr;

    char* payload = new char[in->size()];
    memcpy(payload, in->data(), in->size());
    *in = StringData(payload, in->size());
    return payload;
}

} // anonymous namespace

template<class T>struct Plus {
    T operator()(T v1, T v2) const { return v1 + v2; }
    typedef T type;
};

template<class T>struct Minus {
    T operator()(T v1, T v2) const { return v1 - v2; }
    typedef T type;
};

template<class T>struct Div {
    T operator()(T v1, T v2) const { return v1 / v2; }
    typedef T type;
};

template<class T>struct Mul {
    T operator()(T v1, T v2) const { return v1 * v2; }
    typedef T type;
};

// Unary operator
template<class T>struct Pow {
    T operator()(T v) const { return v * v; }
    typedef T type;
};

// Finds a common type for T1 and T2 according to C++ conversion/promotion in arithmetic (float + int => float, etc)
template<class T1, class T2,
    bool T1_is_int = std::numeric_limits<T1>::is_integer || std::is_same<T1, null>::value,
    bool T2_is_int = std::numeric_limits<T2>::is_integer || std::is_same<T2, null>::value,
    bool T1_is_widest = (sizeof(T1) > sizeof(T2)   ||     std::is_same<T2, null>::value    ) > struct Common;
template<class T1, class T2, bool b>
struct Common<T1, T2, b, b, true > {
    typedef T1 type;
};
template<class T1, class T2, bool b>
struct Common<T1, T2, b, b, false> {
    typedef T2 type;
};
template<class T1, class T2, bool b>
struct Common<T1, T2, false, true , b> {
    typedef T1 type;
};
template<class T1, class T2, bool b>
struct Common<T1, T2, true, false, b> {
    typedef T2 type;
};




struct ValueBase
{
    static const size_t default_size = 8;
    virtual void export_bool(ValueBase& destination) const = 0;
    virtual void export_int(ValueBase& destination) const = 0;
    virtual void export_float(ValueBase& destination) const = 0;
    virtual void export_int64_t(ValueBase& destination) const = 0;
    virtual void export_double(ValueBase& destination) const = 0;
    virtual void export_StringData(ValueBase& destination) const = 0;
    virtual void export_BinaryData(ValueBase& destination) const = 0;
    virtual void export_null(ValueBase& destination) const = 0;
    virtual void import(const ValueBase& destination) = 0;

    // If true, all values in the class come from a link list of a single field in the parent table (m_table). If
    // false, then values come from successive rows of m_table (query operations are operated on in bulks for speed)
    bool m_from_link_list;

    // Number of values stored in the class.
    size_t m_values;
};

class Expression
{
public:
    Expression() { }

    virtual size_t find_first(size_t start, size_t end) const = 0;
    virtual void set_table() = 0;
    virtual const Table* get_table() const = 0;
    virtual ~Expression() {}
};

class Subexpr
{
public:
    virtual ~Subexpr() {}

    virtual std::unique_ptr<Subexpr> clone() const = 0;

    // Recursively set table pointers for all Columns object in the expression tree. Used for late binding of table
    virtual void set_table() {}

    // Recursively fetch tables of columns in expression tree. Used when user first builds a stand-alone expression and
    // binds it to a Query at a later time
    virtual const Table* get_table() const
    {
        return nullptr;
    }

    virtual void evaluate(size_t index, ValueBase& destination) = 0;
};

template<typename T, typename... Args>
std::unique_ptr<Subexpr> make_subexpr(Args&&... args)
{
    return std::unique_ptr<Subexpr>(new T(std::forward<Args>(args)...));
}

template<class T>
class Columns;
template<class T>
class Value;
template<class T>
class Subexpr2;
template<class oper, class TLeft = Subexpr, class TRight = Subexpr>
class Operator;
template<class oper, class TLeft = Subexpr>
class UnaryOperator;
template<class TCond, class T, class TLeft = Subexpr, class TRight = Subexpr>
class Compare;
template<bool has_links>
class UnaryLinkCompare;
class ColumnAccessorBase;


// Handle cases where left side is a constant (int, float, int64_t, double, StringData)
template<class L, class Cond, class R>
Query create(L left, const Subexpr2<R>& right)
{
    // Purpose of below code is to intercept the creation of a condition and test if it's supported by the old
    // query_engine.hpp which is faster. If it's supported, create a query_engine.hpp node, otherwise create a
    // query_expression.hpp node.
    //
    // This method intercepts only Value <cond> Subexpr2. Interception of Subexpr2 <cond> Subexpr is elsewhere.

#ifdef REALM_OLDQUERY_FALLBACK // if not defined, then never fallback to query_engine.hpp; always use query_expression
    const Columns<R>* column = dynamic_cast<const Columns<R>*>(&right);

    if (column &&
        ((std::numeric_limits<L>::is_integer && std::numeric_limits<L>::is_integer) ||
        (std::is_same<L, double>::value && std::is_same<R, double>::value) ||
        (std::is_same<L, float>::value && std::is_same<R, float>::value) ||
        (std::is_same<L, StringData>::value && std::is_same<R, StringData>::value) ||
        (std::is_same<L, BinaryData>::value && std::is_same<R, BinaryData>::value))
        &&
        !column->links_exist()) {
        const Table* t = column->get_table();
        Query q = Query(*t);

        if (std::is_same<Cond, Less>::value)
            q.greater(column->m_column, only_numeric<R>(left));
        else if (std::is_same<Cond, Greater>::value)
            q.less(column->m_column, only_numeric<R>(left));
        else if (std::is_same<Cond, Equal>::value)
            q.equal(column->m_column, left);
        else if (std::is_same<Cond, NotEqual>::value)
            q.not_equal(column->m_column, left);
        else if (std::is_same<Cond, LessEqual>::value)
            q.greater_equal(column->m_column, only_numeric<R>(left));
        else if (std::is_same<Cond, GreaterEqual>::value)
            q.less_equal(column->m_column, only_numeric<R>(left));
        else if (std::is_same<Cond, EqualIns>::value)
            q.equal(column->m_column, only_string(left), false);
        else if (std::is_same<Cond, NotEqualIns>::value)
            q.not_equal(column->m_column, only_string(left), false);
        else if (std::is_same<Cond, BeginsWith>::value)
            q.begins_with(column->m_column, only_string(left));
        else if (std::is_same<Cond, BeginsWithIns>::value)
            q.begins_with(column->m_column, only_string(left), false);
        else if (std::is_same<Cond, EndsWith>::value)
            q.ends_with(column->m_column, only_string(left));
        else if (std::is_same<Cond, EndsWithIns>::value)
            q.ends_with(column->m_column, only_string(left), false);
        else if (std::is_same<Cond, Contains>::value)
            q.contains(column->m_column, only_string(left));
        else if (std::is_same<Cond, ContainsIns>::value)
            q.contains(column->m_column, only_string(left), false);
        else {
            // query_engine.hpp does not support this Cond. Please either add support for it in query_engine.hpp or
            // fallback to using use 'return new Compare<>' instead.
            REALM_ASSERT(false);
        }
        // Return query_engine.hpp node
        return q;
    }
    else
#endif
    {
        // If we're searching for a string, create a deep copy of the search string
        // which will be deleted by the Compare instance.
        char* compare_string = in_place_deep_clone(&left);

        // Return query_expression.hpp node
        using CommonType = typename Common<L, R>::type;
        return new Compare<Cond, CommonType>(make_subexpr<Value<L>>(left), right.clone(), compare_string);
    }
}


// All overloads where left-hand-side is Subexpr2<L>:
//
// left-hand-side       operator                              right-hand-side
// Subexpr2<L>          +, -, *, /, <, >, ==, !=, <=, >=      R, Subexpr2<R>
//
// For L = R = {int, int64_t, float, double, StringData}:
template<class L, class R>
class Overloads
{
    typedef typename Common<L, R>::type CommonType;

    std::unique_ptr<Subexpr> clone_subexpr() const
    {
        return static_cast<const Subexpr2<L>&>(*this).clone();
    }

public:

    // Arithmetic, right side constant
    Operator<Plus<CommonType>> operator + (R right) const
    {
        return { clone_subexpr(), make_subexpr<Value<R>>(right) };
    }
    Operator<Minus<CommonType>> operator - (R right) const
    {
        return { clone_subexpr(), make_subexpr<Value<R>>(right) };
    }
    Operator<Mul<CommonType>> operator * (R right) const
    {
        return { clone_subexpr(), make_subexpr<Value<R>>(right) };
    }
    Operator<Div<CommonType>> operator / (R right) const
    {
        return { clone_subexpr(), make_subexpr<Value<R>>(right) };
    }

    // Arithmetic, right side subexpression
    Operator<Plus<CommonType>> operator + (const Subexpr2<R>& right) const
    {
        return { clone_subexpr(), right.clone() };
    }
    Operator<Minus<CommonType>> operator - (const Subexpr2<R>& right) const
    {
        return { clone_subexpr(), right.clone() };
    }
    Operator<Mul<CommonType>> operator * (const Subexpr2<R>& right) const
    {
        return { clone_subexpr(), right.clone() };
    }
    Operator<Div<CommonType>> operator / (const Subexpr2<R>& right) const
    {
        return { clone_subexpr(), right.clone() };
    }

    // Compare, right side constant
    Query operator > (R right)
    {
        return create<R, Less, L>(right, static_cast<Subexpr2<L>&>(*this));
    }
    Query operator < (R right)
    {
        return create<R, Greater, L>(right, static_cast<Subexpr2<L>&>(*this));
    }
    Query operator >= (R right)
    {
        return create<R, LessEqual, L>(right, static_cast<Subexpr2<L>&>(*this));
    }
    Query operator <= (R right)
    {
        return create<R, GreaterEqual, L>(right, static_cast<Subexpr2<L>&>(*this));
    }
    Query operator == (R right)
    {
        return create<R, Equal, L>(right, static_cast<Subexpr2<L>&>(*this));
    }
    Query operator != (R right)
    {
        return create<R, NotEqual, L>(right, static_cast<Subexpr2<L>&>(*this));
    }

    // Purpose of this method is to intercept the creation of a condition and test if it's supported by the old
    // query_engine.hpp which is faster. If it's supported, create a query_engine.hpp node, otherwise create a
    // query_expression.hpp node.
    //
    // This method intercepts Subexpr2 <cond> Subexpr2 only. Value <cond> Subexpr2 is intercepted elsewhere.
    template<class Cond>
    Query create2 (const Subexpr2<R>& right)
    {
#ifdef REALM_OLDQUERY_FALLBACK // if not defined, never fallback query_engine; always use query_expression
        // Test if expressions are of type Columns. Other possibilities are Value and Operator.
        const Columns<R>* left_col = dynamic_cast<const Columns<R>*>(static_cast<Subexpr2<L>*>(this));
        const Columns<R>* right_col = dynamic_cast<const Columns<R>*>(&right);

        // query_engine supports 'T-column <op> <T-column>' for T = {int64_t, float, double}, op = {<, >, ==, !=, <=, >=},
        // but only if both columns are non-nullable, and aren't in linked tables.
        if (left_col && right_col && std::is_same<L, R>::value && !left_col->m_nullable && !right_col->m_nullable
            && !left_col->links_exist() && !right_col->links_exist()) {
            const Table* t = left_col->get_table();
            Query q = Query(*t);

            if (std::numeric_limits<L>::is_integer || std::is_same<L, DateTime>::value) {
                if (std::is_same<Cond, Less>::value)
                    q.less_int(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, Greater>::value)
                    q.greater_int(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, Equal>::value)
                    q.equal_int(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, NotEqual>::value)
                    q.not_equal_int(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, LessEqual>::value)
                    q.less_equal_int(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, GreaterEqual>::value)
                    q.greater_equal_int(left_col->m_column, right_col->m_column);
                else {
                    REALM_ASSERT(false);
                }
            }
            else if (std::is_same<L, float>::value) {
                if (std::is_same<Cond, Less>::value)
                    q.less_float(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, Greater>::value)
                    q.greater_float(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, Equal>::value)
                    q.equal_float(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, NotEqual>::value)
                    q.not_equal_float(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, LessEqual>::value)
                    q.less_equal_float(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, GreaterEqual>::value)
                    q.greater_equal_float(left_col->m_column, right_col->m_column);
                else {
                    REALM_ASSERT(false);
                }
            }
            else if (std::is_same<L, double>::value) {
                if (std::is_same<Cond, Less>::value)
                    q.less_double(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, Greater>::value)
                    q.greater_double(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, Equal>::value)
                    q.equal_double(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, NotEqual>::value)
                    q.not_equal_double(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, LessEqual>::value)
                    q.less_equal_double(left_col->m_column, right_col->m_column);
                else if (std::is_same<Cond, GreaterEqual>::value)
                    q.greater_equal_double(left_col->m_column, right_col->m_column);
                else {
                    REALM_ASSERT(false);
                }
            }
            else {
                REALM_ASSERT(false);
            }
            // Return query_engine.hpp node
            return q;
        }
        else
#endif
        {
            // Return query_expression.hpp node
            return new Compare<Cond, typename Common<R, float>::type>(clone_subexpr(), right.clone());
        }
    }

    // Compare, right side subexpression
    Query operator == (const Subexpr2<R>& right)
    {
        return create2<Equal>(right);
    }
    Query operator != (const Subexpr2<R>& right)
    {
        return create2<NotEqual>(right);
    }
    Query operator > (const Subexpr2<R>& right)
    {
        return create2<Greater>(right);
    }
    Query operator < (const Subexpr2<R>& right)
    {
        return create2<Less>(right);
    }
    Query operator >= (const Subexpr2<R>& right)
    {
        return create2<GreaterEqual>(right);
    }
    Query operator <= (const Subexpr2<R>& right)
    {
        return create2<LessEqual>(right);
    }
};

// With this wrapper class we can define just 20 overloads inside Overloads<L, R> instead of 5 * 20 = 100. Todo: We can
// consider if it's simpler/better to remove this class completely and just list all 100 overloads manually anyway.
template<class T>
class Subexpr2 : public Subexpr, public Overloads<T, const char*>, public Overloads<T, int>, public
Overloads<T, float>, public Overloads<T, double>, public Overloads<T, int64_t>, public Overloads<T, StringData>,
public Overloads<T, bool>, public Overloads<T, DateTime>, public Overloads<T, null>
{
public:
    virtual ~Subexpr2() {};

#define RLM_U2(t, o) using Overloads<T, t>::operator o;
#define RLM_U(o) RLM_U2(int, o) RLM_U2(float, o) RLM_U2(double, o) RLM_U2(int64_t, o) RLM_U2(StringData, o) RLM_U2(bool, o) RLM_U2(DateTime, o) RLM_U2(null, o)
    RLM_U(+) RLM_U(-) RLM_U(*) RLM_U(/ ) RLM_U(> ) RLM_U(< ) RLM_U(== ) RLM_U(!= ) RLM_U(>= ) RLM_U(<= )
};


/*
This class is used to store N values of type T = {int64_t, bool, DateTime or StringData}, and allows an entry
to be null too. It's used by the Value class for internal storage.

To indicate nulls, we could have chosen a separate bool vector or some other bitmask construction. But for
performance, we customize indication of nulls to match the same indication that is used in the persisted database
file

Queries in query_expression.hpp execute by processing chunks of 8 rows at a time. Assume you have a column:

    price (int) = {1, 2, 3, null, 1, 6, 6, 9, 5, 2, null}

And perform a query:

    Query q = (price + 2 == 5);

query_expression.hpp will then create a NullableVector<int> = {5, 5, 5, 5, 5, 5, 5, 5} and then read values
NullableVector<int> = {1, 2, 3, null, 1, 6, 6, 9} from the column, and then perform `+` and `==` on these chunks.

See the top of this file for more information on all this.

Assume the user specifies the null constant in a query:

Query q = (price == null)

The query system will then construct a NullableVector of type `null` (NullableVector<null>). This allows compile
time optimizations for these cases.
*/

template<class T, size_t prealloc = 8>
struct NullableVector
{
    using Underlying = typename util::RemoveOptional<T>::type;
    using t_storage  = typename std::conditional<std::is_same<Underlying, bool>::value
        || std::is_same<Underlying, int>::value, int64_t, Underlying>::type;

    NullableVector() {};

    NullableVector& operator= (const NullableVector& other)
    {
        if (this != &other) {
            init(other.m_size);
            std::copy(other.m_first, other.m_first + other.m_size, m_first);
            m_null = other.m_null;
        }
        return *this;
    }

    NullableVector(const NullableVector& other)
    {
        init(other.m_size);
        std::copy(other.m_first, other.m_first + other.m_size, m_first);
        m_null = other.m_null;
    }

    ~NullableVector()
    {
        dealloc();
    }

    T operator[](size_t index) const
    {
        REALM_ASSERT_3(index, <, m_size);
        return static_cast<T>(m_first[index]);
    }

    inline bool is_null(size_t index) const
    {
        REALM_ASSERT((std::is_same<t_storage, int64_t>::value));
        return m_first[index] == m_null;
    }

    inline void set_null(size_t index)
    {
        REALM_ASSERT((std::is_same<t_storage, int64_t>::value));
        m_first[index] = m_null;
    }

    inline void set(size_t index, t_storage value)
    {
        REALM_ASSERT((std::is_same<t_storage, int64_t>::value));

        // If value collides with magic null value, then switch to a new unique representation for null
        if (REALM_UNLIKELY(value == m_null)) {
            // adding a prime will generate 2^64 unique values. Todo: Only works on 2's complement architecture
            uint64_t candidate = static_cast<uint64_t>(m_null) + 0xfffffffbULL;
            while (std::find(m_first, m_first + m_size, static_cast<int64_t>(candidate)) != m_first + m_size)
                candidate += 0xfffffffbULL;
            std::replace(m_first, m_first + m_size, m_null, static_cast<int64_t>(candidate));
        }
        m_first[index] = value;
    }

    inline util::Optional<T> get(size_t index) const
    {
        if (is_null(index))
            return util::none;

        return util::make_optional((*this)[index]);
    }

    inline void set(size_t index, util::Optional<Underlying> value)
    {
        if (value)
            set(index, *value);
        else
            set_null(index);
    }

    void fill(T value)
    {
        for (size_t t = 0; t < m_size; t++) {
            if (std::is_same<T, null>::value)
                set_null(t);
            else
                set(t, value);
        }
    }

    void init(size_t size)
    {
        if (size == m_size)
            return;

        dealloc();
        m_size = size;
        if (m_size > 0) {
            if (m_size > prealloc)
                m_first = reinterpret_cast<t_storage*>(new t_storage[m_size]);
            else
                m_first = m_cache;
        }
    }

    void init(size_t size, T values)
    {
        init(size);
        fill(values);
    }

    void dealloc()
    {
        if (m_first) {
            if (m_size > prealloc)
                delete[] m_first;
            m_first = nullptr;
        }
    }

    t_storage m_cache[prealloc];
    t_storage* m_first = &m_cache[0];
    size_t m_size = 0;

    int64_t m_null = reinterpret_cast<int64_t>(&m_null); // choose magic value to represent nulls
};

// Double
// NOTE: fails in gcc 4.8 without `inline`. Do not remove. Same applies for all methods below.
template<>
inline void NullableVector<double>::set(size_t index, double value)
{
    m_first[index] = value;
}

template<>
inline bool NullableVector<double>::is_null(size_t index) const
{
    return null::is_null_float(m_first[index]);
}

template<>
inline void NullableVector<double>::set_null(size_t index)
{
    m_first[index] = null::get_null_float<double>();
}

// Float
template<>
inline bool NullableVector<float>::is_null(size_t index) const
{
    return null::is_null_float(m_first[index]);
}

template<>
inline void NullableVector<float>::set_null(size_t index)
{
    m_first[index] = null::get_null_float<float>();
}

template<>
inline void NullableVector<float>::set(size_t index, float value)
{
    m_first[index] = value;
}

// Null
template<>
inline void NullableVector<null>::set_null(size_t)
{
    return;
}
template<>
inline bool NullableVector<null>::is_null(size_t) const
{
    return true;
}
template<>
inline void NullableVector<null>::set(size_t, null)
{
}

// DateTime
template<>
inline bool NullableVector<DateTime>::is_null(size_t index) const
{
    return m_first[index].get_datetime() == m_null;
}

template<>
inline void NullableVector<DateTime>::set(size_t index, DateTime value)
{
    m_first[index] = value;
}

template<>
inline void NullableVector<DateTime>::set_null(size_t index)
{
    m_first[index] = m_null;
}

// StringData
template<>
inline void NullableVector<StringData>::set(size_t index, StringData value)
{
    m_first[index] = value;
}
template<>
inline bool NullableVector<StringData>::is_null(size_t index) const
{
    return m_first[index].is_null();
}

template<>
inline void NullableVector<StringData>::set_null(size_t index)
{
    m_first[index] = StringData();
}

// BinaryData
template<>
inline void NullableVector<BinaryData>::set(size_t index, BinaryData value)
{
    m_first[index] = value;
}
template<>
inline bool NullableVector<BinaryData>::is_null(size_t index) const
{
    return m_first[index].is_null();
}

template<>
inline void NullableVector<BinaryData>::set_null(size_t index)
{
    m_first[index] = BinaryData();
}

template<typename Operator>
struct OperatorOptionalAdapter {
    template<typename L, typename R>
    util::Optional<typename Operator::type> operator()(const util::Optional<L>& left, const util::Optional<R>& right)
    {
        if (!left || !right)
            return util::none;
        return Operator()(*left, *right);
    }

    template<typename T>
    util::Optional<typename Operator::type> operator()(const util::Optional<T>& arg)
    {
        if (!arg)
            return util::none;
        return Operator()(*arg);
    }
};

// Stores N values of type T. Can also exchange data with other ValueBase of different types
template<class T>
class Value : public ValueBase, public Subexpr2<T>
{
public:
    Value()
    {
        init(false, ValueBase::default_size, T());
    }
    Value(T v)
    {
        init(false, ValueBase::default_size, v);
    }

    Value(bool from_link_list, size_t values)
    {
        init(from_link_list, values, T());
    }

    Value(bool from_link_list, size_t values, T v)
    {
        init(from_link_list, values, v);
    }

    Value(const Value&) = default;
    Value& operator=(const Value&) = default;

    void init(bool from_link_list, size_t values, T v) {
        m_storage.init(values, v);
        ValueBase::m_from_link_list = from_link_list;
        ValueBase::m_values = values;
    }

    void init(bool from_link_list, size_t values) {
        m_storage.init(values);
        ValueBase::m_from_link_list = from_link_list;
        ValueBase::m_values = values;
    }

    void evaluate(size_t, ValueBase& destination) override
    {
        destination.import(*this);
    }


    template<class TOperator>
    REALM_FORCEINLINE void fun(const Value* left, const Value* right)
    {
        OperatorOptionalAdapter<TOperator> o;

        if (!left->m_from_link_list && !right->m_from_link_list) {
            // Operate on values one-by-one (one value is one row; no links)
            size_t min = std::min(left->m_values, right->m_values);
            init(false, min);

            for (size_t i = 0; i < min; i++) {
                m_storage.set(i, o(left->m_storage.get(i), right->m_storage.get(i)));
            }
        }
        else if (left->m_from_link_list && right->m_from_link_list) {
            // FIXME: Many-to-many links not supported yet. Need to specify behaviour
            REALM_ASSERT_DEBUG(false);
        }
        else if (!left->m_from_link_list && right->m_from_link_list) {
            // Right values come from link. Left must come from single row.
            REALM_ASSERT_DEBUG(left->m_values > 0);
            init(true, right->m_values);

            auto left_value = left->m_storage.get(0);
            for (size_t i = 0; i < right->m_values; i++) {
                m_storage.set(i, o(left_value, right->m_storage.get(i)));
            }
        }
        else if (left->m_from_link_list && !right->m_from_link_list) {
            // Same as above, but with left values coming from links
            REALM_ASSERT_DEBUG(right->m_values > 0);
            init(true, left->m_values);

            auto right_value = right->m_storage.get(0);
            for (size_t i = 0; i < left->m_values; i++) {
                m_storage.set(i, o(left->m_storage.get(i), right_value));
            }
        }
    }

    template<class TOperator>
    REALM_FORCEINLINE void fun(const Value* value)
    {
        init(value->m_from_link_list, value->m_values);

        OperatorOptionalAdapter<TOperator> o;
        for (size_t i = 0; i < value->m_values; i++) {
            m_storage.set(i, o(value->m_storage.get(i)));
        }
    }


    // Below import and export methods are for type conversion between float, double, int64_t, etc.
    template<class D>
    typename std::enable_if<std::is_convertible<T, D>::value>::type
    REALM_FORCEINLINE export2(ValueBase& destination) const
    {
        Value<D>& d = static_cast<Value<D>&>(destination);
        d.init(ValueBase::m_from_link_list, ValueBase::m_values, D());
        for (size_t t = 0; t < ValueBase::m_values; t++) {
            if (m_storage.is_null(t))
                d.m_storage.set_null(t);
            else {
                d.m_storage.set(t, static_cast<D>(m_storage[t]));
            }
        }
    }

    template<class D>
    typename std::enable_if<!std::is_convertible<T, D>::value>::type
    REALM_FORCEINLINE export2(ValueBase&) const
    {
        // export2 is instantiated for impossible conversions like T=StringData, D=int64_t. These are never
        // performed at runtime but would result in a compiler error if we did not provide this implementation.
        REALM_ASSERT_DEBUG(false);
    }

    REALM_FORCEINLINE void export_bool(ValueBase& destination) const override
    {
        export2<bool>(destination);
    }

    REALM_FORCEINLINE void export_int64_t(ValueBase& destination) const override
    {
        export2<int64_t>(destination);
    }

    REALM_FORCEINLINE void export_float(ValueBase& destination) const override
    {
        export2<float>(destination);
    }

    REALM_FORCEINLINE void export_int(ValueBase& destination) const override
    {
        export2<int>(destination);
    }

    REALM_FORCEINLINE void export_double(ValueBase& destination) const override
    {
        export2<double>(destination);
    }
    REALM_FORCEINLINE void export_StringData(ValueBase& destination) const override
    {
        export2<StringData>(destination);
    }
    REALM_FORCEINLINE void export_BinaryData(ValueBase& destination) const override
    {
        export2<BinaryData>(destination);
    }
    REALM_FORCEINLINE void export_null(ValueBase& destination) const override
    {
        Value<null>& d = static_cast<Value<null>&>(destination);
        d.init(m_from_link_list, m_values);
    }

    REALM_FORCEINLINE void import(const ValueBase& source) override
    {
        if (std::is_same<T, int>::value)
            source.export_int(*this);
        else if (std::is_same<T, bool>::value)
            source.export_bool(*this);
        else if (std::is_same<T, float>::value)
            source.export_float(*this);
        else if (std::is_same<T, double>::value)
            source.export_double(*this);
        else if (std::is_same<T, int64_t>::value || std::is_same<T, bool>::value ||  std::is_same<T, DateTime>::value)
            source.export_int64_t(*this);
        else if (std::is_same<T, StringData>::value)
            source.export_StringData(*this);
        else if (std::is_same<T, BinaryData>::value)
            source.export_BinaryData(*this);
        else if (std::is_same<T, null>::value)
            source.export_null(*this);
        else
            REALM_ASSERT_DEBUG(false);
    }

    // Given a TCond (==, !=, >, <, >=, <=) and two Value<T>, return index of first match
    template<class TCond>
    REALM_FORCEINLINE static size_t compare(Value<T>* left, Value<T>* right)
    {
        TCond c;

        if (!left->m_from_link_list && !right->m_from_link_list) {
            // Compare values one-by-one (one value is one row; no link lists)
            size_t min = minimum(left->ValueBase::m_values, right->ValueBase::m_values);
            for (size_t m = 0; m < min; m++) {

                if (c(left->m_storage[m], right->m_storage[m], left->m_storage.is_null(m), right->m_storage.is_null(m)))
                    return m;
            }
        }
        else if (left->m_from_link_list && right->m_from_link_list) {
            // FIXME: Many-to-many links not supported yet. Need to specify behaviour
            REALM_ASSERT_DEBUG(false);
        }
        else if (!left->m_from_link_list && right->m_from_link_list) {
            // Right values come from link list. Left must come from single row. Semantics: Match if at least 1
            // linked-to-value fulfills the condition
            REALM_ASSERT_DEBUG(left->m_values > 0);
            for (size_t r = 0; r < right->m_values; r++) {
                if (c(left->m_storage[0], right->m_storage[r], left->m_storage.is_null(0), right->m_storage.is_null(r)))
                    return 0;
            }
        }
        else if (left->m_from_link_list && !right->m_from_link_list) {
            // Same as above, but with left values coming from link list.
            REALM_ASSERT_DEBUG(right->m_values > 0);
            for (size_t l = 0; l < left->m_values; l++) {
                if (c(left->m_storage[l], right->m_storage[0], left->m_storage.is_null(l), right->m_storage.is_null(0)))
                    return 0;
            }
        }

        return not_found; // no match
    }

    std::unique_ptr<Subexpr> clone() const override
    {
        return make_subexpr<Value<T>>(*this);
    }

    NullableVector<T> m_storage;
};


// All overloads where left-hand-side is L:
//
// left-hand-side       operator                              right-hand-side
// L                    +, -, *, /, <, >, ==, !=, <=, >=      Subexpr2<R>
//
// For L = R = {int, int64_t, float, double}:
// Compare numeric values
template<class R>
Query operator > (double left, const Subexpr2<R>& right) {
    return create<double, Greater, R>(left, right);
}
template<class R>
Query operator > (float left, const Subexpr2<R>& right) {
    return create<float, Greater, R>(left, right);
}
template<class R>
Query operator > (int left, const Subexpr2<R>& right) {
    return create<int, Greater, R>(left, right);
}
template<class R>
Query operator > (int64_t left, const Subexpr2<R>& right) {
    return create<int64_t, Greater, R>(left, right);
}
template<class R>
Query operator < (double left, const Subexpr2<R>& right) {
    return create<float, Less, R>(left, right);
}
template<class R>
Query operator < (float left, const Subexpr2<R>& right) {
    return create<int, Less, R>(left, right);
}
template<class R>
Query operator < (int left, const Subexpr2<R>& right) {
    return create<int, Less, R>(left, right);
}
template<class R>
Query operator < (int64_t left, const Subexpr2<R>& right) {
    return create<int64_t, Less, R>(left, right);
}
template<class R>
Query operator == (double left, const Subexpr2<R>& right) {
    return create<double, Equal, R>(left, right);
}
template<class R>
Query operator == (float left, const Subexpr2<R>& right) {
    return create<float, Equal, R>(left, right);
}
template<class R>
Query operator == (int left, const Subexpr2<R>& right) {
    return create<int, Equal, R>(left, right);
}
template<class R>
Query operator == (int64_t left, const Subexpr2<R>& right) {
    return create<int64_t, Equal, R>(left, right);
}
template<class R>
Query operator >= (double left, const Subexpr2<R>& right) {
    return create<double, GreaterEqual, R>(left, right);
}
template<class R>
Query operator >= (float left, const Subexpr2<R>& right) {
    return create<float, GreaterEqual, R>(left, right);
}
template<class R>
Query operator >= (int left, const Subexpr2<R>& right) {
    return create<int, GreaterEqual, R>(left, right);
}
template<class R>
Query operator >= (int64_t left, const Subexpr2<R>& right) {
    return create<int64_t, GreaterEqual, R>(left, right);
}
template<class R>
Query operator <= (double left, const Subexpr2<R>& right) {
    return create<double, LessEqual, R>(left, right);
}
template<class R>
Query operator <= (float left, const Subexpr2<R>& right) {
    return create<float, LessEqual, R>(left, right);
}
template<class R>
Query operator <= (int left, const Subexpr2<R>& right) {
    return create<int, LessEqual, R>(left, right);
}
template<class R>
Query operator <= (int64_t left, const Subexpr2<R>& right) {
    return create<int64_t, LessEqual, R>(left, right);
}
template<class R>
Query operator != (double left, const Subexpr2<R>& right) {
    return create<double, NotEqual, R>(left, right);
}
template<class R>
Query operator != (float left, const Subexpr2<R>& right) {
    return create<float, NotEqual, R>(left, right);
}
template<class R>
Query operator != (int left, const Subexpr2<R>& right) {
    return create<int, NotEqual, R>(left, right);
}
template<class R>
Query operator != (int64_t left, const Subexpr2<R>& right) {
    return create<int64_t, NotEqual, R>(left, right);
}

// Arithmetic
template<class R>
Operator<Plus<typename Common<R, double>::type>> operator + (double left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<double>>(left), right.clone() };
}
template<class R>
Operator<Plus<typename Common<R, float>::type>> operator + (float left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<float>>(left), right.clone() };
}
template<class R>
Operator<Plus<typename Common<R, int>::type>> operator + (int left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<int>>(left), right.clone() };
}
template<class R>
Operator<Plus<typename Common<R, int64_t>::type>> operator + (int64_t left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<int64_t>>(left), right.clone() };
}
template<class R>
Operator<Minus<typename Common<R, double>::type>> operator - (double left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<double>>(left), right.clone() };
}
template<class R>
Operator<Minus<typename Common<R, float>::type>> operator - (float left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<float>>(left), right.clone() };
}
template<class R>
Operator<Minus<typename Common<R, int>::type>> operator - (int left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<int>>(left), right.clone() };
}
template<class R>
Operator<Minus<typename Common<R, int64_t>::type>> operator - (int64_t left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<int64_t>>(left), right.clone() };
}
template<class R>
Operator<Mul<typename Common<R, double>::type>> operator * (double left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<double>>(left), right.clone() };
}
template<class R>
Operator<Mul<typename Common<R, float>::type>> operator * (float left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<float>>(left), right.clone() };
}
template<class R>
Operator<Mul<typename Common<R, int>::type>> operator * (int left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<int>>(left), right.clone() };
}
template<class R>
Operator<Mul<typename Common<R, int64_t>::type>> operator * (int64_t left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<int64_t>>(left), right.clone() };
}
template<class R>
Operator<Div<typename Common<R, double>::type>> operator / (double left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<double>>(left), right.clone() };
}
template<class R>
Operator<Div<typename Common<R, float>::type>> operator / (float left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<float>>(left), right.clone() };
}
template<class R>
Operator<Div<typename Common<R, int>::type>> operator / (int left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<int>>(left), right.clone() };
}
template<class R>
Operator<Div<typename Common<R, int64_t>::type>> operator / (int64_t left, const Subexpr2<R>& right) {
    return { make_subexpr<Value<int64_t>>(left), right.clone() };
}

// Unary operators
template<class T>
UnaryOperator<Pow<T>> power (const Subexpr2<T>& left) {
    return { left.clone() };
}



// Classes used for LinkMap (see below).
struct LinkMapFunction
{
    // Your consume() method is given row index of the linked-to table as argument, and you must return wether or
    // not you want the LinkMapFunction to exit (return false) or continue (return true) harvesting the link tree
    // for the current main table row index (it will be a link tree if you have multiple type_LinkList columns
    // in a link()->link() query.
    virtual bool consume(size_t row_index) = 0;
};

struct FindNullLinks : public LinkMapFunction
{
    FindNullLinks() : m_has_link(false) {};

    bool consume(size_t row_index) override
    {
        static_cast<void>(row_index);
        m_has_link = true;
        return false; // we've found a row index, so this can't be a null-link, so exit link harvesting
    }

    bool m_has_link;
};

struct MakeLinkVector : public LinkMapFunction
{
    MakeLinkVector(std::vector<size_t>& result) : m_links(result) {}

    bool consume(size_t row_index) override
    {
        m_links.push_back(row_index);
        return true; // continue evaluation
    }
    std::vector<size_t> &m_links;
};

struct CountLinks : public LinkMapFunction
{
    bool consume(size_t) override
    {
        m_link_count++;
        return true;
    }

    size_t result() const { return m_link_count; }

    size_t m_link_count = 0;
};


/*
The LinkMap and LinkMapFunction classes are used for query conditions on links themselves (contrary to conditions on
the value payload they point at).

MapLink::map_links() takes a row index of the link column as argument and follows any link chain stated in the query
(through the link()->link() methods) until the final payload table is reached, and then applies LinkMapFunction on
the linked-to row index(es).

If all link columns are type_Link, then LinkMapFunction is only invoked for a single row index. If one or more
columns are type_LinkList, then it may result in multiple row indexes.

The reason we use this map pattern is that we can exit the link-tree-traversal as early as possible, e.g. when we've
found the first link that points to row '5'. Other solutions could be a std::vector<size_t> harvest_all_links(), or an
iterator pattern. First solution can't exit, second solution requires internal state.
*/
class LinkMap
{
public:
    LinkMap() : m_table(nullptr) {}
    LinkMap(const Table* table, const std::vector<size_t>& columns)
    {
        for (size_t t = 0; t < columns.size(); t++) {
            // Link column can be either LinkList or single Link
            ColumnType type = table->get_real_column_type(columns[t]);
            if (type == col_type_LinkList) {
                const LinkListColumn& cll = table->get_column_link_list(columns[t]);
                m_tables.push_back(table);
                m_link_columns.push_back(&(table->get_column_link_list(columns[t])));
                m_link_types.push_back(realm::type_LinkList);
                table = &cll.get_target_table();
            }
            else {
                const LinkColumn& cl = table->get_column_link(columns[t]);
                m_tables.push_back(table);
                m_link_columns.push_back(&(table->get_column_link(columns[t])));
                m_link_types.push_back(realm::type_Link);
                table = &cl.get_target_table();
            }
        }
        m_table = table;
    }

    std::vector<size_t> get_links(size_t index)
    {
        std::vector<size_t> res;
        get_links(index, res);
        return res;
    }

    size_t count_links(size_t row)
    {
        CountLinks counter;
        map_links(row, counter);
        return counter.result();
    }

    void map_links(size_t row, LinkMapFunction& lm)
    {
        map_links(0, row, lm);
    }

    bool only_unary_links() const
    {
        return std::find(m_link_types.begin(), m_link_types.end(), type_LinkList) == m_link_types.end();
    }

    const Table* m_table;
    std::vector<const LinkColumnBase*> m_link_columns;
    std::vector<const Table*> m_tables;

private:
    void map_links(size_t column, size_t row, LinkMapFunction& lm)
    {
        bool last = (column + 1 == m_link_columns.size());
        if (m_link_types[column] == type_Link) {
            const LinkColumn& cl = *static_cast<const LinkColumn*>(m_link_columns[column]);
            size_t r = to_size_t(cl.get(row));
            if (r == 0)
                return;
            r--; // LinkColumn stores link to row N as N + 1
            if (last) {
                bool continue2 = lm.consume(r);
                if (!continue2)
                    return;
            }
            else
                map_links(column + 1, r, lm);
        }
        else {
            const LinkListColumn& cll = *static_cast<const LinkListColumn*>(m_link_columns[column]);
            ConstLinkViewRef lvr = cll.get(row);
            for (size_t t = 0; t < lvr->size(); t++) {
                size_t r = lvr->get(t).get_index();
                if (last) {
                    bool continue2 = lm.consume(r);
                    if (!continue2)
                        return;
                }
                else
                    map_links(column + 1, r, lm);
            }
        }
    }


    void get_links(size_t row, std::vector<size_t>& result)
    {
        MakeLinkVector mlv = MakeLinkVector(result);
        map_links(row, mlv);
    }

    std::vector<realm::DataType> m_link_types;
};

template<class T, class S, class I>
Query string_compare(const Columns<StringData>& left, T right, bool case_insensitive);
template<class S, class I>
Query string_compare(const Columns<StringData>& left, const Columns<StringData>& right, bool case_insensitive);

template<class T>
Value<T> make_value_for_link(bool only_unary_links, size_t size)
{
    Value<T> value;
    if (only_unary_links) {
        REALM_ASSERT(size <= 1);
        value.init(false, 1);
        value.m_storage.set_null(0);
    }
    else {
        value.init(true, size);
    }
    return value;
}

// Handling of String columns. These support only == and != compare operators. No 'arithmetic' operators (+, etc).
template <> class Columns<StringData> : public Subexpr2<StringData>
{
public:
    Columns(size_t column, const Table* table, const std::vector<size_t>& links):
        m_link_map(table, links), m_table(table), m_column(column)
    {
        REALM_ASSERT_3(m_link_map.m_table->get_column_type(column), ==, type_String);
    }

    Columns(size_t column, const Table* table): m_table(table), m_column(column)
    {
    }

    explicit Columns() { }


    explicit Columns(size_t column): m_column(column)
    {
    }

    std::unique_ptr<Subexpr> clone() const override
    {
        return make_subexpr<Columns<StringData>>(*this);
    }

    const Table* get_table() const override
    {
        return m_table;
    }

    void evaluate(size_t index, ValueBase& destination) override
    {
        Value<StringData>& d = static_cast<Value<StringData>&>(destination);

        if (links_exist()) {
            std::vector<size_t> links = m_link_map.get_links(index);
            Value<StringData> v = make_value_for_link<StringData>(m_link_map.only_unary_links(), links.size());

            for (size_t t = 0; t < links.size(); t++) {
                size_t link_to = links[t];
                v.m_storage.set(t, m_link_map.m_table->get_string(m_column, link_to));
            }
            destination.import(v);
        }
        else {
            // Not a link column
            for (size_t t = 0; t < destination.m_values && index + t < m_table->size(); t++) {
                d.m_storage.set(t, m_table->get_string(m_column, index + t));
            }
        }
    }

    Query equal(StringData sd, bool case_sensitive = true)
    {
        return string_compare<StringData, Equal, EqualIns>(*this, sd, case_sensitive);
    }

    Query equal(const Columns<StringData>& col, bool case_sensitive = true)
    {
        return string_compare<Equal, EqualIns>(*this, col, case_sensitive);
    }

    Query not_equal(StringData sd, bool case_sensitive = true)
    {
        return string_compare<StringData, NotEqual, NotEqualIns>(*this, sd, case_sensitive);
    }

    Query not_equal(const Columns<StringData>& col, bool case_sensitive = true)
    {
        return string_compare<NotEqual, NotEqualIns>(*this, col, case_sensitive);
    }

    Query begins_with(StringData sd, bool case_sensitive = true)
    {
        return string_compare<StringData, BeginsWith, BeginsWithIns>(*this, sd, case_sensitive);
    }

    Query begins_with(const Columns<StringData>& col, bool case_sensitive = true)
    {
        return string_compare<BeginsWith, BeginsWithIns>(*this, col, case_sensitive);
    }

    Query ends_with(StringData sd, bool case_sensitive = true)
    {
        return string_compare<StringData, EndsWith, EndsWithIns>(*this, sd, case_sensitive);
    }

    Query ends_with(const Columns<StringData>& col, bool case_sensitive = true)
    {
        return string_compare<EndsWith, EndsWithIns>(*this, col, case_sensitive);
    }

    Query contains(StringData sd, bool case_sensitive = true)
    {
        return string_compare<StringData, Contains, ContainsIns>(*this, sd, case_sensitive);
    }

    Query contains(const Columns<StringData>& col, bool case_sensitive = true)
    {
        return string_compare<Contains, ContainsIns>(*this, col, case_sensitive);
    }

    bool links_exist() const
    {
        return m_link_map.m_link_columns.size() > 0;
    }

    LinkMap m_link_map;

    // Pointer to payload table (which is the linked-to table if this is a link column) used for condition operator
    const Table* m_table = nullptr;

    // Column index of payload column of m_table
    size_t m_column;
};


template<class T, class S, class I>
Query string_compare(const Columns<StringData>& left, T right, bool case_sensitive)
{
    StringData sd(right);
    if (case_sensitive)
        return create<StringData, S, StringData>(sd, left);
    else
        return create<StringData, I, StringData>(sd, left);
}

template<class S, class I>
Query string_compare(const Columns<StringData>& left, const Columns<StringData>& right, bool case_sensitive)
{
    if (case_sensitive)
        return new Compare<S, StringData>(right.clone(), left.clone());
    else
        return new Compare<I, StringData>(right.clone(), left.clone());
}

// Columns<String> == Columns<String>
inline Query operator == (const Columns<StringData>& left, const Columns<StringData>& right) {
    return string_compare<Equal, EqualIns>(left, right, true);
}

// Columns<String> != Columns<String>
inline Query operator != (const Columns<StringData>& left, const Columns<StringData>& right) {
    return string_compare<NotEqual, NotEqualIns>(left, right, true);
}

// String == Columns<String>
template<class T>
Query operator == (T left, const Columns<StringData>& right) {
    return operator==(right, left);
}

// String != Columns<String>
template<class T>
Query operator != (T left, const Columns<StringData>& right) {
    return operator!=(right, left);
}

// Columns<String> == String
template<class T>
Query operator == (const Columns<StringData>& left, T right) {
    return string_compare<T, Equal, EqualIns>(left, right, true);
}

// Columns<String> != String
template<class T>
Query operator != (const Columns<StringData>& left, T right) {
    return string_compare<T, NotEqual, NotEqualIns>(left, right, true);
}


// Handling of BinaryData columns. These support only == and != compare operators. No 'arithmetic' operators (+, etc).
//
// FIXME: See if we can merge it with Columns<StringData> because they are very similiar
template <> class Columns<BinaryData> : public Subexpr2<BinaryData>
{
public:
    Columns(size_t column, const Table* table, const std::vector<size_t>& links) :
        m_column(column), m_link_map(table, links)
    {
        m_table = table;
        REALM_ASSERT_3(m_link_map.m_table->get_column_type(column), == , type_Binary);
    }

    Columns(size_t column, const Table* table) : m_table(table), m_column(column) { }

    explicit Columns() { }


    explicit Columns(size_t column) : m_column(column)
    {
    }

    std::unique_ptr<Subexpr> clone() const override
    {
        return make_subexpr<Columns<BinaryData>>(*this);
    }

    const Table* get_table() const override
    {
        return m_table;
    }

    virtual void evaluate(size_t index, ValueBase& destination) override
    {
        Value<BinaryData>& d = static_cast<Value<BinaryData>&>(destination);

        if (links_exist()) {
            std::vector<size_t> links = m_link_map.get_links(index);
            Value<BinaryData> v = make_value_for_link<BinaryData>(m_link_map.only_unary_links(), links.size());

            for (size_t t = 0; t < links.size(); t++) {
                size_t link_to = links[t];
                v.m_storage.set(t, m_link_map.m_table->get_binary(m_column, link_to));
            }
            destination.import(v);
        }
        else {
            // Not a link column
            for (size_t t = 0; t < destination.m_values && index + t < m_table->size(); t++) {
                d.m_storage.set(t, m_table->get_binary(m_column, index + t));
            }
        }
    }

    bool links_exist() const
    {
        return m_link_map.m_link_columns.size() > 0;
    }

    // Pointer to payload table (which is the linked-to table if this is a link column) used for condition operator
    const Table* m_table = nullptr;

    // Column index of payload column of m_table
    size_t m_column;

    LinkMap m_link_map;
};

inline Query operator==(const Columns<BinaryData>& left, BinaryData right) {
    return create<BinaryData, Equal, BinaryData>(right, left);
}

inline Query operator==(BinaryData left, const Columns<BinaryData>& right) {
    return create<BinaryData, Equal, BinaryData>(left, right);
}

inline Query operator!=(const Columns<BinaryData>& left, BinaryData right) {
    return create<BinaryData, NotEqual, BinaryData>(right, left);
}

inline Query operator!=(BinaryData left, const Columns<BinaryData>& right) {
    return create<BinaryData, NotEqual, BinaryData>(left, right);
}


// This class is intended to perform queries on the *pointers* of links, contrary to performing queries on *payload*
// in linked-to tables. Queries can be "find first link that points at row X" or "find first null-link". Currently
// only "find first null link" and "find first non-null link" is supported. More will be added later. When we add
// more, I propose to remove the <bool has_links> template argument from this class and instead template it by
// a criteria-class (like the FindNullLinks class below in find_first()) in some generalized fashion.
template<bool has_links>
class UnaryLinkCompare : public Expression
{
public:
    UnaryLinkCompare(LinkMap lm) : m_link_map(lm)
    {
    }

    void set_table() override
    {
    }

    // Return main table of query (table on which table->where()... is invoked). Note that this is not the same as
    // any linked-to payload tables
    const Table* get_table() const override
    {
        return m_link_map.m_tables[0];
    }

    size_t find_first(size_t start, size_t end) const override
    {
        for (; start < end;) {
            std::vector<size_t> l = m_link_map.get_links(start);
            // We have found a Link which is NULL, or LinkList with 0 entries. Return it as match.

            FindNullLinks fnl;
            m_link_map.map_links(start, fnl);
            if (fnl.m_has_link == has_links)
                return start;

            start++;
        }

        return not_found;
    }

private:
    mutable LinkMap m_link_map;
};

class LinkCount : public Subexpr2<Int> {
public:
    LinkCount(LinkMap link_map): m_link_map(link_map) { }

    std::unique_ptr<Subexpr> clone() const override
    {
        return make_subexpr<LinkCount>(*this);
    }

    const Table* get_table() const override
    {
        return m_link_map.m_tables[0];
    }

    void set_table() override { }

    void evaluate(size_t index, ValueBase& destination) override
    {
        size_t count = m_link_map.count_links(index);
        destination.import(Value<Int>(false, 1, count));
    }

private:
    LinkMap m_link_map;
};

template<typename T>
class SubColumns;

// This is for LinkList too because we have 'typedef List LinkList'
template <> class Columns<Link> : public Subexpr2<Link>
{
public:
    Query is_null() {
        if (m_link_map.m_link_columns.size() > 1)
            throw std::runtime_error("Combining link() and is_null() is currently not supported");
        // Todo, it may be useful to support the above, but we would need to figure out an intuitive behaviour
        return new UnaryLinkCompare<false>(m_link_map);
    }

    Query is_not_null() {
        if (m_link_map.m_link_columns.size() > 1)
            throw std::runtime_error("Combining link() and is_not_null() is currently not supported");
        // Todo, it may be useful to support the above, but we would need to figure out an intuitive behaviour
        return new UnaryLinkCompare<true>(m_link_map);
    }

    LinkCount count() const
    {
        return LinkCount(m_link_map);
    }

    template<typename C>
    SubColumns<C> column(size_t column) const
    {
        return SubColumns<C>(Columns<C>(column, m_link_map.m_table), m_link_map);
    }

private:
    Columns(size_t column, const Table* table, const std::vector<size_t>& links):
        m_link_map(table, links), m_table(table)
    {
        static_cast<void>(column);
    }

    Columns() { }

    explicit Columns(size_t column) { static_cast<void>(column); }

    Columns(size_t column, const Table* table): m_table(table)
    {
        static_cast<void>(column);
    }

    std::unique_ptr<Subexpr> clone() const override
    {
        return make_subexpr<Columns<Link>>(*this);
    }

    const Table* get_table() const override
    {
        return m_table;
    }

    void evaluate(size_t index, ValueBase& destination) override
    {
        static_cast<void>(index);
        static_cast<void>(destination);
        REALM_ASSERT(false);
    }

    LinkMap m_link_map;

    // m_table is redundant with ColumnAccessorBase<>::m_table, but is in order to decrease class dependency/entanglement
    const Table* m_table = nullptr;

   friend class Table;
};


template<class T>
class Columns : public Subexpr2<T>
{
public:
    using ColType = typename ColumnTypeTraits<T>::column_type;

    Columns(size_t column, const Table* table, const std::vector<size_t>& links):
        m_link_map(table, links), m_table(table), m_column(column),
        m_nullable(m_link_map.m_table->is_nullable(m_column))
    {
    }

    Columns(size_t column, const Table* table):
        m_table(table), m_column(column), m_nullable(m_table->is_nullable(m_column))
    {
    }

    Columns() { }

    explicit Columns(size_t column) : m_column(column) {}

    Columns(const Columns& other):
        m_link_map(other.m_link_map), m_table(other.m_table), m_column(other.m_column), m_nullable(other.m_nullable)
    {
    }

    Columns& operator=(const Columns& other)
    {
        if (this != &other) {
            m_link_map = other.m_link_map;
            m_table = other.m_table;
            m_sg.reset();
            m_column = other.m_column;
            m_nullable = other.m_nullable;
        }
        return *this;
    }

    std::unique_ptr<Subexpr> clone() const override
    {
        return make_subexpr<Columns<T>>(*this);
    }

    // Recursively set table pointers for all Columns object in the expression tree. Used for late binding of table
    void set_table() override
    {
        const ColumnBase* c;
        if (!links_exist()) {
            m_nullable = m_table->is_nullable(m_column);
            c = &m_table->get_column_base(m_column);
        }
        else {
            m_nullable = m_link_map.m_table->is_nullable(m_column);
            c = &m_link_map.m_table->get_column_base(m_column);
        }

        if (m_sg == nullptr) {
            if (m_nullable && std::is_same<int64_t, T>::value) {
                m_sg.reset(new SequentialGetter<IntNullColumn>());
            }
            else {
                m_sg.reset(new SequentialGetter<ColType>());
            }
        }

        if (m_nullable && std::is_same<int64_t, T>::value) {
            static_cast<SequentialGetter<IntNullColumn>&>(*m_sg).init(static_cast<const IntNullColumn*>(c));
        }
        else {
            static_cast<SequentialGetter<ColType>&>(*m_sg).init(static_cast<const ColType*>(c));
        }
    }


    // Recursively fetch tables of columns in expression tree. Used when user first builds a stand-alone expression
    // and binds it to a Query at a later time
    const Table* get_table() const override
    {
        return m_table;
    }

    template<class ColType2 = ColType>
    void evaluate_internal(size_t index, ValueBase& destination) {
        using U = typename ColType2::value_type;
        auto sgc = static_cast<SequentialGetter<ColType2>*>(m_sg.get());

        if (links_exist()) {
            // LinkList with more than 0 values. Create Value with payload for all fields

            std::vector<size_t> links = m_link_map.get_links(index);
            auto v = make_value_for_link<typename util::RemoveOptional<U>::type>(m_link_map.only_unary_links(), links.size());

            for (size_t t = 0; t < links.size(); t++) {
                size_t link_to = links[t];
                sgc->cache_next(link_to);

                if (sgc->m_column->is_null(link_to))
                    v.m_storage.set_null(t);
                else
                    v.m_storage.set(t, sgc->get_next(link_to));
            }
            destination.import(v);
        }
        else {
            // Not a Link column
            // make sequential getter load the respective leaf to access data at column row 'index'
            sgc->cache_next(index);
            size_t colsize = sgc->m_column->size();

            // Now load `ValueBase::default_size` rows from from the leaf into m_storage. If it's an integer
            // leaf, then it contains the method get_chunk() which copies these values in a super fast way (first
            // case of the `if` below. Otherwise, copy the values one by one in a for-loop (the `else` case).
            if (std::is_same<U, int64_t>::value && index + ValueBase::default_size <= sgc->m_leaf_end) {
                Value<int64_t> v;

                // If you want to modify 'default_size' then update Array::get_chunk()
                REALM_ASSERT_3(ValueBase::default_size, ==, 8);

                auto sgc_2 = static_cast<SequentialGetter<ColType>*>(m_sg.get());
                sgc_2->m_leaf_ptr->get_chunk(index - sgc->m_leaf_start,
                    static_cast<Value<int64_t>*>(static_cast<ValueBase*>(&v))->m_storage.m_first);

                destination.import(v);
            }
            else
            {
                size_t rows = colsize - index;
                if (rows > ValueBase::default_size)
                    rows = ValueBase::default_size;
                Value<typename util::RemoveOptional<U>::type> v(false, rows);

                for (size_t t = 0; t < rows; t++)
                    v.m_storage.set(t, sgc->get_next(index + t));

                destination.import(v);
            }
        }
    }

    // Load values from Column into destination
    void evaluate(size_t index, ValueBase& destination) override {
        if (m_nullable && std::is_same<typename ColType::value_type, int64_t>::value) {
            evaluate_internal<IntNullColumn>(index, destination);
        }
        else {
            evaluate_internal<ColType>(index, destination);
        }
    }

    bool links_exist() const
    {
        return m_link_map.m_link_columns.size() > 0;
    }

    LinkMap m_link_map;

    // m_table is redundant with ColumnAccessorBase<>::m_table, but is in order to decrease class
    // dependency/entanglement
    const Table* m_table = nullptr;

    // Fast (leaf caching) value getter for payload column (column in table on which query condition is executed)
    std::unique_ptr<SequentialGetterBase> m_sg;

    // Column index of payload column of m_table
    size_t m_column;

    // set to false by default for stand-alone Columns declaration that are not yet associated with any table
    // or oclumn. Call init() to update it or use a constructor that takes table + column index as argument.
    bool m_nullable = false;
};

template<typename T, typename Operation>
class SubColumnAggregate;
namespace aggregate_operations {
    template<typename T>
    class Minimum;
    template<typename T>
    class Maximum;
    template<typename T>
    class Sum;
    template<typename T>
    class Average;
}

template<typename T>
class SubColumns : public Subexpr {
public:
    SubColumns(Columns<T> column, LinkMap link_map)
        : m_column(column)
        , m_link_map(link_map)
    {
    }

    std::unique_ptr<Subexpr> clone() const override
    {
        return make_subexpr<SubColumns<T>>(*this);
    }

    const Table* get_table() const override
    {
        return m_link_map.m_tables[0];
    }

    void set_table() override
    {
        m_column.set_table();
    }

    void evaluate(size_t, ValueBase&) override
    {
        // SubColumns can only be used in an expression in conjunction with its aggregate methods.
        REALM_ASSERT(false);
    }

    SubColumnAggregate<T, aggregate_operations::Minimum<T>> min() const
    {
        return { m_column, m_link_map };
    }

    SubColumnAggregate<T, aggregate_operations::Maximum<T>> max() const
    {
        return { m_column, m_link_map };
    }

    SubColumnAggregate<T, aggregate_operations::Sum<T>> sum() const
    {
        return { m_column, m_link_map };
    }

    SubColumnAggregate<T, aggregate_operations::Average<T>> average() const
    {
        return { m_column, m_link_map };
    }

private:
    Columns<T> m_column;
    LinkMap m_link_map;
};

template<typename T, typename Operation>
class SubColumnAggregate : public Subexpr2<typename Operation::ResultType>
{
public:
    SubColumnAggregate(Columns<T> column, LinkMap link_map)
        : m_column(column)
        , m_link_map(link_map)
    {
    }

    std::unique_ptr<Subexpr> clone() const override
    {
        return make_subexpr<SubColumnAggregate>(*this);
    }

    const Table* get_table() const override
    {
        return m_link_map.m_tables[0];
    }

    void set_table() override
    {
        m_column.set_table();
    }

    void evaluate(size_t index, ValueBase& destination) override
    {
        std::vector<size_t> links = m_link_map.get_links(index);
        std::sort(links.begin(), links.end());

        Operation op;
        for (size_t link_index = 0; link_index < links.size(); ) {
            Value<T> value;
            size_t link = links[link_index];
            m_column.evaluate(link, value);

            // Columns<T>::evaluate fetches values in chunks of ValueBase::default_size. Process all values
            // within the chunk that came from rows that we link to.
            const auto& value_storage = value.m_storage;
            for (size_t value_index = 0; value_index < value.m_values; ) {
                if (!value_storage.is_null(value_index)) {
                    op.accumulate(value_storage[value_index]);
                }
                if (++link_index >= links.size()) {
                    break;
                }

                size_t previous_link = link;
                link = links[link_index];
                value_index += link - previous_link;
            }
        }
        if (op.is_null()) {
            destination.import(Value<null>(false, 1, null()));
        } else {
            destination.import(Value<typename Operation::ResultType>(false, 1, op.result()));
        }
    }

private:
    Columns<T> m_column;
    LinkMap m_link_map;
};

namespace aggregate_operations {
    template<typename T, typename Derived, typename R=T>
    class BaseAggregateOperation {
        static_assert(std::is_same<T, Int>::value || std::is_same<T, Float>::value || std::is_same<T, Double>::value,
                      "Numeric aggregates can only be used with subcolumns of numeric types");
    public:
        using ResultType = R;

        void accumulate(T value)
        {
            m_count++;
            m_result = Derived::apply(m_result, value);
        }

        bool is_null() const { return m_count == 0; }
        ResultType result() const { return m_result; }

    protected:
        size_t m_count = 0;
        ResultType m_result = Derived::initial_value();
    };

    template<typename T>
    class Minimum : public BaseAggregateOperation<T, Minimum<T>> {
    public:
        static T initial_value() { return std::numeric_limits<T>::max(); }
        static T apply(T a, T b) { return std::min(a, b); }
    };

    template<typename T>
    class Maximum : public BaseAggregateOperation<T, Maximum<T>> {
    public:
        static T initial_value() { return std::numeric_limits<T>::min(); }
        static T apply(T a, T b) { return std::max(a, b); }
    };

    template<typename T>
    class Sum : public BaseAggregateOperation<T, Sum<T>> {
    public:
        static T initial_value() { return T(); }
        static T apply(T a, T b) { return a + b; }
        bool is_null() const { return false; }
    };

    template<typename T>
    class Average : public BaseAggregateOperation<T, Average<T>, double> {
        using Base = BaseAggregateOperation<T, Average<T>, double>;
    public:
        static double initial_value() { return 0; }
        static double apply(double a, T b) { return a + b; }
        double result() const { return Base::m_result / Base::m_count; }
    };
}

template<class oper, class TLeft>
class UnaryOperator : public Subexpr2<typename oper::type>
{
public:
    UnaryOperator(std::unique_ptr<TLeft> left) : m_left(std::move(left)) {}

    UnaryOperator(const UnaryOperator& other) : m_left(other.m_left->clone()) {}
    UnaryOperator& operator=(const UnaryOperator& other)
    {
        if (this != &other) {
            m_left = other.m_left->clone();
        }
        return *this;
    }

    UnaryOperator(UnaryOperator&&) = default;
    UnaryOperator& operator=(UnaryOperator&&) = default;

    // Recursively set table pointers for all Columns object in the expression tree. Used for late binding of table
    void set_table() override
    {
        m_left->set_table();
    }

    // Recursively fetch tables of columns in expression tree. Used when user first builds a stand-alone expression and
    // binds it to a Query at a later time
    const Table* get_table() const override
    {
        return m_left->get_table();
    }

    // destination = operator(left)
    void evaluate(size_t index, ValueBase& destination) override
    {
        Value<T> result;
        Value<T> left;
        m_left->evaluate(index, left);
        result.template fun<oper>(&left);
        destination.import(result);
    }

    std::unique_ptr<Subexpr> clone() const override
    {
        return make_subexpr<UnaryOperator>(*this);
    }

private:
    typedef typename oper::type T;
    std::unique_ptr<TLeft> m_left;
};


template<class oper, class TLeft, class TRight>
class Operator : public Subexpr2<typename oper::type>
{
public:
    Operator(std::unique_ptr<TLeft> left, std::unique_ptr<TRight> right) :
        m_left(std::move(left)), m_right(std::move(right))
    {
    }

    Operator(const Operator& other) : m_left(other.m_left->clone()), m_right(other.m_right->clone()) {}
    Operator& operator=(const Operator& other)
    {
        if (this != &other) {
            m_left = other.m_left->clone();
            m_right = other.m_right->clone();
        }
        return *this;
    }

    Operator(Operator&&) = default;
    Operator& operator=(Operator&&) = default;

    // Recursively set table pointers for all Columns object in the expression tree. Used for late binding of table
    void set_table() override
    {
        m_left->set_table();
        m_right->set_table();
    }

    // Recursively fetch tables of columns in expression tree. Used when user first builds a stand-alone expression and
    // binds it to a Query at a later time
    const Table* get_table() const override
    {
        const Table* l = m_left->get_table();
        const Table* r = m_right->get_table();

        // Queries do not support multiple different tables; all tables must be the same.
        REALM_ASSERT(l == nullptr || r == nullptr || l == r);

        // nullptr pointer means expression which isn't yet associated with any table, or is a Value<T>
        return l ? l : r;
    }

    // destination = operator(left, right)
    void evaluate(size_t index, ValueBase& destination) override
    {
        Value<T> result;
        Value<T> left;
        Value<T> right;
        m_left->evaluate(index, left);
        m_right->evaluate(index, right);
        result.template fun<oper>(&left, &right);
        destination.import(result);
    }

    std::unique_ptr<Subexpr> clone() const override
    {
        return make_subexpr<Operator>(*this);
    }

private:
    typedef typename oper::type T;
    std::unique_ptr<TLeft> m_left;
    std::unique_ptr<TRight> m_right;
};


template<class TCond, class T, class TLeft, class TRight>
class Compare : public Expression
{
public:
    Compare(std::unique_ptr<TLeft> left, std::unique_ptr<TRight> right, const char* compare_string = nullptr) :
        m_left(std::move(left)), m_right(std::move(right)), m_compare_string(compare_string)
    {
    }

    ~Compare()
    {
        delete[] m_compare_string;
    }

    // Recursively set table pointers for all Columns object in the expression tree. Used for late binding of table
    void set_table() override
    {
        m_left->set_table();
        m_right->set_table();
    }

    // Recursively fetch tables of columns in expression tree. Used when user first builds a stand-alone expression and
    // binds it to a Query at a later time
    const Table* get_table() const override
    {
        const Table* l = m_left->get_table();
        const Table* r = m_right->get_table();

        // All main tables in each subexpression of a query (table.columns() or table.link()) must be the same.
        REALM_ASSERT(l == nullptr || r == nullptr || l == r);

        // nullptr pointer means expression which isn't yet associated with any table, or is a Value<T>
        return l ? l : r;
    }

    size_t find_first(size_t start, size_t end) const override
    {
        size_t match;
        Value<T> right;
        Value<T> left;

        for (; start < end;) {
            m_left->evaluate(start, left);
            m_right->evaluate(start, right);
            match = Value<T>::template compare<TCond>(&left, &right);

            if (match != not_found && match + start < end)
                return start + match;

            size_t rows = (left.m_from_link_list || right.m_from_link_list) ? 1 : minimum(right.m_values, left.m_values);
            start += rows;
        }

        return not_found; // no match
    }

private:
    std::unique_ptr<TLeft> m_left;
    std::unique_ptr<TRight> m_right;

    // Only used if T is StringData. It then points at the deep copied user given string (the "foo" in
    // Query q = table2->link(col_link2).column<String>(1) == "foo") so that we can delete it when this
    // Compare object is destructed and the copy is no longer needed.
    const char* m_compare_string;
};

}
#endif // REALM_QUERY_EXPRESSION_HPP

