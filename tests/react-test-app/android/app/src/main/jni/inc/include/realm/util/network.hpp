/*************************************************************************
 *
 * REALM CONFIDENTIAL
 * __________________
 *
 *  [2011] - [2012] Realm Inc
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Realm Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Realm Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Realm Incorporated.
 *
 **************************************************************************/
#ifndef REALM_UTIL_NETWORK_HPP
#define REALM_UTIL_NETWORK_HPP

#include <cstddef>
#include <memory>
#include <chrono>
#include <tuple>
#include <string>
#include <ostream>

#include <sys/types.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <netdb.h>

#include <realm/util/features.h>
#include <realm/util/assert.hpp>
#include <realm/util/buffer.hpp>
#include <realm/util/basic_system_errors.hpp>
#include <realm/util/call_with_tuple.hpp>

namespace realm {
namespace util {

/// \brief TCP/IP networking API.
///
/// The design of this networking API is heavily inspired by the ASIO C++
/// library (http://think-async.com).
///
/// ### Thread safety
///
/// A *service context* is a set of objects consisting of an instance of
/// io_service, and all the objects that are associated with that instance (\ref
/// resolver, \ref acceptor`, \ref socket`, \ref buffered_input_stream, and \ref
/// deadline_timer).
///
/// In general, it is unsafe for two threads to call functions on the same
/// object, or on different objects in the same service context. This also
/// applies to destructors. Notable exceptions are the fully thread-safe
/// functions, such as io_service::post(), io_service::stop(), and
/// io_service::reset().
///
/// On the other hand, it is always safe for two threads to call functions on
/// objects belonging to different service contexts.
///
/// One implication of these rules is that at most one thread must execute run()
/// at any given time.
///
/// Unless otherwise specified, free-staing objects, such as \ref protocol, \ref
/// address, \ref endpoint, and \ref endpoint::list are fully thread-safe as
/// long as they are not mutated. If one thread is mutating such an object, no
/// other thread may access it. Note that these free-standing objects are not
/// associcated with an instance of io_service, and are therefore not part of a
/// service context.
namespace network {

std::string host_name();


class protocol;
class address;
class endpoint;
class io_service;
class resolver;
class socket_base;
class socket;
class acceptor;
class buffered_input_stream;
class deadline_timer;


/// \brief An IP protocol descriptor.
class protocol {
public:
    static protocol ip_v4();
    static protocol ip_v6();

    bool is_ip_v4() const;
    bool is_ip_v6() const;

    protocol();
    ~protocol() noexcept {}

private:
    int m_family;
    int m_socktype;
    int m_protocol;

    friend class resolver;
    friend class socket_base;
};


/// \brief An IP address (IPv4 or IPv6).
class address {
public:
    bool is_ip_v4() const;
    bool is_ip_v6() const;

    template<class C, class T>
    friend std::basic_ostream<C,T>& operator<<(std::basic_ostream<C,T>&, const address&);

    address();
    ~address() noexcept {}

private:
    typedef in_addr  ip_v4_type;
    typedef in6_addr ip_v6_type;
    union union_type {
        ip_v4_type m_ip_v4;
        ip_v6_type m_ip_v6;
    };
    union_type m_union;
    bool m_is_ip_v6;

    friend class endpoint;
};


/// \brief An IP endpoint.
///
/// An IP endpoint is a triplet (`protocol`, `address`, `port`).
class endpoint {
public:
    using port_type = uint_fast16_t;
    class list;

    class protocol protocol() const;
    class address address() const;
    port_type port() const;

    endpoint();
    ~endpoint() noexcept {}

private:
    class protocol m_protocol;

    typedef sockaddr     sockaddr_base_type;
    typedef sockaddr_in  sockaddr_ip_v4_type;
    typedef sockaddr_in6 sockaddr_ip_v6_type;
    union sockaddr_union_type {
        sockaddr_base_type  m_base;
        sockaddr_ip_v4_type m_ip_v4;
        sockaddr_ip_v6_type m_ip_v6;
    };
    sockaddr_union_type m_sockaddr_union;

    friend class resolver;
    friend class socket_base;
    friend class socket;
    friend class acceptor;
};


/// \brief A list of IP endpoints.
class endpoint::list {
public:
    typedef const endpoint* iterator;

    iterator begin() const;
    iterator end() const;

    ~list() noexcept {}

private:
    Buffer<endpoint> m_endpoints;

    friend class resolver;
};


/// \brief TCP/IP networking service.
class io_service {
public:
    io_service();
    ~io_service() noexcept;

    /// \brief Execute the event loop.
    ///
    /// Execute completion handlers of completed asynchronous operations, or
    /// wait for more completion handlers to become ready for
    /// execution. Handlers submitted via post() are considered immeditely
    /// ready. If there are no completion handlers ready for execution, and
    /// there are no asynchronous operations in progress, run() returns.
    ///
    /// All completion handlers, including handlers submitted via post() will be
    /// executed from run(), that is by the thread that executes run(). If no
    /// thread executes run(), then the completion handlers will not be
    /// executed.
    ///
    /// Exceptions thrown by completion handlers will always propagate back
    /// through run().
    ///
    /// Syncronous operations (e.g., socket::connect()) executes independently
    /// of the event loop, and does not require that any thread calls run().
    void run();

    /// @{ \brief Stop event loop execution.
    ///
    /// stop() puts the event loop into the stopped mode. If a thread is currently
    /// executing run(), it will be made to return in a timely fashion, that is,
    /// without further blocking. If a thread is currently blocked in run(), it
    /// will be unblocked. Handlers that can be executed immediately, may, or
    /// may not be executed before run() returns, but new handlers submitted by
    /// these, will not be executed.
    ///
    /// The event loop will remain in the stopped mode until reset() is
    /// called. If reset() is called before run() returns, it may, or may not
    /// cause run() to continue normal operation without returning.
    ///
    /// Both stop() and reset() are thread-safe, that is, they may be called by
    /// any thread. Also, both of these function may be called from completion
    /// handlers (including posted handlers).
    void stop() noexcept;
    void reset() noexcept;
    /// @}

    /// \brief Submit a handler to the event loop.
    ///
    /// Register the sepcified completion handler for immediate asynchronous
    /// execution. The specified handler object will be copied as necessary, and
    /// will be executed by an expression on the form `handler()`.
    ///
    /// This function is thread-safe, that is, it may be called by any
    /// thread. It may also be called from other completion handlers.
    ///
    /// The handler will never be called as part of the execution of post(). It
    /// will always be called by a thread that is executing run(). If no thread
    /// is executing run(), the handler will not be executed. If post() is
    /// called while another thread is executing run(), the handler may be
    /// called before post() returns. If post() is called from another
    /// completion handler, the submitted handler is guaranteed to not be called
    /// during the execution of post().
    ///
    /// Completion handlers added through post() will be executed in the order
    /// that they are added. More precisely, if post() is called twice to add
    /// two handlers, A and B, and the execution of post(A) ands before the
    /// beginning of the execution of post(B), then A is guaranteed to execute
    /// before B.
    template<class H>
    void post(const H& handler);

private:
    class async_oper;
    class wait_oper_base;
    class post_oper_base;
    template<class H> class post_oper;
    class UnusedOper; // Allocated, but currently unused memory
    class oper_queue;

    struct OwnersOperDeleter {
        void operator()(async_oper*) const noexcept;
    };
    struct LendersOperDeleter {
        void operator()(async_oper*) const noexcept;
    };
    using OwnersOperPtr      = std::unique_ptr<async_oper, OwnersOperDeleter>;
    using LendersOperPtr     = std::unique_ptr<async_oper, LendersOperDeleter>;
    using LendersWaitOperPtr = std::unique_ptr<wait_oper_base, LendersOperDeleter>;

    template<class Oper, class... Args>
    static std::unique_ptr<Oper, LendersOperDeleter> alloc(OwnersOperPtr&, Args&&...);

    template<class Oper> static void execute(std::unique_ptr<Oper, LendersOperDeleter>&);

    enum io_op { io_op_Read, io_op_Write };
    void add_io_oper(int fd, LendersOperPtr, io_op type);
    void add_wait_oper(LendersWaitOperPtr);
    void add_completed_oper(LendersOperPtr) noexcept;

    using PostOperConstr = async_oper*(void* addr, size_t size, const void* cookie);
    void do_post(PostOperConstr, size_t size, const void* cookie);
    template<class H>
    static async_oper* post_oper_constr(void* addr, size_t size, const void* cookie);

    using clock = std::chrono::steady_clock;

    class impl;
    const std::unique_ptr<impl> m_impl;

    friend class socket_base;
    friend class socket;
    friend class acceptor;
    friend class buffered_input_stream;
    friend class deadline_timer;
};


class resolver {
public:
    class query;

    resolver(io_service&);
    ~resolver() noexcept {}

    io_service& service() noexcept;

    void resolve(const query&, endpoint::list&);
    std::error_code resolve(const query&, endpoint::list&, std::error_code&);

private:
    io_service& m_service;
};


class resolver::query {
public:
    enum {
        ///< Locally bound socket endpoint (server side)
        passive = AI_PASSIVE,

        ///< Ignore families without a configured non-loopback address
        address_configured = AI_ADDRCONFIG
    };

    query(std::string service, int flags = passive|address_configured);
    query(const protocol&, std::string service, int flags = passive|address_configured);
    query(std::string host, std::string service, int flags = address_configured);
    query(const protocol&, std::string host, std::string service, int flags = address_configured);

    ~query() noexcept;

    int flags() const;
    class protocol protocol() const;
    std::string host() const;
    std::string service() const;

private:
    int m_flags;
    class protocol m_protocol;
    std::string m_host;    // hostname
    std::string m_service; // port

    friend class resolver;
};


class socket_base {
public:
    ~socket_base() noexcept;

    io_service& service() noexcept;

    bool is_open() const noexcept;

    void open(const protocol&);
    std::error_code open(const protocol&, std::error_code&);

    /// \brief Close this socket.
    ///
    /// If the socket is open, it will be closed. If it is already closed (or
    /// never opened), this function does nothing (idempotency).
    ///
    /// A socket is automatically closed when destroyed.
    ///
    /// When the socket is closed, any incomplete asynchronous operation will be
    /// canceled (as if cancel() was called).
    void close() noexcept;

    /// \brief Cancel all asynchronous operations.
    ///
    /// Cause all incomplete asynchronous operations, that are associated with
    /// this socket, to fail with `error::operation_aborted`. An asynchronous
    /// operation is complete precisely when its completion handler starts
    /// executing.
    ///
    /// Completion handlers of canceled operations will become immediately ready
    /// to execute, but will never be executed directly as part of the execution
    /// of cancel().
    void cancel() noexcept;

    template<class O>
    void get_option(O& option) const;

    template<class O>
    std::error_code get_option(O& option, std::error_code&) const;

    template<class O>
    void set_option(const O& option);

    template<class O>
    std::error_code set_option(const O& option, std::error_code&);

    void bind(const endpoint&);
    std::error_code bind(const endpoint&, std::error_code&);

    endpoint local_endpoint() const;
    endpoint local_endpoint(std::error_code&) const;

private:
    enum opt_enum {
        opt_ReuseAddr ///< `SOL_SOCKET`, `SO_REUSEADDR`
    };

    template<class, int, class> class option;

public:
    typedef option<bool, opt_ReuseAddr, int> reuse_address;

private:
    int m_sock_fd;
    bool m_in_blocking_mode; // Not in nonblocking mode

protected:
    io_service& m_service;
    protocol m_protocol;
    io_service::OwnersOperPtr m_read_oper;  // Read or accept
    io_service::OwnersOperPtr m_write_oper; // Write or connect

    socket_base(io_service&);

    int get_sock_fd() noexcept;
    void do_close() noexcept;

    void get_option(opt_enum, void* value_data, size_t& value_size, std::error_code&) const;
    void set_option(opt_enum, const void* value_data, size_t value_size, std::error_code&);
    void map_option(opt_enum, int& level, int& option_name) const;

    // `ec` untouched on success
    std::error_code ensure_blocking_mode(std::error_code& ec) noexcept;
    std::error_code ensure_nonblocking_mode(std::error_code& ec) noexcept;

private:
    // `ec` untouched on success
    std::error_code set_nonblocking_mode(bool enable, std::error_code&) noexcept;

    friend class acceptor;
};


template<class T, int opt, class U>
class socket_base::option {
public:
    option(T value = T());
    T value() const;

private:
    T m_value;

    void get(const socket_base&, std::error_code&);
    void set(socket_base&, std::error_code&) const;

    friend class socket_base;
};


class socket: public socket_base {
public:
    socket(io_service&);
    ~socket() noexcept;

    void connect(const endpoint&);
    std::error_code connect(const endpoint&, std::error_code&);

    /// \brief Perform an asynchronous connect operation.
    ///
    /// Initiate an asynchronous connect operation. The completion handler is
    /// called when the operation completes. The operation completes when the
    /// connection is established, or an error occurs.
    ///
    /// The specified handler object will be copied as necessary, and will be
    /// executed by an expression on the form `handler(ec)` where `ec` is the
    /// error code.
    ///
    /// It is an error to start a new connect operation (synchronous or
    /// asynchronous) while an asynchronous connect operation is in progress. An
    /// asynchronous connect operation is considered complete as soon as the
    /// completion handler starts executing.
    ///
    /// The operation can be canceled by calling cancel(), and will be
    /// automatically canceled if the socket is closed. If the operation is
    /// canceled, it will fail with `error::operation_aborted`. The completion
    /// handler will always be called, as long as the event loop is running.
    ///
    /// \param ep The remote endpoint of the connection to be established.
    template<class H>
    void async_connect(const endpoint& ep, const H& handler);

    void write(const char* data, size_t size);
    std::error_code write(const char* data, size_t size, std::error_code&) noexcept;

    template<class H>
    void async_write(const char* data, size_t size, const H& handler);

    /// @{ \brief Read at least one byte from this socket.
    ///
    /// If \a size is greater than zero, block the calling thread until at least
    /// one byte becomes available, or an error occurs. In this context, end of
    /// input counts as an error (see `network::end_of_input`). If an error
    /// occurs, the two-argument version will throw `std::system_error`, while
    /// the three-argument version will set `ec` appropriately, and return
    /// zero. If no error occurs, or if \a size is zero, both versions will read
    /// as many available bytes as will fit into the specified buffer, and then
    /// return the number of bytes placed in the buffer. The three-argument
    /// version will also set `ec` to indicate success in this case.
    ///
    /// The two argument version always return a value greater than zero, and
    /// the three argument version returns a value greather than zero if, and
    /// only if `ec` is set to indicate success (no error, and no end of input).
    size_t read_some(char* buffer, size_t size);
    size_t read_some(char* buffer, size_t size, std::error_code& ec) noexcept;
    /// @}

    size_t write_some(const char* data, size_t size);
    size_t write_some(const char* data, size_t size, std::error_code&) noexcept;

private:
    class connect_oper_base;
    template<class H> class connect_oper;
    class write_oper_base;
    template<class H> class write_oper;

    using LendersConnectOperPtr =
        std::unique_ptr<connect_oper_base, io_service::LendersOperDeleter>;
    using LendersWriteOperPtr =
        std::unique_ptr<write_oper_base, io_service::LendersOperDeleter>;

    size_t do_read_some(char* buffer, size_t size, std::error_code& ec) noexcept;
    size_t do_write_some(const char* data, size_t size, std::error_code&) noexcept;

    void do_async_connect(LendersConnectOperPtr);
    // `ec` untouched on success, but no immediate completion
    bool initiate_async_connect(const endpoint&, std::error_code& ec) noexcept;
    // `ec` untouched on success
    std::error_code finalize_async_connect(std::error_code& ec) noexcept;
    void do_async_write(LendersWriteOperPtr);

    friend class buffered_input_stream;
};


class acceptor: public socket_base {
public:
    acceptor(io_service&);
    ~acceptor() noexcept;

    static const int max_connections = SOMAXCONN;

    void listen(int backlog = max_connections);
    std::error_code listen(int backlog, std::error_code&);

    void accept(socket&);
    void accept(socket&, endpoint&);
    std::error_code accept(socket&, std::error_code&);
    std::error_code accept(socket&, endpoint&, std::error_code&);

    /// @{ \brief Perform an asynchronous accept operation.
    ///
    /// Initiate an asynchronous accept operation. The completion handler will
    /// be called when the operation completes. The operation completes when the
    /// connection is accepted, or an error occurs. If the operation succeeds,
    /// the specified local socket will have become connected to a remote
    /// socket.
    ///
    /// The specified handler object will be copied as necessary, and will be
    /// executed by an expression on the form `handler(ec)` where `ec` is the
    /// error code.
    ///
    /// It is an error to start a new accept operation (synchronous or
    /// asynchronous) while an asynchronous accept operation is in progress. An
    /// asynchronous accept operation is considered complete as soon as the
    /// completion handler starts executing. This means that a new accept
    /// operation can be started from the completion handler.
    ///
    /// The operation can be canceled by calling cancel(), and will be
    /// automatically canceled if the acceptor is closed. If the operation is
    /// canceled, it will fail with `error::operation_aborted`. The completion
    /// handler will always be called, as long as the event loop is running.
    ///
    /// \param sock This is the local socket, that upon successful completion
    /// will have become connected to the remote socket. It must be in the
    /// closed state (socket::is_open()) when async_accept() is called.
    ///
    /// \param ep Upon completion, the remote peer endpoint will have been
    /// assigned to this variable.
    template<class H>
    void async_accept(socket& sock, const H& handler);

    template<class H>
    void async_accept(socket& sock, endpoint& ep, const H& handler);
    /// @}

private:
    std::error_code accept(socket&, endpoint*, std::error_code&);
    std::error_code do_accept(socket&, endpoint*, std::error_code&) noexcept;

    class accept_oper_base;
    template<class H> class accept_oper;

    using LendersAcceptOperPtr = std::unique_ptr<accept_oper_base, io_service::LendersOperDeleter>;

    template<class H>
    void async_accept(socket&, endpoint*, const H&);
    void do_async_accept(LendersAcceptOperPtr);
};


class buffered_input_stream {
public:
    buffered_input_stream(socket&);
    ~buffered_input_stream() noexcept;

    size_t read(char* buffer, size_t size);
    size_t read(char* buffer, size_t size, std::error_code&) noexcept;

    size_t read_until(char* buffer, size_t size, char delim);
    size_t read_until(char* buffer, size_t size, char delim,
                           std::error_code&) noexcept;

    /// @{ \brief Perform an asynchronous read operation.
    ///
    /// Initiate an asynchronous buffered read operation on the associated
    /// socket. The completion handler will be called when the operation
    /// completes.
    ///
    /// async_read() will continue reading until the specified buffer is full,
    /// or an error occurs. If the end of input is reached before the buffer is
    /// filled, the operation fails with `network::end_of_input`.
    ///
    /// async_read_until() will continue reading until the specified buffer
    /// contains the specified delimiter, or an error occurs. If the buffer is
    /// filled before a delimiter is found, the operation fails with
    /// `network::delim_not_found`. Otherwise, if the end of input is reached
    /// before a delimiter is found, the operation fails with
    /// `network::end_of_input`. Otherwise, if the operation succeeds, the last
    /// byte placed in the buffer is the delimiter.
    ///
    /// The specified handler object will be copied as necessary, and will be
    /// executed by an expression on the form `handler(ec, n)` where `ec` is the
    /// error code, and `n` is the number of bytes placed in the buffer. `n` is
    /// guaranteed to be less than, or equal to \a size.
    ///
    /// It is an error to start a new read operation (synchronous or
    /// asynchronous) while an asynchronous read operation is in progress. An
    /// asynchronous read operation is considered complete as soon as the
    /// completion handler starts executing. This means that a new read
    /// operation can be started from the completion handler.
    ///
    /// The operation can be canceled by calling socket::cancel(), and will be
    /// automatically canceled if the associated socket is closed. If the
    /// operation is canceled, it will fail with `error::operation_aborted`. The
    /// completion handler will always be called, as long as the event loop is
    /// running.
    ///
    /// When an asynchronous operation is started, the caller must ensure that
    /// one (or both) of the following events occur before the destruction of
    /// the stream object:
    ///
    ///  - The completion handler is called (entry into the completion handler).
    ///
    ///  - The asynchronous operation is canceled (the socket is closed).
    template<class H>
    void async_read(char* buffer, size_t size, const H& handler);

    template<class H>
    void async_read_until(char* buffer, size_t size, char delim, const H& handler);
    /// @}

private:
    class read_oper_base;
    template<class H> class read_oper;

    using LendersReadOperPtr = std::unique_ptr<read_oper_base, io_service::LendersOperDeleter>;

    socket& m_socket;
    static const size_t s_buffer_size = 1024;
    std::unique_ptr<char[]> m_buffer;
    char* m_begin;
    char* m_end;

    size_t do_read(char* buffer, size_t size, int delim, std::error_code&) noexcept;

    template<class H>
    void async_read(char* buffer, size_t size, int delim, const H& handler);
    void do_async_read(LendersReadOperPtr);
};


/// \brief A timer object supporting asynchronous wait operations.
class deadline_timer {
public:
    deadline_timer(io_service&);
    ~deadline_timer() noexcept;

    io_service& service() noexcept;

    /// \brief Perform an asynchronous wait operation.
    ///
    /// Initiate an asynchronous wait operation. The completion handler becomes
    /// ready to execute when the expiration time is reached, or an error occurs
    /// (cancellation counts as an error here). The completion handler will
    /// **always** be executed, as long as a thread is executing the event
    /// loop. The error code passed to the complition handler will **never**
    /// indicate success, unless the expiration time was reached. The completion
    /// handler will never be called directly as part of the execution of
    /// async_wait().
    ///
    /// An asynchronous wait operation in progress can be canceled by calling
    /// cancel(), and will be automatically canceled if the deadline timer is
    /// destroyed. If the operation is canceled, its completion handler will be
    /// called with `error::operation_aborted`.
    ///
    /// The specified handler object will be copied as necessary, and will be
    /// executed by an expression on the form `handler(ec)` where `ec` is the
    /// error code.
    ///
    /// It is an error to start a new asynchronous wait operation while an
    /// another one is in progress. An asynchronous wait operation is in
    /// progress until its completion handler starts executing.
    ///
    /// \param ep The remote endpoint of the connection to be established.
    template<class R, class P, class H>
    void async_wait(std::chrono::duration<R,P> delay, const H& handler) noexcept;

    /// \brief Cancel an asynchronous wait operation.
    ///
    /// If an asynchronous wait operation, that is associated with this deadline
    /// timer, is in progress, cause it to fail with
    /// `error::operation_aborted`. An asynchronous wait operation is in
    /// progress until its completion handler starts executing.
    ///
    /// Completion handlers of canceled operations will become immediately ready
    /// to execute, but will never be executed directly as part of the execution
    /// of cancel().
    void cancel() noexcept;

private:
    template<class H> class wait_oper;

    using clock = io_service::clock;

    io_service& m_service;
    io_service::OwnersOperPtr m_wait_oper;
};


enum errors {
    /// End of input.
    end_of_input = 1,

    /// Delimiter not found.
    delim_not_found,

    /// Host not found (authoritative).
    host_not_found,

    /// Host not found (non-authoritative).
    host_not_found_try_again,

    /// The query is valid but does not have associated address data.
    no_data,

    /// A non-recoverable error occurred.
    no_recovery,

    /// The service is not supported for the given socket type.
    service_not_found,

    /// The socket type is not supported.
    socket_type_not_supported
};

std::error_code make_error_code(errors);

} // namespace network
} // namespace util
} // namespace realm

namespace std {

template<>
struct is_error_code_enum<realm::util::network::errors>
{
public:
    static const bool value = true;
};

} // namespace std

namespace realm {
namespace util {
namespace network {





// Implementation

// ---------------- protocol ----------------

inline protocol protocol::ip_v4()
{
    protocol prot;
    prot.m_family = AF_INET;
    return prot;
}

inline protocol protocol::ip_v6()
{
    protocol prot;
    prot.m_family = AF_INET6;
    return prot;
}

inline bool protocol::is_ip_v4() const
{
    return m_family == AF_INET;
}

inline bool protocol::is_ip_v6() const
{
    return m_family == AF_INET6;
}

inline protocol::protocol():
    m_family(AF_UNSPEC),     // Allow both IPv4 and IPv6
    m_socktype(SOCK_STREAM), // Or SOCK_DGRAM for UDP
    m_protocol(0)            // Any protocol
{
}

// ---------------- address ----------------

inline bool address::is_ip_v4() const
{
    return !m_is_ip_v6;
}

inline bool address::is_ip_v6() const
{
    return m_is_ip_v6;
}

template<class C, class T>
inline std::basic_ostream<C,T>& operator<<(std::basic_ostream<C,T>& out, const address& addr)
{
    union buffer_union {
        char ip_v4[INET_ADDRSTRLEN];
        char ip_v6[INET6_ADDRSTRLEN];
    };
    char buffer[sizeof (buffer_union)];
    int af = addr.m_is_ip_v6 ? AF_INET6 : AF_INET;
    const char* ret = inet_ntop(af, &addr.m_union, buffer, sizeof buffer);
    if (ret == 0) {
        std::error_code ec = make_basic_system_error_code(errno);
        throw std::system_error(ec);
    }
    out << ret;
    return out;
}

inline address::address():
    m_is_ip_v6(false)
{
    m_union.m_ip_v4 = ip_v4_type();
}

// ---------------- endpoint ----------------

inline protocol endpoint::protocol() const
{
    return m_protocol;
}

inline address endpoint::address() const
{
    class address addr;
    if (m_protocol.is_ip_v4()) {
        addr.m_union.m_ip_v4 = m_sockaddr_union.m_ip_v4.sin_addr;
    }
    else {
        addr.m_union.m_ip_v6 = m_sockaddr_union.m_ip_v6.sin6_addr;
        addr.m_is_ip_v6 = true;
    }
    return addr;
}

inline endpoint::port_type endpoint::port() const
{
    return ntohs(m_protocol.is_ip_v4() ? m_sockaddr_union.m_ip_v4.sin_port :
                 m_sockaddr_union.m_ip_v6.sin6_port);
}

inline endpoint::endpoint():
    m_protocol(protocol::ip_v4())
{
    m_sockaddr_union.m_ip_v4 = sockaddr_ip_v4_type();
}

inline endpoint::list::iterator endpoint::list::begin() const
{
    return m_endpoints.data();
}

inline endpoint::list::iterator endpoint::list::end() const
{
    return m_endpoints.data() + m_endpoints.size();
}

// ---------------- io_service ----------------

class io_service::async_oper {
public:
    bool in_use() const noexcept;
    bool is_complete() const noexcept;
    bool is_uncanceled() const noexcept;
    void cancel() noexcept;
    virtual void proceed() noexcept = 0;
    /// Every object of type \ref async_oper must be desroyed either by a call
    /// to this function or to recycle(). This function recycles the operation
    /// object (commits suicide), even if it throws.
    virtual void recycle_and_execute() = 0;
    /// Every object of type \ref async_oper must be destroyed either by a call
    /// to recycle_and_execute() or to this function. This function destroys the
    /// object (commits suicide).
    virtual void recycle() noexcept = 0;
    /// Must be called when the owner dies, and the object is in use (not an
    /// instance of UnusedOper).
    virtual void orphan()  noexcept = 0;
protected:
    async_oper(size_t size, bool in_use) noexcept;
    virtual ~async_oper() noexcept {}
    bool is_canceled() const noexcept;
    void set_is_complete(bool value) noexcept;
    template<class H, class... Args>
    void do_recycle_and_execute(bool orphaned, H& handler, Args&&...);
    void do_recycle(bool orphaned) noexcept;
private:
    size_t m_size; // Allocated number of bytes
    bool m_in_use   = false;
    bool m_complete = false;      // Always false when not in use
    bool m_canceled = false;      // Always false when not in use
    async_oper* m_next = nullptr; // Always null when not in use
    friend class io_service;
};

class io_service::wait_oper_base:
        public async_oper {
public:
    wait_oper_base(size_t size, deadline_timer& timer, clock::time_point expiration_time):
        async_oper(size, true), // Second argument is `in_use`
        m_timer(&timer),
        m_expiration_time(expiration_time)
    {
    }
    void proceed() noexcept override
    {
        REALM_ASSERT(false); // Never called
    }
    void recycle() noexcept override
    {
        bool orphaned = !m_timer;
        // Note: do_recycle() commits suicide.
        do_recycle(orphaned);
    }
    void orphan() noexcept override
    {
        m_timer = 0;
    }
protected:
    deadline_timer* m_timer;
    clock::time_point m_expiration_time;
    friend class io_service;
};

class io_service::post_oper_base:
        public async_oper {
public:
    post_oper_base(size_t size):
        async_oper(size, true) // Second argument is `in_use`
    {
    }
    void proceed() noexcept override
    {
        REALM_ASSERT(false); // Never called
    }
    void recycle() noexcept override
    {
        bool orphaned = m_orphaned;
        // Note: do_recycle() commits suicide.
        do_recycle(orphaned);
    }
    void orphan() noexcept override
    {
        m_orphaned = true;
    }
protected:
    bool m_orphaned = false;
};

template<class H>
class io_service::post_oper:
        public post_oper_base {
public:
    post_oper(size_t size, const H& handler):
        post_oper_base(size),
        m_handler(handler)
    {
    }
    void recycle_and_execute() override
    {
        bool orphaned = m_orphaned;
        // Note: do_recycle_and_execute() commits suicide.
        do_recycle_and_execute(orphaned, m_handler); // Throws
    }
private:
    const H m_handler;
};

class io_service::UnusedOper:
        public async_oper {
public:
    UnusedOper(size_t size) noexcept:
        async_oper(size, false) // Second argument is `in_use`
    {
    }
    void proceed() noexcept override
    {
        REALM_ASSERT(false); // Never called
    }
    void recycle_and_execute() override
    {
        // Must never be called
        REALM_ASSERT(false);
    }
    void recycle() noexcept override
    {
        // Must never be called
        REALM_ASSERT(false);
    }
    void orphan() noexcept override
    {
        // Must never be called
        REALM_ASSERT(false);
    }
};

template<class H> inline void io_service::post(const H& handler)
{
    do_post(&io_service::post_oper_constr<H>, sizeof (post_oper<H>), &handler);
}

inline void io_service::OwnersOperDeleter::operator()(async_oper* op) const noexcept
{
    if (op->in_use()) {
        op->orphan();
    }
    else {
        void* addr = op;
        op->~async_oper();
        delete[] static_cast<char*>(addr);
    }
}

inline void io_service::LendersOperDeleter::operator()(async_oper* op) const noexcept
{
    op->recycle(); // Suicide
}

template<class Oper, class... Args> std::unique_ptr<Oper, io_service::LendersOperDeleter>
io_service::alloc(OwnersOperPtr& owners_ptr, Args&&... args)
{
    void* addr = owners_ptr.get();
    size_t size;
    if (REALM_LIKELY(addr)) {
        REALM_ASSERT(!owners_ptr->in_use());
        size = owners_ptr->m_size;
        // We can use static dispatch in the destructor call here, since an
        // object, that is not in use, is always an instance of UnusedOper.
        REALM_ASSERT(dynamic_cast<UnusedOper*>(owners_ptr.get()));
        static_cast<UnusedOper*>(owners_ptr.get())->UnusedOper::~UnusedOper();
        if (REALM_UNLIKELY(size < sizeof (Oper))) {
            owners_ptr.release();
            delete[] static_cast<char*>(addr);
            goto no_object;
        }
    }
    else {
      no_object:
        addr = new char[sizeof (Oper)]; // Throws
        size = sizeof (Oper);
        owners_ptr.reset(static_cast<async_oper*>(addr));
    }
    std::unique_ptr<Oper, LendersOperDeleter> lenders_ptr;
    try {
        lenders_ptr.reset(new (addr) Oper(size, std::forward<Args>(args)...)); // Throws
    }
    catch (...) {
        new (addr) UnusedOper(size); // Does not throw
        throw;
    }
    return lenders_ptr;
}

template<class Oper>
inline void io_service::execute(std::unique_ptr<Oper, LendersOperDeleter>& lenders_ptr)
{
    lenders_ptr.release()->recycle_and_execute(); // Throws
}

template<class H> inline io_service::async_oper*
io_service::post_oper_constr(void* addr, size_t size, const void* cookie)
{
    const H& handler = *static_cast<const H*>(cookie);
    return new (addr) post_oper<H>(size, handler); // Throws
}

inline bool io_service::async_oper::in_use() const noexcept
{
    return m_in_use != 0;
}

inline bool io_service::async_oper::is_complete() const noexcept
{
    return m_complete;
}

inline bool io_service::async_oper::is_uncanceled() const noexcept
{
    return m_in_use && !m_canceled;
}

inline void io_service::async_oper::cancel() noexcept
{
    REALM_ASSERT(m_in_use);
    REALM_ASSERT(!m_canceled);
    m_canceled = true;
}

inline io_service::async_oper::async_oper(size_t size, bool in_use) noexcept:
    m_size(size),
    m_in_use(in_use)
{
}

inline bool io_service::async_oper::is_canceled() const noexcept
{
    return m_canceled;
}

inline void io_service::async_oper::set_is_complete(bool value) noexcept
{
    REALM_ASSERT(!m_complete);
    if (value)
        REALM_ASSERT(m_in_use);
    m_complete = value;
}

template<class H, class... Args>
inline void io_service::async_oper::do_recycle_and_execute(bool orphaned, H& handler,
                                                           Args&&... args)
{
    // Recycle the operation object before the handler is exceuted, such that it
    // is available for reuse during the execution of the handler.
    bool was_recycled = false;
    try {
        H handler_2 = std::move(handler); // Throws
        // The caller (various subclasses of `async_oper`) must not pass any
        // arguments to the completion handler by reference if they refer to
        // this operation object, or parts of it. Due to the recycling of the
        // operation object (`do_recycle()`), such references would become
        // dangling before the invocation of the completion handler. Due to
        // `std::decay`, the following tuple will introduce a copy of all
        // nonconst lvalue reference arguments, preventing such references from
        // being passed through.
        std::tuple<typename std::decay<Args>::type...> copy_of_args(args...);
        do_recycle(orphaned);
        was_recycled = true;
        util::call_with_tuple(handler_2, std::move(copy_of_args)); // Throws
    }
    catch (...) {
        if (!was_recycled)
            do_recycle(orphaned);
        throw;
    }
}

inline void io_service::async_oper::do_recycle(bool orphaned) noexcept
{
    REALM_ASSERT(in_use());
    void* addr = this;
    size_t size = m_size;
    this->~async_oper(); // Suicide
    if (orphaned) {
        delete[] static_cast<char*>(addr);
    }
    else {
        new (addr) UnusedOper(size);
    }
}

// ---------------- resolver ----------------

inline resolver::resolver(io_service& serv):
    m_service(serv)
{
}

inline io_service& resolver::service() noexcept
{
    return m_service;
}

inline void resolver::resolve(const query& q, endpoint::list& l)
{
    std::error_code ec;
    if (resolve(q, l, ec))
        throw std::system_error(ec);
}

inline resolver::query::query(std::string service, int flags):
    m_flags(flags),
    m_service(service)
{
}

inline resolver::query::query(const class protocol& prot, std::string service, int flags):
    m_flags(flags),
    m_protocol(prot),
    m_service(service)
{
}

inline resolver::query::query(std::string host, std::string service, int flags):
    m_flags(flags),
    m_host(host),
    m_service(service)
{
}

inline resolver::query::query(const class protocol& prot, std::string host, std::string service,
                              int flags):
    m_flags(flags),
    m_protocol(prot),
    m_host(host),
    m_service(service)
{
}

inline resolver::query::~query() noexcept
{
}

inline int resolver::query::flags() const
{
    return m_flags;
}

inline class protocol resolver::query::protocol() const
{
    return m_protocol;
}

inline std::string resolver::query::host() const
{
    return m_host;
}

inline std::string resolver::query::service() const
{
    return m_service;
}

// ---------------- socket_base ----------------

inline socket_base::socket_base(io_service& service):
    m_sock_fd(-1),
    m_service(service)
{
}

inline socket_base::~socket_base() noexcept
{
    close();
}

inline io_service& socket_base::service() noexcept
{
    return m_service;
}

inline bool socket_base::is_open() const noexcept
{
    return m_sock_fd != -1;
}

inline void socket_base::open(const protocol& prot)
{
    std::error_code ec;
    if (open(prot, ec))
        throw std::system_error(ec);
}

inline void socket_base::close() noexcept
{
    if (!is_open())
        return;
    cancel();
    do_close();
}

template<class O>
inline void socket_base::get_option(O& option) const
{
    std::error_code ec;
    if (get_option(option, ec))
        throw std::system_error(ec);
}

template<class O>
inline std::error_code socket_base::get_option(O& option, std::error_code& ec) const
{
    option.get(*this, ec);
    return ec;
}

template<class O>
inline void socket_base::set_option(const O& option)
{
    std::error_code ec;
    if (set_option(option, ec))
        throw std::system_error(ec);
}

template<class O>
inline std::error_code socket_base::set_option(const O& option, std::error_code& ec)
{
    option.set(*this, ec);
    return ec;
}

inline void socket_base::bind(const endpoint& ep)
{
    std::error_code ec;
    if (bind(ep, ec))
        throw std::system_error(ec);
}

inline endpoint socket_base::local_endpoint() const
{
    std::error_code ec;
    endpoint ep = local_endpoint(ec);
    if (ec)
        throw std::system_error(ec);
    return ep;
}

inline int socket_base::get_sock_fd() noexcept
{
    return m_sock_fd;
}

inline std::error_code socket_base::ensure_blocking_mode(std::error_code& ec) noexcept
{
    // Assuming that sockets are either used mostly in blocking mode, or mostly
    // in nonblocking mode.
    if (REALM_UNLIKELY(!m_in_blocking_mode)) {
        bool enable = false;
        if (set_nonblocking_mode(enable, ec))
            return ec;
        m_in_blocking_mode = true;
    }
    return std::error_code(); // Success
}

inline std::error_code socket_base::ensure_nonblocking_mode(std::error_code& ec) noexcept
{
    // Assuming that sockets are either used mostly in blocking mode, or mostly
    // in nonblocking mode.
    if (REALM_UNLIKELY(m_in_blocking_mode)) {
        bool enable = true;
        if (set_nonblocking_mode(enable, ec))
            return ec;
        m_in_blocking_mode = false;
    }
    return std::error_code(); // Success
}

template<class T, int opt, class U>
inline socket_base::option<T, opt, U>::option(T value):
    m_value(value)
{
}

template<class T, int opt, class U>
inline T socket_base::option<T, opt, U>::value() const
{
    return m_value;
}

template<class T, int opt, class U>
inline void socket_base::option<T, opt, U>::get(const socket_base& sock, std::error_code& ec)
{
    union {
        U value;
        char strut[sizeof (U) + 1];
    };
    size_t value_size = sizeof strut;
    sock.get_option(opt_enum(opt), &value, value_size, ec);
    if (!ec) {
        REALM_ASSERT(value_size == sizeof value);
        m_value = T(value);
    }
}

template<class T, int opt, class U>
inline void socket_base::option<T, opt, U>::set(socket_base& sock, std::error_code& ec) const
{
    U value = U(m_value);
    sock.set_option(opt_enum(opt), &value, sizeof value, ec);
}

// ---------------- socket ----------------

class socket::connect_oper_base:
        public io_service::async_oper {
public:
    connect_oper_base(size_t size, socket& sock, const endpoint& ep):
        async_oper(size, true), // Second argument is `in_use`
        m_socket(&sock)
    {
        if (m_socket->initiate_async_connect(ep, m_error_code))
            set_is_complete(true); // Failure, or immediate completion
    }
    void proceed() noexcept override
    {
        REALM_ASSERT(!is_complete());
        REALM_ASSERT(!is_canceled());
        REALM_ASSERT(!m_error_code);
        m_socket->finalize_async_connect(m_error_code);
        set_is_complete(true);
    }
    void recycle() noexcept override
    {
        bool orphaned = !m_socket;
        // Note: do_recycle() commits suicide.
        do_recycle(orphaned);
    }
    void orphan() noexcept override
    {
        m_socket = 0;
    }
protected:
    socket* m_socket;
    std::error_code m_error_code;
};

template<class H>
class socket::connect_oper:
        public connect_oper_base {
public:
    connect_oper(size_t size, socket& sock, const endpoint& ep, const H& handler):
        connect_oper_base(size, sock, ep),
        m_handler(handler)
    {
    }
    void recycle_and_execute() override
    {
        REALM_ASSERT(is_complete() || is_canceled());
        bool orphaned = !m_socket;
        std::error_code ec = m_error_code;
        if (is_canceled())
            ec = error::operation_aborted;
        // Note: do_recycle_and_execute() commits suicide.
        do_recycle_and_execute(orphaned, m_handler, ec); // Throws
    }
private:
    const H m_handler;
};

class socket::write_oper_base:
        public io_service::async_oper {
public:
    write_oper_base(size_t size_1, socket& sock, const char* data, size_t size_2):
        async_oper(size_1, true), // Second argument is `in_use`
        m_socket(&sock),
        m_begin(data),
        m_end(data + size_2),
        m_curr(data)
    {
    }
    void initiate() noexcept
    {
        REALM_ASSERT(!is_complete());
        if (m_socket->ensure_nonblocking_mode(m_error_code))
            set_is_complete(true); // Failure
    }
    void proceed() noexcept override
    {
        REALM_ASSERT(!is_complete());
        REALM_ASSERT(!is_canceled());
        REALM_ASSERT(!m_error_code);
        REALM_ASSERT(m_curr <= m_end);
        size_t n_1 = size_t(m_end - m_curr);
        size_t n_2 = m_socket->do_write_some(m_curr, n_1, m_error_code);
        REALM_ASSERT(n_2 <= n_1);
        m_curr += n_2;
        set_is_complete(m_error_code || m_curr == m_end);
    }
    void recycle() noexcept override
    {
        bool orphaned = !m_socket;
        // Note: do_recycle() commits suicide.
        do_recycle(orphaned);
    }
    void orphan() noexcept override
    {
        m_socket = 0;
    }
protected:
    socket* m_socket;
    const char* const m_begin;
    const char* const m_end;
    const char* m_curr;
    std::error_code m_error_code;
};

template<class H>
class socket::write_oper:
        public write_oper_base {
public:
    write_oper(size_t size_1, socket& sock, const char* data, size_t size_2, const H& handler):
        write_oper_base(size_1, sock, data, size_2),
        m_handler(handler)
    {
    }
    void recycle_and_execute() override
    {
        REALM_ASSERT(is_complete() || is_canceled());
        REALM_ASSERT(is_complete() == (m_error_code || m_curr == m_end));
        REALM_ASSERT(m_curr >= m_begin);
        bool orphaned = !m_socket;
        std::error_code ec = m_error_code;
        if (is_canceled())
            ec = error::operation_aborted;
        size_t num_bytes_transferred = size_t(m_curr - m_begin);
        // Note: do_recycle_and_execute() commits suicide.
        do_recycle_and_execute(orphaned, m_handler, ec, num_bytes_transferred); // Throws
    }
private:
    const H m_handler;
};

inline socket::socket(io_service& service):
    socket_base(service)
{
}

inline socket::~socket() noexcept
{
}

inline void socket::connect(const endpoint& ep)
{
    std::error_code ec;
    if (connect(ep, ec))
        throw std::system_error(ec);
}

template<class H>
inline void socket::async_connect(const endpoint& ep, const H& handler)
{
    LendersConnectOperPtr op =
        io_service::alloc<connect_oper<H>>(m_write_oper, *this, ep, handler); // Throws
    do_async_connect(std::move(op)); // Throws
}

inline void socket::write(const char* data, size_t size)
{
    std::error_code ec;
    if (write(data, size, ec))
        throw std::system_error(ec);
}

template<class H>
inline void socket::async_write(const char* data, size_t size, const H& handler)
{
    LendersWriteOperPtr op =
        io_service::alloc<write_oper<H>>(m_write_oper, *this, data, size, handler); // Throws
    do_async_write(std::move(op)); // Throws
}

inline size_t socket::read_some(char* buffer, size_t size)
{
    std::error_code ec;
    size_t n = read_some(buffer, size, ec);
    if (ec)
        throw std::system_error(ec);
    return n;
}

inline size_t socket::read_some(char* buffer, size_t size, std::error_code& ec) noexcept
{
    if (ensure_blocking_mode(ec))
        return 0;
    return do_read_some(buffer, size, ec);
}

inline size_t socket::write_some(const char* data, size_t size)
{
    std::error_code ec;
    size_t n = write_some(data, size, ec);
    if (ec)
        throw std::system_error(ec);
    return n;
}

inline size_t socket::write_some(const char* data, size_t size, std::error_code& ec) noexcept
{
    if (ensure_blocking_mode(ec))
        return 0;
    return do_write_some(data, size, ec);
}

inline void socket::do_async_connect(LendersConnectOperPtr op)
{
    if (op->is_complete()) {
        m_service.add_completed_oper(std::move(op));
    }
    else {
        m_service.add_io_oper(get_sock_fd(), std::move(op), io_service::io_op_Write); // Throws
    }
}

inline void socket::do_async_write(LendersWriteOperPtr op)
{
    op->initiate();
    if (op->is_complete()) {
        m_service.add_completed_oper(std::move(op));
    }
    else {
        m_service.add_io_oper(get_sock_fd(), std::move(op), io_service::io_op_Write); // Throws
    }
}

// ---------------- acceptor ----------------

class acceptor::accept_oper_base:
        public io_service::async_oper {
public:
    accept_oper_base(size_t size, acceptor& a, socket& s, endpoint* e):
        async_oper(size, true), // Second argument is `in_use`
        m_acceptor(&a),
        m_socket(s),
        m_endpoint(e)
    {
    }
    void initiate() noexcept
    {
        REALM_ASSERT(!is_complete());
        if (m_acceptor->ensure_nonblocking_mode(m_error_code))
            set_is_complete(true); // Failure
    }
    void proceed() noexcept override
    {
        REALM_ASSERT(!is_complete());
        REALM_ASSERT(!is_canceled());
        REALM_ASSERT(!m_error_code);
        REALM_ASSERT(!m_socket.is_open());
        m_acceptor->do_accept(m_socket, m_endpoint, m_error_code);
        set_is_complete(true);
    }
    void recycle() noexcept override
    {
        bool orphaned = !m_acceptor;
        // Note: do_recycle() commits suicide.
        do_recycle(orphaned);
    }
    void orphan() noexcept override
    {
        m_acceptor = 0;
    }
protected:
    acceptor* m_acceptor;
    socket& m_socket;
    endpoint* const m_endpoint;
    std::error_code m_error_code;
};

template<class H>
class acceptor::accept_oper:
        public accept_oper_base {
public:
    accept_oper(size_t size, acceptor& a, socket& s, endpoint* e, const H& handler):
        accept_oper_base(size, a, s, e),
        m_handler(handler)
    {
    }
    void recycle_and_execute() override
    {
        REALM_ASSERT(is_complete() || is_canceled());
        REALM_ASSERT(is_complete() == (m_socket.is_open() || m_error_code));
        bool orphaned = !m_acceptor;
        std::error_code ec = m_error_code;
        if (is_canceled())
            ec = error::operation_aborted;
        // Note: do_recycle_and_execute() commits suicide.
        do_recycle_and_execute(orphaned, m_handler, ec); // Throws
    }
private:
    const H m_handler;
};

inline acceptor::acceptor(io_service& service):
    socket_base(service)
{
}

inline acceptor::~acceptor() noexcept
{
}

inline void acceptor::listen(int backlog)
{
    std::error_code ec;
    if (listen(backlog, ec))
        throw std::system_error(ec);
}

inline void acceptor::accept(socket& sock)
{
    std::error_code ec;
    if (accept(sock, ec)) // Throws
        throw std::system_error(ec);
}

inline void acceptor::accept(socket& sock, endpoint& ep)
{
    std::error_code ec;
    if (accept(sock, ep, ec)) // Throws
        throw std::system_error(ec);
}

inline std::error_code acceptor::accept(socket& sock, std::error_code& ec)
{
    endpoint* ep = nullptr;
    return accept(sock, ep, ec); // Throws
}

inline std::error_code acceptor::accept(socket& sock, endpoint& ep, std::error_code& ec)
{
    return accept(sock, &ep, ec); // Throws
}

template<class H>
inline void acceptor::async_accept(socket& sock, const H& handler)
{
    endpoint* ep = nullptr;
    async_accept(sock, ep, handler); // Throws
}

template<class H>
inline void acceptor::async_accept(socket& sock, endpoint& ep, const H& handler)
{
    async_accept(sock, &ep, handler); // Throws
}

inline std::error_code acceptor::accept(socket& sock, endpoint* ep, std::error_code& ec)
{
    REALM_ASSERT(!m_read_oper || !m_read_oper->in_use());
    if (REALM_UNLIKELY(sock.is_open()))
        throw std::runtime_error("Socket is already open");
    if (ensure_blocking_mode(ec))
        return ec;
    return do_accept(sock, ep, ec);
}

template<class H>
inline void acceptor::async_accept(socket& sock, endpoint* ep, const H& handler)
{
    if (REALM_UNLIKELY(sock.is_open()))
        throw std::runtime_error("Socket is already open");
    LendersAcceptOperPtr op =
        io_service::alloc<accept_oper<H>>(m_read_oper, *this, sock, ep, handler); // Throws
    do_async_accept(std::move(op)); // Throws
}

inline void acceptor::do_async_accept(LendersAcceptOperPtr op)
{
    op->initiate();
    if (op->is_complete()) {
        m_service.add_completed_oper(std::move(op));
    }
    else {
        m_service.add_io_oper(get_sock_fd(), std::move(op), io_service::io_op_Read); // Throws
    }
}

// ---------------- buffered_input_stream ----------------

class buffered_input_stream::read_oper_base:
        public io_service::async_oper {
public:
    read_oper_base(size_t size_1, buffered_input_stream& s, char* buffer, size_t size_2,
                   int delim):
        async_oper(size_1, true), // Second argument is `in_use`
        m_stream(&s),
        m_out_begin(buffer),
        m_out_end(buffer + size_2),
        m_out_curr(buffer),
        m_delim(delim)
    {
    }
    void initiate() noexcept
    {
        REALM_ASSERT(!is_complete());
        process_buffered_input();
        if (!is_complete()) {
            if (m_stream->m_socket.ensure_nonblocking_mode(m_error_code))
                set_is_complete(true); // Failure
        }
    }
    void process_buffered_input() noexcept;
    void proceed() noexcept override;
    void recycle() noexcept override
    {
        bool orphaned = !m_stream;
        // Note: do_recycle() commits suicide.
        do_recycle(orphaned);
    }
    void orphan() noexcept override
    {
        m_stream = 0;
    }
protected:
    buffered_input_stream* m_stream;
    char* const m_out_begin;
    char* const m_out_end;
    char* m_out_curr;
    const int m_delim;
    std::error_code m_error_code;
};

template<class H>
class buffered_input_stream::read_oper:
        public read_oper_base {
public:
    read_oper(size_t size_1, buffered_input_stream& stream, char* buffer, size_t size_2, int delim,
              const H& h):
        read_oper_base(size_1, stream, buffer, size_2, delim),
        m_handler(h)
    {
    }
    void recycle_and_execute() override
    {
        REALM_ASSERT(is_complete() || is_canceled());
        REALM_ASSERT(is_complete() ==
                     (m_error_code || (m_delim != std::char_traits<char>::eof() ?
                                       m_out_curr > m_out_begin && m_out_curr[-1] ==
                                       std::char_traits<char>::to_char_type(m_delim) :
                                       m_out_curr == m_out_end)));
        REALM_ASSERT(m_out_curr >= m_out_begin);
        bool orphaned = !m_stream;
        std::error_code ec = m_error_code;
        if (is_canceled())
            ec = error::operation_aborted;
        size_t num_bytes_transferred = size_t(m_out_curr - m_out_begin);
        // Note: do_recycle_and_execute() commits suicide.
        do_recycle_and_execute(orphaned, m_handler, ec, num_bytes_transferred); // Throws
    }
private:
    const H m_handler;
};

inline buffered_input_stream::buffered_input_stream(socket& sock):
    m_socket(sock),
    m_buffer(new char[s_buffer_size]), // Throws
    m_begin(m_buffer.get()),
    m_end(m_buffer.get())
{
}

inline buffered_input_stream::~buffered_input_stream() noexcept
{
}

inline size_t buffered_input_stream::read(char* buffer, size_t size)
{
    std::error_code ec;
    size_t n = read(buffer, size, ec);
    if (ec)
        throw std::system_error(ec);
    return n;
}

inline size_t buffered_input_stream::read(char* buffer, size_t size, std::error_code& ec) noexcept
{
    return do_read(buffer, size, std::char_traits<char>::eof(), ec);
}

inline size_t buffered_input_stream::read_until(char* buffer, size_t size, char delim)
{
    std::error_code ec;
    size_t n = read_until(buffer, size, delim, ec);
    if (ec)
        throw std::system_error(ec);
    return n;
}

inline size_t buffered_input_stream::read_until(char* buffer, size_t size, char delim,
                                                std::error_code& ec) noexcept
{
    return do_read(buffer, size, std::char_traits<char>::to_int_type(delim), ec);
}

template<class H>
inline void buffered_input_stream::async_read(char* buffer, size_t size, const H& handler)
{
    async_read(buffer, size, std::char_traits<char>::eof(), handler);
}

template<class H>
inline void buffered_input_stream::async_read_until(char* buffer, size_t size, char delim,
                                                    const H& handler)
{
    async_read(buffer, size, std::char_traits<char>::to_int_type(delim), handler);
}

template<class H>
inline void buffered_input_stream::async_read(char* buffer, size_t size, int delim,
                                              const H& handler)
{
    LendersReadOperPtr op =
        io_service::alloc<read_oper<H>>(m_socket.m_read_oper, *this, buffer, size, delim,
                                       handler); // Throws
    do_async_read(std::move(op)); // Throws
}

inline void buffered_input_stream::do_async_read(LendersReadOperPtr op)
{
    op->initiate();
    if (op->is_complete()) {
        m_socket.m_service.add_completed_oper(std::move(op));
    }
    else {
        m_socket.m_service.add_io_oper(m_socket.get_sock_fd(), std::move(op),
                                       io_service::io_op_Read); // Throws
    }
}

// ---------------- deadline_timer ----------------

template<class H>
class deadline_timer::wait_oper:
        public io_service::wait_oper_base {
public:
    wait_oper(size_t size, deadline_timer& timer, clock::time_point expiration_time, const H& handler):
        io_service::wait_oper_base(size, timer, expiration_time),
        m_handler(handler)
    {
    }
    void recycle_and_execute() override
    {
        bool orphaned = !m_timer;
        std::error_code ec;
        if (is_canceled())
            ec = error::operation_aborted;
        // Note: do_recycle_and_execute() commits suicide.
        do_recycle_and_execute(orphaned, m_handler, ec); // Throws
    }
private:
    const H m_handler;
};

inline deadline_timer::deadline_timer(io_service& serv):
    m_service(serv)
{
}

inline deadline_timer::~deadline_timer() noexcept
{
    cancel();
}

inline io_service& deadline_timer::service() noexcept
{
    return m_service;
}

template<class R, class P, class H>
inline void deadline_timer::async_wait(std::chrono::duration<R,P> delay, const H& handler) noexcept
{
    clock::time_point now = clock::now();
    auto max_add = clock::time_point::max() - now;
    if (delay > max_add)
        throw std::runtime_error("Expiration time overflow");
    clock::time_point expiration_time = now + delay;
    io_service::LendersWaitOperPtr op =
        io_service::alloc<wait_oper<H>>(m_wait_oper, *this, expiration_time, handler); // Throws
    m_service.add_wait_oper(std::move(op)); // Throws
}

} // namespace network
} // namespace util
} // namespace realm

#endif // REALM_UTIL_NETWORK_HPP
