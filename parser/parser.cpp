#include <string>
#include <iostream>

#include <pegtl.hh>
#include <pegtl/analyze.hh>
#include <pegtl/trace.hh>

using namespace pegtl;

namespace query
{
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
    struct oper : sor<
        two< '=' >,
        one< '=' >,
        pegtl::string< '!', '=' >,
        pegtl::string< '<', '=' >,
        one< '<' >,
        pegtl::string< '>', '=' >,
        one< '>' >
    > {};

    // predicates
    struct comparison_pred : seq< expr, pad< oper, blank >, expr > {};

    struct pred;
    struct group_pred : if_must< one< '(' >, pad< pred, blank >, one< ')' > > {};

    struct single_pred : pad< sor< group_pred, comparison_pred >, blank > {};
    struct not_pre : sor< seq< one< '!' >, star< blank > >, seq< istring< 'N', 'O', 'T' >, plus< blank > > > {};
    struct atom_pred : seq< opt< not_pre >, single_pred > {};

    struct and_op : sor< two< '&' >, istring< 'A', 'N', 'D' > > {};
    struct or_op : sor< two< '|' >, istring< 'O', 'R' > > {};

    struct or_ext : seq< pad< or_op, blank >, pred > {};
    struct and_ext : seq< pad< and_op, blank >, pred > {};
    struct and_pred : seq< atom_pred, star< and_ext > > {};

    struct pred : seq< and_pred, star< or_ext > > {};

    // rules
    template< typename Rule >
    struct action : nothing< Rule > {};
    template<> struct action< and_ext >
    {
        static void apply( const input & in, std::string & string_value )
        {
            std::cout << "<and>" << in.string() << std::endl;
        }
    };

    template<> struct action< or_ext >
    {
        static void apply( const input & in, std::string & string_value )
        {
            std::cout << "<or>" << in.string() << std::endl;
        }
    };

    template<> struct action< comparison_pred >
    {
        static void apply( const input & in, std::string & string_value )
        {
            std::cout << in.string() << std::endl;
        }
    };

    template<> struct action< one< '(' > >
    {
        static void apply( const input & in, std::string & string_value )
        {
            std::cout << "<begin_group>" << std::endl;
        }
    };

    template<> struct action< group_pred >
    {
        static void apply( const input & in, std::string & string_value )
        {
            std::cout << "<end_group>" << std::endl;
        }
    };

    template<> struct action< not_pre >
    {
        static void apply( const input & in, std::string & string_value )
        {
            std::cout << "<not>" << std::endl;
        }
    };
}

int main( int argc, char ** argv )
{
    if ( argc > 1 ) {
        std::string intstring;
        analyze< query::pred >();
        parse< must< query::pred, eof >, query::action >( 1, argv, intstring);
    }
}

