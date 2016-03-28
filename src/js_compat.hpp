////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

#pragma once

#include "types.hpp"
#include <string>

namespace realm {
namespace js {

void *GetInternal(Types::ObjectType jsObject) {
    return JSObjectGetPrivate(jsObject);
}
    

std::string StringForStringType(Types::StringType jsString);
std::string StringForValueType(Types::ContextType ctx, Types::ValueType value);
std::string ValidatedStringForValueType(Types::ContextType ctx, Types::ValueType value, const char * name = nullptr);
bool ValidatedBooleanForValueType(Types::ContextType ctx, Types::ValueType value, const char * name = nullptr);
    
Types::StringType StringTypeForString(const std::string &str);
Types::ValueType ValueTypeForString(Types::ContextType ctx, const std::string &str);

bool IsValueTypeArray(Types::ContextType ctx, Types::ValueType value);
bool IsValueTypeArrayBuffer(Types::ContextType ctx, Types::ValueType value);
bool IsValueTypeDate(Types::ContextType ctx, Types::ValueType value);
    
Types::ObjectType ValidatedValueTypeToObject(Types::ContextType ctx, Types::ValueType value, const char *message = NULL);
Types::ObjectType ValidatedValueTypeToDate(Types::ContextType ctx, Types::ValueType value, const char *message = NULL);
Types::ObjectType ValidatedValueTypeToFunction(Types::ContextType ctx, Types::ValueType value, const char *message = NULL);
double ValidatedValueTypeToNumber(Types::ContextType ctx, Types::ValueType value);
Types::ValueType ValidatedPropertyValue(Types::ContextType ctx, Types::ObjectType object, Types::StringType property);
Types::ValueType ValidatedPropertyAtIndex(Types::ContextType ctx, Types::ObjectType object, unsigned int index);
Types::ObjectType ValidatedObjectProperty(Types::ContextType ctx, Types::ObjectType object, Types::StringType property, const char *err = NULL);
Types::ObjectType ValidatedObjectAtIndex(Types::ContextType ctx, Types::ObjectType object, unsigned int index);
std::string ValidatedStringProperty(Types::ContextType ctx, Types::ObjectType object, Types::StringType property);
bool ValidatedBooleanProperty(Types::ContextType ctx, Types::ObjectType object, Types::StringType property, const char *err = NULL);
size_t ValidatedListLength(Types::ContextType ctx, Types::ObjectType object);
void ValidatedSetProperty(Types::ContextType ctx, Types::ObjectType object, Types::StringType propertyName, Types::ValueType value, JSPropertyAttributes attributes = 0);

bool IsValueTypeIsObject(Types::ContextType ctx, Types::ValueType value);
bool IsValueTypeObjectOfType(Types::ContextType ctx, Types::ValueType value, Types::StringType type);
bool ObjectTypeHasProperty(Types::ContextType ctx, Types::ObjectType object, Types::StringType propName);
    
template<typename T>
void SetReturnNumber(Types::ContextType ctx, Types::ValueType &returnObject, T number);
void SetReturnArray(Types::ContextType ctx, size_t count, const Types::ValueType *objects, Types::ValueType &returnObject);\
void SetReturnUndefined(Types::ContextType ctx, Types::ValueType &returnObject);
    
void SetException(Types::ContextType ctx, Types::ValueType * &exceptionObject, std::exception &exception);

}}