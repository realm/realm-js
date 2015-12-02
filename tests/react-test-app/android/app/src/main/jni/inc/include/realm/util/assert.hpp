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
#ifndef REALM_UTIL_ASSERT_HPP
#define REALM_UTIL_ASSERT_HPP

#include <realm/util/features.h>
#include <realm/util/terminate.hpp>

#if REALM_ENABLE_ASSERTIONS || defined(REALM_DEBUG)
#  define REALM_ASSERTIONS_ENABLED 1
#endif

#define REALM_ASSERT_RELEASE(condition) \
    ((condition) ? static_cast<void>(0) : \
    realm::util::terminate("Assertion failed: " #condition, __FILE__, __LINE__))

#if REALM_ASSERTIONS_ENABLED
#  define REALM_ASSERT(condition) REALM_ASSERT_RELEASE(condition)
#else
#  define REALM_ASSERT(condition) static_cast<void>(0)
#endif

#ifdef REALM_DEBUG
#  define REALM_ASSERT_DEBUG(condition) REALM_ASSERT_RELEASE(condition)
#else
#  define REALM_ASSERT_DEBUG(condition) static_cast<void>(0)
#endif

#define REALM_STRINGIFY(X) #X

#define REALM_ASSERT_RELEASE_EX(condition, ...) \
    ((condition) ? static_cast<void>(0) : \
    realm::util::terminate_with_info("Assertion failed: " # condition, __LINE__, __FILE__, \
                                     REALM_STRINGIFY((__VA_ARGS__)), __VA_ARGS__))

#ifdef REALM_DEBUG
#  define REALM_ASSERT_DEBUG_EX REALM_ASSERT_RELEASE_EX
#else
#  define REALM_ASSERT_DEBUG_EX(...) static_cast<void>(0)
#endif

// Becase the assert is used in noexcept methods, it's a bad idea to allocate buffer space for the message
// so therefore we must pass it to terminate which will 'cerr' it for us without needing any buffer
#if REALM_ENABLE_ASSERTIONS || defined(REALM_DEBUG)

#  define REALM_ASSERT_EX REALM_ASSERT_RELEASE_EX

#  define REALM_ASSERT_3(left, condition, right) \
    (((left) condition (right)) ? static_cast<void>(0) :                \
        realm::util::terminate("Assertion failed: " #left " " #condition " " #right, \
                               __FILE__, __LINE__, left, right))

#  define REALM_ASSERT_7(left1, condition1, right1, logical, left2, condition2, right2) \
    ((((left1) condition1 (right1)) logical ((left2) condition2 (right2))) ? static_cast<void>(0) : \
        realm::util::terminate("Assertion failed: " #left1 " " #condition1 " " #right1 " " #logical " " #left2 " " #condition2 " " #right2, \
                               __FILE__, __LINE__, left1, right1, left2, right2))

#  define REALM_ASSERT_11(left1, condition1, right1, logical1, left2, condition2, right2, logical2, left3, condition3, right3) \
    ((((left1) condition1 (right1)) logical1 ((left2) condition2 (right2)) logical2 ((left3) condition3 (right3))) ? static_cast<void>(0) : \
        realm::util::terminate("Assertion failed: " #left1 " " #condition1 " " #right1 " " #logical1 " " #left2 " " #condition2 " " #right2 " " #logical2 " " #left3 " " #condition3 " " #right3, \
                               __FILE__, __LINE__, left1, right1, left2, right2, left3, right3))
#else
#  define REALM_ASSERT_EX(...) static_cast<void>(0)
#  define REALM_ASSERT_3(left, condition, right) static_cast<void>(0)
#  define REALM_ASSERT_7(left1, condition1, right1, logical, left2, condition2, right2) static_cast<void>(0)
#  define REALM_ASSERT_11(left1, condition1, right1, logical1, left2, condition2, right2, logical3, left3, condition3, right3) static_cast<void>(0)
#endif

#define REALM_UNREACHABLE() \
    realm::util::terminate("Unreachable code", __FILE__, __LINE__)

#endif // REALM_UTIL_ASSERT_HPP
