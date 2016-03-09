#include "catch.hpp"

#include "collection_notifications.hpp"

#include "util/index_helpers.hpp"

TEST_CASE("collection change indices") {
    using namespace realm;
    _impl::CollectionChangeBuilder c;

    SECTION("stuff") {
        SECTION("insert() adds the row to the insertions set") {
            c.insert(5);
            c.insert(8);
            REQUIRE_INDICES(c.insertions, 5, 8);
        }

        SECTION("insert() shifts previous insertions and modifications") {
            c.insert(5);
            c.modify(8);

            c.insert(1);
            REQUIRE_INDICES(c.insertions, 1, 6);
            REQUIRE_INDICES(c.modifications, 9);
        }

        SECTION("insert() does not shift previous deletions") {
            c.erase(8);
            c.erase(3);
            c.insert(5);

            REQUIRE_INDICES(c.insertions, 5);
            REQUIRE_INDICES(c.deletions, 3, 8);
        }

        SECTION("modify() adds the row to the modifications set") {
            c.modify(3);
            c.modify(4);
            REQUIRE_INDICES(c.modifications, 3, 4);
        }

        SECTION("modify() on an inserted row marks it as both inserted and modified") {
            c.insert(3);
            c.modify(3);
            REQUIRE_INDICES(c.insertions, 3);
            REQUIRE_INDICES(c.modifications, 3);
        }

        SECTION("modify() doesn't interact with deleted rows") {
            c.erase(5);
            c.erase(4);
            c.erase(3);

            c.modify(4);
            REQUIRE_INDICES(c.modifications, 4);
        }

        SECTION("erase() adds the row to the deletions set") {
            c.erase(5);
            REQUIRE_INDICES(c.deletions, 5);
        }

        SECTION("erase() is shifted for previous deletions") {
            c.erase(5);
            c.erase(6);
            REQUIRE_INDICES(c.deletions, 5, 7);
        }

        SECTION("erase() is shifted for previous insertions") {
            c.insert(5);
            c.erase(6);
            REQUIRE_INDICES(c.deletions, 5);
        }

        SECTION("erase() removes previous insertions") {
            c.insert(5);
            c.erase(5);
            REQUIRE(c.insertions.empty());
            REQUIRE(c.deletions.empty());
        }

        SECTION("erase() removes previous modifications") {
            c.modify(5);
            c.erase(5);
            REQUIRE(c.modifications.empty());
            REQUIRE_INDICES(c.deletions, 5);
        }

        SECTION("erase() shifts previous modifications") {
            c.modify(5);
            c.erase(4);
            REQUIRE_INDICES(c.modifications, 4);
            REQUIRE_INDICES(c.deletions, 4);
        }

        SECTION("move() adds the move to the list of moves") {
            c.move(5, 6);
            REQUIRE_MOVES(c, {5, 6});
        }

        SECTION("move() updates previous moves to the source of this move") {
            c.move(5, 6);
            c.move(6, 7);
            REQUIRE_MOVES(c, {5, 7});
        }

        SECTION("move() shifts previous moves and is shifted by them") {
            c.move(5, 10);
            c.move(6, 12);
            REQUIRE_MOVES(c, {5, 9}, {7, 12});

            c.move(10, 0);
            REQUIRE_MOVES(c, {5, 10}, {7, 12}, {11, 0});
        }

        SECTION("moving a newly inserted row is not reported as a move") {
            c.insert(5);
            c.move(5, 10);
            REQUIRE_INDICES(c.insertions, 10);
            REQUIRE(c.moves.empty());
        }

        SECTION("move() shifts previous insertions and modifications") {
            c.insert(5);
            c.modify(6);
            c.move(10, 0);
            REQUIRE_INDICES(c.insertions, 0, 6);
            REQUIRE_INDICES(c.modifications, 7);
            REQUIRE_MOVES(c, {9, 0});
        }

        SECTION("move_over() marks the old last row as moved") {
            c.move_over(5, 8);
            REQUIRE_MOVES(c, {8, 5});
        }

        SECTION("move_over() does not mark the old last row as moved if it was newly inserted") {
            c.insert(8);
            c.move_over(5, 8);
            REQUIRE(c.moves.empty());
        }

        SECTION("move_over() removes previous modifications for the removed row") {
            c.modify(5);
            c.move_over(5, 8);
            REQUIRE(c.modifications.empty());
        }

        SECTION("move_over() updates previous insertions for the old last row") {
            c.insert(5);
            c.move_over(3, 5);
            REQUIRE_INDICES(c.insertions, 3);
        }

        SECTION("move_over() updates previous modifications for the old last row") {
            c.modify(5);
            c.move_over(3, 5);
            REQUIRE_INDICES(c.modifications, 3);
        }

        SECTION("move_over() removes moves to the target") {
            c.move(3, 5);
            c.move_over(5, 8);
            REQUIRE_MOVES(c, {8, 5});
        }

        SECTION("move_over() updates moves to the source") {
            c.move(3, 8);
            c.move_over(5, 8);
            REQUIRE_MOVES(c, {3, 5});
        }

        SECTION("move_over() is not shifted by previous calls to move_over()") {
            c.move_over(5, 10);
            c.move_over(6, 9);
            REQUIRE_INDICES(c.deletions, 5, 6, 9, 10);
            REQUIRE_INDICES(c.insertions, 5, 6);
            REQUIRE_MOVES(c, {10, 5}, {9, 6});
        }
    }

    SECTION("calculate") {
        auto all_modified = [](size_t) { return true; };
        auto none_modified = [](size_t) { return false; };

        SECTION("no changes") {
            c = _impl::CollectionChangeBuilder::calculate({1, 2, 3}, {1, 2, 3}, none_modified, false);
            REQUIRE(c.empty());
        }

        SECTION("inserting from empty") {
            c = _impl::CollectionChangeBuilder::calculate({}, {1, 2, 3}, all_modified, false);
            REQUIRE_INDICES(c.insertions, 0, 1, 2);
        }

        SECTION("deleting all existing") {
            c = _impl::CollectionChangeBuilder::calculate({1, 2, 3}, {}, all_modified, false);
            REQUIRE_INDICES(c.deletions, 0, 1, 2);
        }

        SECTION("all rows modified without changing order") {
            c = _impl::CollectionChangeBuilder::calculate({1, 2, 3}, {1, 2, 3}, all_modified, false);
            REQUIRE_INDICES(c.modifications, 0, 1, 2);
        }

        SECTION("single insertion in middle") {
            c = _impl::CollectionChangeBuilder::calculate({1, 3}, {1, 2, 3}, all_modified, false);
            REQUIRE_INDICES(c.insertions, 1);
        }

        SECTION("single deletion in middle") {
            c = _impl::CollectionChangeBuilder::calculate({1, 2, 3}, {1, 3}, all_modified, false);
            REQUIRE_INDICES(c.deletions, 1);
        }

        SECTION("unsorted reordering") {
            auto calc = [&](std::vector<size_t> values) {
                return _impl::CollectionChangeBuilder::calculate({1, 2, 3}, values, none_modified, false);
            };

            // The commented-out permutations are not possible with
            // move_last_over() and so are unhandled by unsorted mode
            REQUIRE(calc({1, 2, 3}).empty());
            REQUIRE_MOVES(calc({1, 3, 2}), {2, 1});
//            REQUIRE_MOVES(calc({2, 1, 3}), {1, 0});
//            REQUIRE_MOVES(calc({2, 3, 1}), {1, 0}, {2, 1});
            REQUIRE_MOVES(calc({3, 1, 2}), {2, 0});
            REQUIRE_MOVES(calc({3, 2, 1}), {2, 0}, {1, 1});
        }

        SECTION("sorted reordering") {
            auto calc = [&](std::vector<size_t> values) {
                return _impl::CollectionChangeBuilder::calculate({1, 2, 3}, values, all_modified, true);
            };

            REQUIRE(calc({1, 2, 3}).moves.empty());
            return;
            // none of these actually work since it just does insert+delete
            REQUIRE_MOVES(calc({1, 3, 2}), {2, 1});
            REQUIRE_MOVES(calc({2, 1, 3}), {1, 0});
            REQUIRE_MOVES(calc({2, 3, 1}), {1, 0}, {2, 1});
            REQUIRE_MOVES(calc({3, 1, 2}), {2, 0});
            REQUIRE_MOVES(calc({3, 2, 1}), {2, 0}, {1, 1});
        }

        SECTION("merge can collapse insert -> move -> delete to no-op") {
            auto four_modified = [](size_t ndx) { return ndx == 4; };
            for (int insert_pos = 0; insert_pos < 4; ++insert_pos) {
                for (int move_to_pos = 0; move_to_pos < 4; ++move_to_pos) {
                    if (insert_pos == move_to_pos)
                        continue;
                    CAPTURE(insert_pos);
                    CAPTURE(move_to_pos);

                    std::vector<size_t> after_insert = {1, 2, 3};
                    after_insert.insert(after_insert.begin() + insert_pos, 4);
                    c = _impl::CollectionChangeBuilder::calculate({1, 2, 3}, after_insert, four_modified, true);

                    std::vector<size_t> after_move = {1, 2, 3};
                    after_move.insert(after_move.begin() + move_to_pos, 4);
                    c.merge(_impl::CollectionChangeBuilder::calculate(after_insert, after_move, four_modified, true));

                    c.merge(_impl::CollectionChangeBuilder::calculate(after_move, {1, 2, 3}, four_modified, true));
                    REQUIRE(c.empty());
                }
            }
        }
    }

    SECTION("merge") {
        SECTION("deletions are shifted by previous deletions") {
            c = {{5}, {}, {}, {}};
            c.merge({{3}, {}, {}, {}});
            REQUIRE_INDICES(c.deletions, 3, 5);

            c = {{5}, {}, {}, {}};
            c.merge({{4}, {}, {}, {}});
            REQUIRE_INDICES(c.deletions, 4, 5);

            c = {{5}, {}, {}, {}};
            c.merge({{5}, {}, {}, {}});
            REQUIRE_INDICES(c.deletions, 5, 6);

            c = {{5}, {}, {}, {}};
            c.merge({{6}, {}, {}, {}});
            REQUIRE_INDICES(c.deletions, 5, 7);
        }

        SECTION("deletions are shifted by previous insertions") {
            c = {{}, {5}, {}, {}};
            c.merge({{4}, {}, {}, {}});
            REQUIRE_INDICES(c.deletions, 4);

            c = {{}, {5}, {}, {}};
            c.merge({{6}, {}, {}, {}});
            REQUIRE_INDICES(c.deletions, 5);
        }

        SECTION("deletions shift previous insertions") {
            c = {{}, {2, 3}, {}, {}};
            c.merge({{1}, {}, {}, {}});
            REQUIRE_INDICES(c.insertions, 1, 2);
        }

        SECTION("deletions remove previous insertions") {
            c = {{}, {1, 2}, {}, {}};
            c.merge({{2}, {}, {}, {}});
            REQUIRE_INDICES(c.insertions, 1);
        }

        SECTION("deletions remove previous modifications") {
            c = {{}, {}, {2, 3}, {}};
            c.merge({{2}, {}, {}, {}});
            REQUIRE_INDICES(c.modifications, 2);
        }

        SECTION("deletions shift previous modifications") {
            c = {{}, {}, {2, 3}, {}};
            c.merge({{1}, {}, {}, {}});
            REQUIRE_INDICES(c.modifications, 1, 2);
        }

        SECTION("deletions remove previous moves to deleted row") {
            c = {{}, {}, {}, {{2, 3}}};
            c.merge({{3}, {}, {}, {}});
            REQUIRE(c.moves.empty());
        }

        SECTION("deletions shift destination of previous moves to after the deleted row") {
            c = {{}, {}, {}, {{2, 5}}};
            c.merge({{3}, {}, {}, {}});
            REQUIRE_MOVES(c, {2, 4});
        }

        SECTION("insertions do not interact with previous deletions") {
            c = {{1, 3}, {}, {}, {}};
            c.merge({{}, {1, 2, 3}, {}, {}});
            REQUIRE_INDICES(c.deletions, 1, 3);
            REQUIRE_INDICES(c.insertions, 1, 2, 3);
        }

        SECTION("insertions shift previous insertions") {
            c = {{}, {1, 5}, {}, {}};
            c.merge({{}, {1, 4}, {}, {}});
            REQUIRE_INDICES(c.insertions, 1, 2, 4, 7);
        }

        SECTION("insertions shift previous modifications") {
            c = {{}, {}, {1, 5}, {}};
            c.merge({{}, {1, 4}, {}, {}});
            REQUIRE_INDICES(c.modifications, 2, 7);
            REQUIRE_INDICES(c.insertions, 1, 4);
        }

        SECTION("insertions shift destination of previous moves") {
            c = {{}, {}, {}, {{2, 5}}};
            c.merge({{}, {3}, {}});
            REQUIRE_MOVES(c, {2, 6});
        }

        SECTION("modifications do not interact with previous deletions") {
            c = {{1, 2, 3}, {}, {}, {}};
            c.merge({{}, {}, {2}});
            REQUIRE_INDICES(c.deletions, 1, 2, 3);
            REQUIRE_INDICES(c.modifications, 2);
        }

        SECTION("modifications are discarded for previous insertions") {
            c = {{}, {2}, {}, {}};
            c.merge({{}, {}, {1, 2, 3}});
            REQUIRE_INDICES(c.insertions, 2);
            REQUIRE_INDICES(c.modifications, 1, 3);
        }

        SECTION("modifications are merged with previous modifications") {
            c = {{}, {}, {2}, {}};
            c.merge({{}, {}, {1, 2, 3}});
            REQUIRE_INDICES(c.modifications, 1, 2, 3);
        }

        SECTION("modifications are discarded for the destination of previous moves") {
            c = {{}, {}, {}, {{1, 2}}};
            c.merge({{}, {}, {2, 3}});
            REQUIRE_INDICES(c.modifications, 3);
        }

        SECTION("move sources are shifted for previous deletes and insertions") {
            c = {{1}, {}, {}, {}};
            c.merge({{}, {}, {}, {{2, 3}}});
            REQUIRE_MOVES(c, {3, 3});

            c = {{}, {1}, {}, {}};
            c.merge({{}, {}, {}, {{2, 3}}});
            REQUIRE_MOVES(c, {1, 3});

            c = {{2}, {4}, {}, {}};
            c.merge({{}, {}, {}, {{5, 10}}});
            REQUIRE_MOVES(c, {5, 10});
        }

        SECTION("moves remove previous modifications to source") {
            c = {{}, {}, {1}, {}};
            c.merge({{}, {}, {}, {{1, 3}}});
            REQUIRE(c.modifications.empty());
            REQUIRE_MOVES(c, {1, 3});
        }

        SECTION("moves update insertion position for previous inserts of source") {
            c = {{}, {1}, {}, {}};
            c.merge({{}, {}, {}, {{1, 3}}});
            REQUIRE(c.moves.empty());
            REQUIRE_INDICES(c.insertions, 3);
        }

        SECTION("moves update previous moves to the source") {
            c = {{}, {}, {}, {{1, 3}}};
            c.merge({{}, {}, {}, {{3, 5}}});
            REQUIRE_MOVES(c, {1, 5});
        }

        SECTION("moves shift destination of previous moves like an insert/delete pair would") {
            c = {{}, {}, {}, {{1, 3}}};
            c.merge({{}, {}, {}, {{2, 5}}});
            REQUIRE_MOVES(c, {1, 2}, {3, 5});

            c = {{}, {}, {}, {{1, 10}}};
            c.merge({{}, {}, {}, {{2, 5}}});
            REQUIRE_MOVES(c, {1, 10}, {3, 5});

            c = {{}, {}, {}, {{5, 10}}};
            c.merge({{}, {}, {}, {{12, 2}}});
            REQUIRE_MOVES(c, {5, 11}, {12, 2});
        }

        SECTION("moves shift previous inserts like an insert/delete pair would") {
            c = {{}, {5}};
            c.merge({{}, {}, {}, {{2, 6}}});
            REQUIRE_INDICES(c.insertions, 4, 6);
        }

        SECTION("moves shift previous modifications like an insert/delete pair would") {
            c = {{}, {}, {5}};
            c.merge({{}, {}, {}, {{2, 6}}});
            REQUIRE_INDICES(c.modifications, 4);
        }

        SECTION("moves are shifted by previous deletions like an insert/delete pair would") {
            c = {{5}};
            c.merge({{}, {}, {}, {{2, 6}}});
            REQUIRE_MOVES(c, {2, 6});

            c = {{5}};
            c.merge({{}, {}, {}, {{6, 2}}});
            REQUIRE_MOVES(c, {7, 2});
        }
    }
}
