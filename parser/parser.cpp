#include <string>
#include <iostream>

#include <pegtl.hh>

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
    struct key_path : list< must< sor< alpha, one< '_' > >, star< sor< alnum, one< '_', '-' > > > >, one< '.' > > {};

    // expressions and operators
    struct expr : sor< string, key_path, number > {};
    struct oper : sor< one< '=' >, istring< '=', '=' >, istring< '!', '=' >, one< '<' >, istring< '<', '=' >, one< '>' >, istring< '>', '=' > > {};

    // predicates
    struct pred : seq< expr, plus< blank >, oper, plus< blank >, expr > {};

    // rules
    template< typename Rule >
    struct action : nothing< Rule > {};
    template<> struct action< expr >
    {
        static void apply( const input & in, std::string & string_value )
        {
            std::cout << in.string() << std::endl;
        }
    };
}

int main( int argc, char ** argv )
{
    if ( argc > 1 ) {
        std::string intstring;
        parse< must< query::expr, eof>, query::action >( 1, argv, intstring);
    }
}

