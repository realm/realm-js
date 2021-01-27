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

#include "napi.h"

namespace realm {
namespace js {

using NodeBuffer = Napi::Buffer<char>;
using TypedArray = Napi::TypedArray;
using DataView = Napi::DataView;

template <typename ArrayBuffer>
int get_size(ArrayBuffer array_buffer)
{
    return array_buffer.ByteLength();
}

template <>
int get_size<NodeBuffer>(NodeBuffer buffer)
{
    return buffer.Length();
}

template <typename ArrayBuffer>
auto get_data(ArrayBuffer buffer)
{
    return static_cast<const char*>(buffer.Data());
}

template <>
auto get_data<DataView>(DataView data_view)
{
    auto buffer = data_view.ArrayBuffer();
    return static_cast<const char*>(buffer.Data());
}

template <>
auto get_data<TypedArray>(TypedArray typed_array)
{
    auto buffer = typed_array.ArrayBuffer();
    return static_cast<const char*>(buffer.Data());
}

class NodeBinary {
public:
    virtual bool is_empty() = 0;
    virtual OwnedBinaryData create_binary_blob() = 0;
    virtual int length() = 0;
};

template <typename BufferType, typename Value>
class NodeBinaryManager : public NodeBinary {
private:
    BufferType buffer;

public:
    NodeBinaryManager(Value value)
    {
        buffer = value.template As<BufferType>();
    }

    OwnedBinaryData create_binary_blob()
    {
        return OwnedBinaryData(get_data<BufferType>(buffer), length());
    }

    bool is_empty()
    {
        return length() == 0;
    }

    int length()
    {
        return get_size<BufferType>(buffer);
    }
};

} // namespace js
} // namespace realm
