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
#ifndef REALM_UTIL_BASIC_SYSTEM_ERRORS_HPP
#define REALM_UTIL_BASIC_SYSTEM_ERRORS_HPP

#include <cerrno>
#include <system_error>


namespace realm {
namespace util {
namespace error {

enum basic_system_errors {
    /// Address family not supported by protocol.
    address_family_not_supported = EAFNOSUPPORT,

    /// Invalid argument.
    invalid_argument = EINVAL,

    /// Cannot allocate memory.
    no_memory = ENOMEM,

    /// Operation cancelled.
    operation_aborted = ECANCELED,

    /// Connection aborted.
    connection_aborted = ECONNABORTED
};

std::error_code make_error_code(basic_system_errors);

} // namespace error
} // namespace util
} // namespace realm

namespace std {

template<>
class is_error_code_enum<realm::util::error::basic_system_errors>
{
public:
    static const bool value = true;
};

} // namespace std

namespace realm {
namespace util {

std::error_code make_basic_system_error_code(int);




// implementation

inline std::error_code make_basic_system_error_code(int err)
{
    using namespace error;
    return make_error_code(basic_system_errors(err));
}

} // namespace util
} // namespace realm

#endif // REALM_UTIL_BASIC_SYSTEM_ERRORS_HPP
