/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#ifndef REALM_RESULTS_HPP
#define REALM_RESULTS_HPP

#import "shared_realm.hpp"
#import <realm/table_view.hpp>

namespace realm {
    struct SortOrder {
        std::vector<size_t> columnIndices;
        std::vector<bool> ascending;

        explicit operator bool() const {
            return !columnIndices.empty();
        }
    };

    static SortOrder s_defaultSort = {{}, {}};

    struct Results {
        Results(SharedRealm &r, ObjectSchema &o, Query q, SortOrder s = s_defaultSort);
        size_t size();
        Row get(std::size_t row_ndx);
        void verify_attached();

        SharedRealm realm;
        ObjectSchema &object_schema;
        Query backing_query;
        TableView table_view;
        std::unique_ptr<SortOrder> sort_order;

        void setSort(SortOrder s);
    };
}

#endif /* REALM_RESULTS_HPP */
