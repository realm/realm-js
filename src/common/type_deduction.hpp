#pragma once

#if REALM_PLATFORM_NODE
#include <node/node_type_deduction.hpp>
#else
#include <JavaScriptCore/JSStringRef.h>
#endif

namespace realm {
namespace js {

/*
 * Here we encapsulate some type deduction capabilities for all supported Javascript
 * environments.
 */

struct TypeDeduction : TypeDeductionImpl {};

}  // namespace js
}  // namespace realm
