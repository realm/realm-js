//
// Created by Cesar Valdez on 19/03/2021.
//
#include "type_deduction.hpp"

namespace realm {
namespace js {
std::map<types::Type, std::string> GenericTypeDeductionImpl::realm_types = {
    {types::String, "String"},       {types::Integer, "Int"},
    {types::Float, "Float"},         {types::Double, "Double"},
    {types::Decimal, "Decimal128"},  {types::Boolean, "Boolean"},
    {types::ObjectId, "ObjectId"},   {types::Object, "Object"},
    {types::Undefined, "Undefined"}, {types::Null, "Null"}};
}
}  // namespace realm
