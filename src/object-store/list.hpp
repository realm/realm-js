////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
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

#ifndef REALM_LIST_HPP
#define REALM_LIST_HPP

#import "shared_realm.hpp"
#import <realm/link_view.hpp>

namespace realm {
    struct List {
        List(SharedRealm &r, ObjectSchema &s, LinkViewRef l) : realm(r), object_schema(s), link_view(l) {}
        // FIXME - all should be const
        SharedRealm realm;
        ObjectSchema &object_schema;
        LinkViewRef link_view;

        size_t size();
        Row get(std::size_t row_ndx);
        void set(std::size_t row_ndx, std::size_t target_row_ndx);
        void verify_valid_row(std::size_t row_ndx);
        void verify_attached();
    };
}


#endif /* REALM_LIST_HPP */
