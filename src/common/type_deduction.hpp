#pragma once

#if REALM_PLATFORM_NODE
#include <node/node_type_deduction.hpp>
#else
#include <JavaScriptCore/JSStringRef.h>
#endif

namespace realm {
namespace js {

struct TypeDeduction : TypeDeductionImpl {};

}  // namespace js
}  // namespace realm
