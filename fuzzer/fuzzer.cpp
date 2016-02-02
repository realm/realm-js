#include "object_schema.hpp"
#include "property.hpp"
#include "results.hpp"
#include "schema.hpp"
#include "impl/realm_coordinator.hpp"

#include <realm/commit_log.hpp>
#include <realm/disable_sync_to_disk.hpp>
#include <realm/group_shared.hpp>
#include <realm/link_view.hpp>

#include <iostream>
#include <set>
#include <sstream>
#include <strstream>
#include <sys/types.h>
#include <sys/uio.h>
#include <unistd.h>

using namespace realm;

#define FUZZ_SORTED 1

#if 0
#define log(...) fprintf(stderr, __VA_ARGS__)
#else
#define log(...)
#endif

// Read from a fd until eof into a string
// Needs to use unbuffered i/o to work properly with afl
static void read_all(std::string& buffer, int fd)
{
    buffer.clear();
    size_t offset = 0;
    while (true) {
        buffer.resize(offset + 4096);
        ssize_t bytes_read = read(fd, &buffer[offset], 4096);
        if (bytes_read < 4096) {
            buffer.resize(offset + bytes_read);
            break;
        }
        offset += 4096;
    }
}

static std::vector<int64_t> read_initial_values(std::istream& input_stream)
{
    std::vector<int64_t> initial_values;
    std::string line;
    input_stream.seekg(0);
    while (std::getline(input_stream, line) && !line.empty()) {
        try {
            initial_values.push_back(std::stoll(line));
        }
        catch (std::invalid_argument) {
            // not an error
        }
        catch (std::out_of_range) {
            // not an error
        }
    }
    return initial_values;
}

struct Change {
    enum class Action {
        Commit,
        Add,
        Modify,
        Delete
    } action;

    size_t index = npos;
    int64_t value = 0;
};

static std::vector<Change> read_changes(std::istream& input_stream)
{
    std::vector<Change> ret;

    while (!input_stream.eof()) {
        char op = '\0';
        input_stream >> op;
        if (!input_stream.good())
            break;
        switch (op) {
            case 'a': {
                int64_t value = 0;
                input_stream >> value;
                if (input_stream.good())
                    ret.push_back({Change::Action::Add, npos, value});
                break;
            }
            case 'm': {
                int64_t value;
                size_t ndx;
                input_stream >> ndx >> value;
                if (input_stream.good())
                    ret.push_back({Change::Action::Modify, ndx, value});
                break;
            }
            case 'd': {
                size_t ndx;
                input_stream >> ndx;
                if (input_stream.good())
                    ret.push_back({Change::Action::Delete, ndx, 0});
                break;
            }
            case 'c': {
                ret.push_back({Change::Action::Commit, npos, 0});
                break;
            }
            default:
                return ret;

        }
    }
    return ret;
}

static Query query(Table& table)
{
    return table.where().greater(1, 100).less(1, 50000);
}

static TableView tableview(Table& table)
{
    auto tv = table.where().greater(1, 100).less(1, 50000).find_all();
#if FUZZ_SORTED
    tv.sort({1, 0}, {true, true});
#endif
    return tv;
}

static int64_t id = 0;

static void import_initial_values(SharedRealm& r, std::vector<int64_t>& initial_values)
{
    auto& table = *r->read_group()->get_table("class_object");

    r->begin_transaction();
    table.clear();
    size_t ndx = table.add_empty_row(initial_values.size());
    for (auto value : initial_values) {
        table.set_int(0, ndx, id++);
        table.set_int(1, ndx++, value);
        log("%lld\n", value);
    }
    r->commit_transaction();
}

// Apply the changes from the command file and then return whether a change
// notification should occur
static bool apply_changes(Realm& r, std::istream& input_stream)
{
    auto& table = *r.read_group()->get_table("class_object");
    auto tv = tableview(table);

    std::vector<int64_t> modified;

    log("\n");
    r.begin_transaction();
    for (auto const& change : read_changes(input_stream)) {
        switch (change.action) {
            case Change::Action::Commit:
                log("c\n");
                r.commit_transaction();
                _impl::RealmCoordinator::get_existing_coordinator(r.config().path)->on_change();
                r.begin_transaction();
                break;

            case Change::Action::Add: {
                log("a %lld\n", change.value);
                size_t ndx = table.add_empty_row();
                table.set_int(0, ndx, id++);
                table.set_int(1, ndx, change.value);
                break;
            }

            case Change::Action::Modify:
                if (change.index < table.size()) {
                    log("m %zu %lld\n", change.index, change.value);
                    modified.push_back(table.get_int(0, change.index));
                    table.set_int(1, change.index, change.value);
                }
                break;

            case Change::Action::Delete:
                if (change.index < table.size()) {
                    log("d %zu\n", change.index);
                    table.move_last_over(change.index);
                }
                break;
        }
    }
    r.commit_transaction();
    log("\n");

    auto tv2 = tableview(table);
    if (tv.size() != tv2.size())
        return true;

    for (size_t i = 0; i < tv.size(); ++i) {
        if (!tv.is_row_attached(i))
            return true;
        if (tv.get_int(0, i) != tv2.get_int(0, i))
            return true;
        if (find(begin(modified), end(modified), tv.get_int(0, i)) != end(modified))
            return true;
    }

    return false;
}

static void verify(CollectionChangeIndices const& changes, std::vector<int64_t> values, Table& table)
{
    auto tv = tableview(table);

    // Apply the changes from the transaction log to our copy of the
    // initial, using UITableView's batching rules (i.e. delete, then
    // insert, then update)
    auto it = std::make_reverse_iterator(changes.deletions.end()), end = std::make_reverse_iterator(changes.deletions.begin());
    for (; it != end; ++it) {
        values.erase(values.begin() + it->first, values.begin() + it->second);
    }

    for (auto i : changes.insertions.as_indexes()) {
        values.insert(values.begin() + i, tv.get_int(1, i));
    }

    if (values.size() != tv.size()) {
        abort();
    }

    for (auto i : changes.modifications.as_indexes()) {
        if (changes.insertions.contains(i))
            abort();
        values[i] = tv.get_int(1, i);
    }

#if FUZZ_SORTED
    if (!std::is_sorted(values.begin(), values.end()))
        abort();
#endif

    for (size_t i = 0; i < values.size(); ++i) {
        if (values[i] != tv.get_int(1, i)) {
            abort();
        }
    }
}

static void test(Realm::Config const& config, SharedRealm& r, SharedRealm& r2, std::istream& input_stream)
{
    std::vector<int64_t> initial_values = read_initial_values(input_stream);
    if (initial_values.empty()) {
        return;
    }
    import_initial_values(r, initial_values);

    auto& table = *r->read_group()->get_table("class_object");
    auto results = Results(r, ObjectSchema(), query(table))
#if FUZZ_SORTED
        .sort({{1, 0}, {true, true}})
#endif
        ;

    initial_values.clear();
    for (size_t i = 0; i < results.size(); ++i)
        initial_values.push_back(results.get(i).get_int(1));

    CollectionChangeIndices changes;
    int notification_calls = 0;
    auto token = results.add_notification_callback([&](CollectionChangeIndices c, std::exception_ptr err) {
        if (notification_calls > 0 && c.empty())
            abort();
        changes = c;
        ++notification_calls;
    });

    auto& coordinator = *_impl::RealmCoordinator::get_existing_coordinator(config.path);
    coordinator.on_change(); r->notify();
    if (notification_calls != 1) {
        abort();
    }

    bool expect_notification = apply_changes(*r2, input_stream);
    coordinator.on_change(); r->notify();

    if (notification_calls != 1 + expect_notification) {
        abort();
    }

    verify(changes, initial_values, table);
}

int main(int argc, char** argv) {
    std::ios_base::sync_with_stdio(false);
    realm::disable_sync_to_disk();

    Realm::Config config;
    config.path = getenv("TMPDIR");
    config.path += "/realm.XXXXXX";
    mktemp(&config.path[0]);
    config.cache = false;
    config.in_memory = true;
    config.automatic_change_notifications = false;

    Schema schema = {
        {"object", "", {
            {"id", PropertyTypeInt},
            {"value", PropertyTypeInt}
        }}
    };

    config.schema = std::make_unique<Schema>(schema);
    unlink(config.path.c_str());

    auto r = Realm::get_shared_realm(config);
    auto r2 = Realm::get_shared_realm(config);
    auto& coordinator = *_impl::RealmCoordinator::get_existing_coordinator(config.path);

    auto test_on = [&](auto& buffer) {
        id = 0;

        std::istringstream ss(buffer);
        test(config, r, r2, ss);
        if (r->is_in_transaction())
            r->cancel_transaction();
        r2->invalidate();
        coordinator.on_change();
    };

    if (argc > 1) {
        std::string buffer;
        for (int i = 1; i < argc; ++i) {
            int fd = open(argv[i], O_RDONLY);
            if (fd < 0)
                abort();
            read_all(buffer, fd);
            close(fd);

            test_on(buffer);
        }
        unlink(config.path.c_str());
        return 0;
    }

#ifdef __AFL_HAVE_MANUAL_CONTROL
    std::string buffer;
    while (__AFL_LOOP(1000)) {
        read_all(buffer, 0);
        test_on(buffer);
    }
#else
    std::string buffer;
    read_all(buffer, 0);
    test_on(buffer);
#endif

    unlink(config.path.c_str());
    return 0;
}
