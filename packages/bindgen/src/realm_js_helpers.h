#include <napi.h>

// Used by Helpers::get_keypath_mapping
#include <realm/object-store/keypath_helpers.hpp>

#include <realm/object-store/results.hpp>
#include <realm/object-store/thread_safe_reference.hpp>
#include <realm/object-store/util/scheduler.hpp>
#include <realm/object-store/collection_notifications.hpp>
#include <realm/object-store/impl/object_notifier.hpp>
#include <realm/object-store/impl/realm_coordinator.hpp>


namespace realm::js::node {
namespace {

// These types are exposed to JS in the spec.
// TODO look into moving some of this to realm-core
struct Helpers {
    static TableRef get_table(const SharedRealm& realm, StringData name)
    {
        return realm->read_group().get_table(name);
    }
    static TableRef get_table(const SharedRealm& realm, TableKey key)
    {
        return realm->read_group().get_table(key);
    }
    static query_parser::KeyPathMapping get_keypath_mapping(const SharedRealm& realm)
    {
        query_parser::KeyPathMapping mapping;
        populate_keypath_mapping(mapping, *realm);
        return mapping;
    }
    static Results results_from_query(const SharedRealm& realm, Query q)
    {
        auto ordering = q.get_ordering();
        return Results(realm, std::move(q), ordering ? *ordering : DescriptorOrdering());
    }
    static std::shared_ptr<_impl::ObjectNotifier> make_object_notifier(const SharedRealm& realm, const Obj& obj)
    {
        realm->verify_thread();
        realm->verify_notifications_available();
        auto notifier = std::make_shared<_impl::ObjectNotifier>(realm, obj.get_table()->get_key(), obj.get_key());
        _impl::RealmCoordinator::register_notifier(notifier);
        return notifier;
    }
};

struct ObjectChangeSet {
    ObjectChangeSet() = default;
    /*implicit*/ ObjectChangeSet(const CollectionChangeSet& changes)
    {
        is_deleted = !changes.deletions.empty();
        for (const auto& [col_key_val, index_set] : changes.columns) {
            changed_columns.push_back(ColKey(col_key_val));
        }
    }

    bool is_deleted;
    std::vector<ColKey> changed_columns;
};

////////////////////////////////////////////////////////////

// These helpers are used by the generated code.

template <typename Container>
class [[nodiscard]] ContainerResizer {
public:
    explicit ContainerResizer(Container& container)
        : m_container(&container)
        , m_old_size(container.size())
    {
    }
    ContainerResizer(ContainerResizer&&) = delete;
    ~ContainerResizer()
    {
        if (m_old_size == 0) {
            // this can be a bit faster than resize()
            m_container->clear();
        }
        else {
            m_container->resize(m_old_size);
        }
    }

private:
    Container* const m_container;
    const size_t m_old_size;
};

// TODO consider allowing Number (double) with (u)int64_t.
inline int64_t extractInt64FromNode(const Napi::Value& input)
{
    bool lossless;
    auto output = input.As<Napi::BigInt>().Int64Value(&lossless);
    if (!lossless)
        throw Napi::RangeError::New(input.Env(), "Value doesn't fit in int64_t");
    return output;
}
inline uint64_t extractUint64FromNode(const Napi::Value& input)
{
    bool lossless;
    auto output = input.As<Napi::BigInt>().Uint64Value(&lossless);
    if (!lossless)
        throw Napi::RangeError::New(input.Env(), "Value doesn't fit in uint64_t");
    return output;
}

[[noreturn]] REALM_NOINLINE inline void throwNodeException(Napi::Env& env, const std::exception& e)
{
    if (dynamic_cast<const Napi::Error*>(&e))
        throw; // Just allow exception propagation to continue
    // TODO consider throwing more specific errors in some cases.
    // TODO consider using ThrowAsJavaScriptException instead here.
    throw Napi::Error::New(env, e.what());
}

// Equivalent to auto(x) in c++23.
#define REALM_DECAY_COPY(x) std::decay_t<decltype(x)>(x)

} // namespace
} // namespace realm::js::node
