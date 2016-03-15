#include "catch.hpp"

#include "index_set.hpp"

#include "util/index_helpers.hpp"

TEST_CASE("index set") {
    realm::IndexSet set;

    SECTION("contains() returns if the index is in the set") {
        set = {1, 2, 3, 5};
        REQUIRE_FALSE(set.contains(0));
        REQUIRE(set.contains(1));
        REQUIRE(set.contains(2));
        REQUIRE(set.contains(3));
        REQUIRE_FALSE(set.contains(4));
        REQUIRE(set.contains(5));
        REQUIRE_FALSE(set.contains(6));
    }

    SECTION("count() returns the number of indices int he range in the set") {
        set = {1, 2, 3, 5};
        REQUIRE(set.count(0, 6) == 4);
        REQUIRE(set.count(0, 5) == 3);
        REQUIRE(set.count(0, 4) == 3);
        REQUIRE(set.count(0, 3) == 2);
        REQUIRE(set.count(0, 2) == 1);
        REQUIRE(set.count(0, 1) == 0);
        REQUIRE(set.count(0, 0) == 0);

        REQUIRE(set.count(0, 6) == 4);
        REQUIRE(set.count(1, 6) == 4);
        REQUIRE(set.count(2, 6) == 3);
        REQUIRE(set.count(3, 6) == 2);
        REQUIRE(set.count(4, 6) == 1);
        REQUIRE(set.count(5, 6) == 1);
        REQUIRE(set.count(6, 6) == 0);
    }

    SECTION("add() extends existing ranges") {
        set.add(1);
        REQUIRE_INDICES(set, 1);

        set.add(2);
        REQUIRE_INDICES(set, 1, 2);

        set.add(0);
        REQUIRE_INDICES(set, 0, 1, 2);
    }

    SECTION("add() with gaps") {
        set.add(0);
        REQUIRE_INDICES(set, 0);

        set.add(2);
        REQUIRE_INDICES(set, 0, 2);
    }

    SECTION("add() is idempotent") {
        set.add(0);
        set.add(0);
        REQUIRE_INDICES(set, 0);
    }

    SECTION("add() merges existing ranges") {
        set = {0, 2, 4};

        set.add(1);
        REQUIRE_INDICES(set, 0, 1, 2, 4);
    }

    SECTION("add() combines multiple index sets") {
        set = {0, 2, 6};

        set.add({1, 4, 5});
        REQUIRE_INDICES(set, 0, 1, 2, 4, 5, 6);
    }

    SECTION("set() from empty") {
        set.set(5);
        REQUIRE_INDICES(set, 0, 1, 2, 3, 4);
    }

    SECTION("set() discards existing data") {
        set = {8, 9};

        set.set(5);
        REQUIRE_INDICES(set, 0, 1, 2, 3, 4);
    }

    SECTION("insert_at() on an empty set is add()") {
        set.insert_at(5);
        REQUIRE_INDICES(set, 5);
    }

    SECTION("insert_at() extends ranges containing the target index") {
        set = {5, 6};

        set.insert_at(5);
        REQUIRE_INDICES(set, 5, 6, 7);

        set.insert_at(4);
        REQUIRE_INDICES(set, 4, 6, 7, 8);

        set.insert_at(9);
        REQUIRE_INDICES(set, 4, 6, 7, 8, 9);
    }

    SECTION("insert_at() does not modify ranges entirely before it") {
        set = {5, 6};
        set.insert_at(8);
        REQUIRE_INDICES(set, 5, 6, 8);
    }

    SECTION("insert_at() shifts ranges after it") {
        set = {5, 6};
        set.insert_at(3);
        REQUIRE_INDICES(set, 3, 6, 7);
    }

    SECTION("insert_at() cannot join ranges") {
        set = {5, 7};
        set.insert_at(6);
        REQUIRE_INDICES(set, 5, 6, 8);
    }

    SECTION("bulk insert_at() on an empty set is add()") {
        set.insert_at({5, 6, 8});
        REQUIRE_INDICES(set, 5, 6, 8);
    }

    SECTION("bulk insert_at() shifts existing ranges") {
        set = {5, 10};
        set.insert_at({3, 8, 14});
        REQUIRE_INDICES(set, 3, 6, 8, 12, 14);
    }

    SECTION("bulk insert_at() does not join ranges") {
        set = {5, 7};
        set.insert_at({5, 6, 7});
        REQUIRE_INDICES(set, 5, 6, 7, 8, 10);
    }

    SECTION("bulk insert_at() extends existing ranges") {
        set = {5, 8};
        set.insert_at({5, 9});
        REQUIRE_INDICES(set, 5, 6, 9, 10);

        set = {4, 5};
        set.insert_at({5, 6});
        REQUIRE_INDICES(set, 4, 5, 6, 7);
    }

    SECTION("add_shifted() on an empty set is just add()") {
        set.add_shifted(5);
        REQUIRE_INDICES(set, 5);
    }

    SECTION("add_shifted() before the first range is just add()") {
        set.add(10);
        set.add_shifted(5);
        REQUIRE_INDICES(set, 5, 10);
    }

    SECTION("add_shifted() on first index of range extends range") {
        set.add(5);
        set.add_shifted(5);
        REQUIRE_INDICES(set, 5, 6);

        set.add_shifted(5);
        REQUIRE_INDICES(set, 5, 6, 7);

        set.add_shifted(6);
        REQUIRE_INDICES(set, 5, 6, 7, 9);
    }

    SECTION("add_shifted() after ranges shifts by the size of those ranges") {
        set.add(5);
        set.add_shifted(6);
        REQUIRE_INDICES(set, 5, 7);

        set.add_shifted(6); // bumped into second range
        REQUIRE_INDICES(set, 5, 7, 8);

        set.add_shifted(8);
        REQUIRE_INDICES(set, 5, 7, 8, 11);
    }

    SECTION("add_shifted_by() with an empty shifted by set is just bulk add_shifted()") {
        set = {5};
        set.add_shifted_by({}, {6, 7});
        REQUIRE_INDICES(set, 5, 7, 8);
    }

    SECTION("add_shifted_by() shifts backwards for indices in the first set") {
        set = {5};
        set.add_shifted_by({0, 2, 3}, {6});
        REQUIRE_INDICES(set, 3, 5);

        set = {5};
        set.add_shifted_by({1, 3}, {4});
        REQUIRE_INDICES(set, 2, 5);
    }

    SECTION("add_shifted_by() discards indices in the first set") {
        set = {5};
        set.add_shifted_by({3}, {3});
        REQUIRE_INDICES(set, 5);

        set = {5};
        set.add_shifted_by({1, 3}, {3});
        REQUIRE_INDICES(set, 5);
    }

    SECTION("shift_for_insert_at() does not modify ranges before it") {
        set.add(5);
        set.shift_for_insert_at(6);
        REQUIRE_INDICES(set, 5);
    }

    SECTION("shift_for_insert_at() moves ranges at or after it back") {
        set.add(5);
        set.shift_for_insert_at(5);
        REQUIRE_INDICES(set, 6);
    }

    SECTION("shift_for_insert_at() splits ranges containing the index") {
        set.add(5);
        set.add(6);
        set.shift_for_insert_at(6);
        REQUIRE_INDICES(set, 5, 7);
    }

    SECTION("bulk shift_for_insert_at() updates things") {
        set = {5, 6};
        set.shift_for_insert_at({3, 7, 10});
        REQUIRE_INDICES(set, 6, 8);
    }

    SECTION("erase_at() shifts ranges after it back") {
        set.add(5);
        set.erase_at(4);
        REQUIRE_INDICES(set, 4);
    }

    SECTION("erase_at() shrinks ranges containing the index") {
        set = {5, 6, 7};

        set.erase_at(6);
        REQUIRE_INDICES(set, 5, 6);

        set.erase_at(5);
        REQUIRE_INDICES(set, 5);
    }

    SECTION("erase_at() removes one-element ranges") {
        set = {3, 5, 7};

        set.erase_at(5);
        REQUIRE_INDICES(set, 3, 6);
    }

    SECTION("erase_at() merges ranges when the gap between them is deleted") {
        set.add(3);
        set.add(5);
        set.erase_at(4);
        REQUIRE_INDICES(set, 3, 4);
    }

    SECTION("bulk erase_at() does things") {
        set = {3, 5, 6, 7, 10, 12};
        set.erase_at({3, 6, 11});
        REQUIRE_INDICES(set, 4, 5, 8, 9);
    }

    SECTION("erase_and_unshift() removes the given index") {
        set = {1, 2};
        set.erase_and_unshift(2);
        REQUIRE_INDICES(set, 1);
    }

    SECTION("erase_and_unshift() shifts indexes after the given index") {
        set = {1, 5};
        set.erase_and_unshift(2);
        REQUIRE_INDICES(set, 1, 4);
    }

    SECTION("erase_and_unshift() returns npos for indices in the set") {
        set = {1, 3, 5};
        REQUIRE(realm::IndexSet(set).erase_and_unshift(1) == realm::IndexSet::npos);
        REQUIRE(realm::IndexSet(set).erase_and_unshift(3) == realm::IndexSet::npos);
        REQUIRE(realm::IndexSet(set).erase_and_unshift(5) == realm::IndexSet::npos);
    }

    SECTION("erase_and_unshift() returns the same thing as unshift()") {
        set = {1, 3, 5, 6};
        REQUIRE(realm::IndexSet(set).erase_and_unshift(0) == 0);
        REQUIRE(realm::IndexSet(set).erase_and_unshift(2) == 1);
        REQUIRE(realm::IndexSet(set).erase_and_unshift(4) == 2);
        REQUIRE(realm::IndexSet(set).erase_and_unshift(7) == 3);
    }

    SECTION("shift() adds the number of indexes before the given index in the set to the given index") {
        set = {1, 3, 5, 6};
        REQUIRE(set.shift(0) == 0);
        REQUIRE(set.shift(1) == 2);
        REQUIRE(set.shift(2) == 4);
        REQUIRE(set.shift(3) == 7);
        REQUIRE(set.shift(4) == 8);
    }

    SECTION("unshift() subtracts the number of indexes in the set before the given index from the index") {
        set = {1, 3, 5, 6};
        REQUIRE(set.unshift(0) == 0);
        REQUIRE(set.unshift(2) == 1);
        REQUIRE(set.unshift(4) == 2);
        REQUIRE(set.unshift(7) == 3);
        REQUIRE(set.unshift(8) == 4);
    }

    SECTION("remove() does nothing if the index is not in the set") {
        set = {5};
        set.remove(4);
        set.remove(6);
        REQUIRE_INDICES(set, 5);
    }

    SECTION("remove() removes one-element ranges") {
        set = {5};
        set.remove(5);
        REQUIRE(set.empty());
    }

    SECTION("remove() shrinks ranges beginning with the index") {
        set = {5, 6, 7};
        set.remove(5);
        REQUIRE_INDICES(set, 6, 7);
    }

    SECTION("remove() shrinks ranges ending with the index") {
        set = {5, 6, 7};
        set.remove(7);
        REQUIRE_INDICES(set, 5, 6);
    }

    SECTION("remove() splits ranges containing the index") {
        set = {5, 6, 7};
        set.remove(6);
        REQUIRE_INDICES(set, 5, 7);
    }

    SECTION("bulk remove() does nothing if the indices are not in the set") {
        set = {5};
        set.remove({4, 6});
        REQUIRE_INDICES(set, 5);
    }

    SECTION("bulk remove() removes one-element ranges") {
        set = {5};
        set.remove({5, 6});
        REQUIRE(set.empty());
    }

    SECTION("bulk remove() shrinks ranges beginning with the indices") {
        set = {5, 6, 7};
        set.remove({4, 5});
        REQUIRE_INDICES(set, 6, 7);
    }

    SECTION("bulk remove() shrinks ranges ending with the indices") {
        set = {5, 6, 7};
        set.remove({7, 8});
        REQUIRE_INDICES(set, 5, 6);
    }

    SECTION("bulk remove() splits ranges containing the indices") {
        set = {5, 6, 7};
        set.remove({3, 6, 8});
        REQUIRE_INDICES(set, 5, 7);
    }

    SECTION("bulk remove() correctly removes multiple indices") {
        set = {5, 6, 7, 10, 11, 12, 13, 15};
        set.remove({6, 11, 13});
        REQUIRE_INDICES(set, 5, 7, 10, 12, 15);
    }
}
