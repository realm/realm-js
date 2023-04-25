#pragma once

#include "realm/binary_data.hpp"
#include "realm/object-store/object_store.hpp"
#include "realm/object-store/sync/mongo_collection.hpp"
#include "realm/object-store/sync/sync_session.hpp"
#include "realm/object_id.hpp"
#include "realm/query.hpp"
#include "realm/sync/client_base.hpp"
#include "realm/sync/protocol.hpp"
#include "realm/sync/subscriptions.hpp"
#include "realm/util/base64.hpp"
#include "realm/util/file.hpp"
#include "realm/util/logger.hpp"
#include <condition_variable>
#include <exception>
#include <iostream>
#include <memory>
#include <mutex>

#include <realm/object-store/keypath_helpers.hpp>
#include <realm/object-store/results.hpp>
#include <realm/object-store/thread_safe_reference.hpp>
#include <realm/object-store/util/scheduler.hpp>
#include <realm/object-store/collection_notifications.hpp>
#include <realm/object-store/binding_context.hpp>
#include <realm/object-store/impl/object_notifier.hpp>
#include <realm/object-store/impl/realm_coordinator.hpp>
#include <realm/object-store/shared_realm.hpp>
#include <realm/object-store/sync/generic_network_transport.hpp>
#include <realm/object-store/util/event_loop_dispatcher.hpp>
#include <realm/util/functional.hpp>
#include <string_view>
#include <system_error>
#include <thread>
#include <type_traits>
#include <utility>

// Equivalent to auto(x) in c++23.
#define REALM_DECAY_COPY(x) std::decay_t<decltype(x)>(x)

// Equivalent to std::forward<decltype(x)>(x), but faster to compile and less impact on debug builds
#define FWD(x) ((decltype(x)&&)(x))

namespace realm::js {
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
    static Results results_append_query(Results results, Query query)
    {
        auto ordering = query.get_ordering();
        if (ordering) {
            return results.filter(std::move(query)).apply_ordering(std::move(*ordering));
        }
        else {
            return results.filter(std::move(query));
        }
    }
    static std::shared_ptr<_impl::ObjectNotifier> make_object_notifier(const SharedRealm& realm, const Obj& obj)
    {
        realm->verify_thread();
        realm->verify_notifications_available();
        auto notifier = std::make_shared<_impl::ObjectNotifier>(realm, obj.get_table()->get_key(), obj.get_key());
        _impl::RealmCoordinator::register_notifier(notifier);
        return notifier;
    }
    static std::pair<Obj, bool> get_or_create_object_with_primary_key(TableRef table, const Mixed& primary_key)
    {
        bool did_create;
        auto obj = table->create_object_with_primary_key(primary_key, &did_create);
        return {obj, did_create};
    };

    // Binding context is hard to wrap in part due to unique_ptr, and in part due to circular weak_ptr.
    // Also, some of the arguments passed are difficult to bind to, and unnecessary.
    // For now, making a helper, but may look in to auto-generating with core API changes.
    // TODO may need a hook for BindingContext destruction.
    struct BindingContextMethods {
        util::UniqueFunction<void(SharedRealm)> did_change;
        util::UniqueFunction<void(SharedRealm)> before_notify;
        util::UniqueFunction<void(SharedRealm)> schema_did_change;
    };

    static bool has_binding_context(const Realm& realm)
    {
        return bool(realm.m_binding_context);
    }
    static void set_binding_context(const SharedRealm& realm, BindingContextMethods methods)
    {
        struct TheBindingContext final : BindingContext {
            TheBindingContext(const SharedRealm& r, BindingContextMethods&& methods)
                : methods(std::move(methods))
            {
                // realm is a weak_ptr on the base.
                realm = r;
            }

            void did_change(std::vector<ObserverState> const&, std::vector<void*> const&, bool) override
            {
                if (methods.did_change)
                    methods.did_change(get_realm());
            }
            void before_notify() override
            {
                if (methods.before_notify)
                    methods.before_notify(get_realm());
            }
            void schema_did_change(realm::Schema const&) override
            {
                if (methods.schema_did_change)
                    methods.schema_did_change(get_realm());
            }

        private:
            SharedRealm get_realm()
            {
                if (auto ptr = realm.lock())
                    return ptr;
                throw std::runtime_error("Realm no longer exists");
            }

            BindingContextMethods methods;
        };

        realm->m_binding_context = std::make_unique<TheBindingContext>(realm, std::move(methods));
    }

    // This requires the ability to implement interfaces.
    // This is planned, but for now, providing a helper unlocks sync.
    template <typename F>
    static std::shared_ptr<app::GenericNetworkTransport> make_network_transport(F&& runRequest)
    {

        class Impl final : public app::GenericNetworkTransport {
        public:
            Impl(F&& runRequest)
                : runRequest(FWD(runRequest))
            {
            }
            void send_request_to_server(const app::Request& request,
                                        util::UniqueFunction<void(const app::Response&)>&& completionBlock) override
            {
                runRequest(std::move(request), std::move(completionBlock));
            }
            std::decay_t<F> runRequest;
        };
        return std::make_shared<Impl>(FWD(runRequest));
    }

    static void delete_data_for_object(const SharedRealm& realm, StringData object_type)
    {
        auto& group = realm->read_group();
        ObjectStore::delete_data_for_object(group, object_type);
    }

    static bool is_empty_realm(const SharedRealm& realm)
    {
        return ObjectStore::is_empty(realm->read_group());
    }

    static OwnedBinaryData base64_decode(StringData input)
    {
        size_t max_size = util::base64_decoded_size(input.size());
        std::unique_ptr<char[]> data(new char[max_size]);
        if (auto size = util::base64_decode(input, data.get(), max_size)) {
            OwnedBinaryData result(std::move(data), *size);
            return result;
        }
        else {
            throw std::runtime_error("Attempting to decode binary data from a string that is not valid base64");
        }
    }

    using LoggerFactory = std::function<std::shared_ptr<util::Logger>(util::Logger::Level)>;
    using LogCallback = std::function<void(util::Logger::Level, const std::string& message)>;
    static LoggerFactory make_logger_factory(LogCallback&& logger)
    {
        return [logger = std::move(logger)](util::Logger::Level level) mutable {
            auto out = make_logger(std::move(logger));
            out->set_level_threshold(level);
            return out;
        };
    }

    static std::shared_ptr<util::Logger> make_logger(LogCallback&& logger)
    {
        class MyLogger final : public util::Logger {
        public:
            MyLogger(const LogCallback& log)
                : m_log(log)
            {
            }

        private:
            void do_log(Level level, const std::string& message) final
            {
                m_log(level, message);
            }
            LogCallback m_log;
        };

        return std::make_shared<MyLogger>(logger);
    }

    static void simulate_sync_error(SyncSession& session, const int& code, const std::string& message,
                                    const std::string& type, bool is_fatal)
    {
        std::error_code error_code(code, type == "realm::sync::ProtocolError" ? realm::sync::protocol_error_category()
                                                                              : realm::sync::client_error_category());
        sync::SessionErrorInfo error{error_code, message, is_fatal};
        error.server_requests_action =
            code == 211 ? sync::ProtocolErrorInfo::Action::ClientReset : sync::ProtocolErrorInfo::Action::Warning;
        SyncSession::OnlyForTesting::handle_error(session, std::move(error));
    }

    // This is entirely because ThreadSafeReference is a move-only type, and those are hard to expose to JS.
    // Instead, we are exposing a function that takes a mutable lvalue reference and moves from it.
    static SharedRealm consume_thread_safe_reference_to_shared_realm(ThreadSafeReference& tsr)
    {
        return Realm::get_shared_realm(std::move(tsr));
    }

    static bool file_exists(const StringData& path)
    {
        return realm::util::File::exists(path);
    }

    static bool erase_subscription(sync::MutableSubscriptionSet& subs, const sync::Subscription& sub_to_remove)
    {
        auto it = std::find_if(subs.begin(), subs.end(), [&](const auto& sub) {
            return sub.id == sub_to_remove.id;
        });

        if (it == subs.end()) {
            return false;
        }
        subs.erase(it);

        return true;
    }

    static std::string get_results_description(const Results& results)
    {
        const auto& query = results.get_query();

        return query.get_description() + ' ' + results.get_descriptor_ordering().get_description(query.get_table());
    }

    static void feed_buffer(app::WatchStream& ws, BinaryData buffer)
    {
        ws.feed_buffer({buffer.data(), buffer.size()});
    }

    static auto make_ssl_verify_callback(std::function<bool(const std::string& server_address, int server_port,
                                                            std::string_view pem_data, int preverify_ok, int depth)>
                                             callback)
    {
        return [callback = std::move(callback)](const std::string& server_address, uint16_t server_port,
                                                const char* pem_data, size_t pem_size, int preverify_ok, int depth) {
            return callback(server_address, server_port, std::string_view(pem_data, pem_size), preverify_ok, depth);
        };
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

class ThreadConfinementChecker {
public:
    void assertOnSameThread() const noexcept
    {
        REALM_ASSERT_RELEASE(std::this_thread::get_id() == m_constructed_on);
    }

private:
    const std::thread::id m_constructed_on = std::this_thread::get_id();
};

template <typename F>
auto schedulerWrapBlockingFunction(F&& f)
{
    return [f = FWD(f), sched = util::Scheduler::make_default()](
               auto&&... args) -> std::decay_t<std::invoke_result_t<F, decltype(args)...>> {
        using Ret = std::decay_t<std::invoke_result_t<F, decltype(args)...>>;
        if (sched->is_on_thread())
            return f(FWD(args)...);

        // TODO in C++20, can use std::atomic<bool>::wait() and notify() rather than mutex and condvar.
        std::mutex mx;
        std::condition_variable cond;
        std::optional<Ret> ret;
        std::exception_ptr ex;

        sched->invoke([&]() noexcept {
            auto lk = std::lock_guard(mx);
            try {
                ret.emplace(f(FWD(args)...));
            }
            catch (...) {
                ex = std::current_exception();
            }
            cond.notify_all();
        });

        auto lk = std::unique_lock(mx);
        cond.wait(lk, [&] {
            return ret || ex;
        });
        if (ex)
            std::rethrow_exception(ex);
        return std::move(*ret);
    };
}

/**
 * Helps with correct handling of -1/npos for count_t
 */
template <typename T>
auto asSigned(T num)
{
    return std::make_signed_t<T>(num);
}

} // namespace
} // namespace realm::js
