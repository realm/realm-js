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

#include "jsi_types.hpp"

namespace realm {
namespace js {

template<>
class Protected<JsiVal> : public JsiVal {
  public:
    Protected(JsiEnv, JsiVal value) : JsiVal(std::move(value)) {}
    struct Comparator {
        bool operator()(const Protected<JsiVal>& a, const Protected<JsiVal>& b) const { return a == b; }
    };
};

template<>
class Protected<JsiObj> : public JsiObj {
  public:
    Protected(JsiEnv, JsiObj value) : JsiObj(std::move(value)) {}
    struct Comparator {
        bool operator()(const Protected<JsiObj>& a, const Protected<JsiObj>& b) const { return a == b; }
    };
};

template<>
class Protected<JsiFunc> : public JsiFunc {
  public:
    Protected(JsiEnv, JsiFunc value) : JsiFunc(std::move(value)) {}
    struct Comparator {
        bool operator()(const Protected<JsiFunc>& a, const Protected<JsiFunc>& b) const { return a == b; }
    };
};

template<>
class Protected<JsiEnv> : public JsiEnv {
  public:
    Protected(JsiEnv env) : JsiEnv(env) {}
    struct Comparator {
        bool operator()(const Protected<JsiEnv>& a, const Protected<JsiEnv>& b) const { return a == b; }
    };
};

} // js
} // realm
