//
//  results.h
//  RealmJS
//
//  Created by Ari Lazier on 7/31/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

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
