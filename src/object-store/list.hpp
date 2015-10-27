/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#ifndef REALM_LIST_HPP
#define REALM_LIST_HPP

#import "shared_realm.hpp"
#import <realm/link_view.hpp>

namespace realm {
    class List {
      public:
        List(SharedRealm &r, const ObjectSchema &s, LinkViewRef l) : m_realm(r), object_schema(s), m_link_view(l) {}

        const ObjectSchema &object_schema;
        SharedRealm realm() { return m_realm; }
        LinkViewRef link_view() { return m_link_view; }

        size_t size();
        Row get(std::size_t row_ndx);
        void set(std::size_t row_ndx, std::size_t target_row_ndx);

        void verify_valid_row(std::size_t row_ndx);
        void verify_attached();

      private:
        SharedRealm m_realm;
        LinkViewRef m_link_view;
    };
}


#endif /* REALM_LIST_HPP */
