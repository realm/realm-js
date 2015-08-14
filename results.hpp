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

#ifndef REALM_RESULTS_HPP
#define REALM_RESULTS_HPP

#import "shared_realm.hpp"
#import <realm/table_view.hpp>

namespace realm {
    struct Results {
        Results(SharedRealm &r, ObjectSchema &o, Query q);
        size_t size();
        Row get(std::size_t row_ndx);
        void verify_attached();

        SharedRealm realm;
        ObjectSchema &object_schema;
        Query backing_query;
        TableView table_view;
    };
}

#endif /* REALM_RESULTS_HPP */
