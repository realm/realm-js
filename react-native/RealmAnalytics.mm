////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

// Asynchronously submits build information to Realm if running in an iOS
// simulator or on OS X if a debugger is attached. Does nothing if running on an
// iOS / watchOS device or if a debugger is *not* attached.
//
// To be clear: this does *not* run when your app is in production or on
// your end-user’s devices; it will only run in the simulator or when a debugger
// is attached.
//
// Why are we doing this? In short, because it helps us build a better product
// for you. None of the data personally identifies you, your employer or your
// app, but it *will* help us understand what language you use, what iOS
// versions you target, etc. Having this info will help prioritizing our time,
// adding new features and deprecating old features. Collecting an anonymized
// bundle & anonymized MAC is the only way for us to count actual usage of the
// other metrics accurately. If we don’t have a way to deduplicate the info
// reported, it will be useless, as a single developer building their Swift app
// 10 times would report 10 times more than a single Objective-C developer that
// only builds once, making the data all but useless.
// No one likes sharing data unless it’s necessary, we get it, and we’ve
// debated adding this for a long long time. Since Realm is a free product
// without an email signup, we feel this is a necessary step so we can collect
// relevant data to build a better product for you. If you truly, absolutely
// feel compelled to not send this data back to Realm, then you can set an env
// variable named REALM_DISABLE_ANALYTICS. Since Realm is free we believe
// letting these analytics run is a small price to pay for the product & support
// we give you.
//
// Currently the following information is reported:
// - What kind of JavaScript framework is being used (e.g. React Native).
// - What kind of JavaScript VM is being used (e.g. JavaScriptCore or V8).
// - What version of Realm is being used, and from which language (obj-c or Swift).
// - What version of OS X it's running on (in case Xcode aggressively drops
//   support for older versions again, we need to know what we need to support).
// - The minimum iOS/OS X version that the application is targeting (again, to
//   help us decide what versions we need to support).
// - An anonymous MAC address and bundle ID to aggregate the other information on.
// - What version of Swift is being used (if applicable).

#import "RealmAnalytics.h"

#if TARGET_IPHONE_SIMULATOR || !TARGET_OS_IPHONE
#import <CommonCrypto/CommonDigest.h>
#import <sys/socket.h>
#import <sys/sysctl.h>
#import <net/if.h>
#import <net/if_dl.h>
#import <array>

// This symbol is defined by the Apple Generic versioning system when building this project.
// It confusingly looks like this: @(#)PROGRAM:RealmReact  PROJECT:RealmJS-0.0.1
extern "C" const char RealmReactVersionString[];

// Wrapper for sysctl() that handles the memory management stuff
static auto RLMSysCtl(int *mib, u_int mibSize, size_t *bufferSize) {
    std::unique_ptr<void, decltype(&free)> buffer(nullptr, &free);

    int ret = sysctl(mib, mibSize, nullptr, bufferSize, nullptr, 0);
    if (ret != 0) {
        return buffer;
    }

    buffer.reset(malloc(*bufferSize));
    if (!buffer) {
        return buffer;
    }

    ret = sysctl(mib, mibSize, buffer.get(), bufferSize, nullptr, 0);
    if (ret != 0) {
        buffer.reset();
    }

    return buffer;
}

// Get the version of OS X we're running on (even in the simulator this gives
// the OS X version and not the simulated iOS version)
static NSString *RLMOSVersion() {
    std::array<int, 2> mib = {CTL_KERN, KERN_OSRELEASE};
    size_t bufferSize;
    auto buffer = RLMSysCtl(&mib[0], mib.size(), &bufferSize);
    if (!buffer) {
        return nil;
    }

    return [[NSString alloc] initWithBytesNoCopy:buffer.release()
                                          length:bufferSize - 1
                                        encoding:NSUTF8StringEncoding
                                    freeWhenDone:YES];
}

// Hash the data in the given buffer and convert it to a hex-format string
static NSString *RLMHashData(const void *bytes, size_t length) {
    unsigned char buffer[CC_SHA256_DIGEST_LENGTH];
    CC_SHA256(bytes, static_cast<CC_LONG>(length), buffer);

    char formatted[CC_SHA256_DIGEST_LENGTH * 2 + 1];
    for (int i = 0; i < CC_SHA256_DIGEST_LENGTH; ++i) {
        sprintf(formatted + i * 2, "%02x", buffer[i]);
    }

    return [[NSString alloc] initWithBytes:formatted
                                    length:CC_SHA256_DIGEST_LENGTH * 2
                                  encoding:NSUTF8StringEncoding];
}

// Returns the hash of the MAC address of the first network adaptor since the
// vendorIdentifier isn't constant between iOS simulators.
static NSString *RLMMACAddress() {
    int en0 = static_cast<int>(if_nametoindex("en0"));
    if (!en0) {
        return nil;
    }

    std::array<int, 6> mib = {CTL_NET, PF_ROUTE, 0, AF_LINK, NET_RT_IFLIST, en0};
    size_t bufferSize;
    auto buffer = RLMSysCtl(&mib[0], mib.size(), &bufferSize);
    if (!buffer) {
        return nil;
    }

    // sockaddr_dl struct is immediately after the if_msghdr struct in the buffer
    auto sockaddr = reinterpret_cast<sockaddr_dl *>(static_cast<if_msghdr *>(buffer.get()) + 1);
    auto mac = reinterpret_cast<const unsigned char *>(sockaddr->sdl_data + sockaddr->sdl_nlen);
    
    return RLMHashData(mac, 6);
}

static bool RLMIsDebuggerAttached() {
    int name[] = {
        CTL_KERN,
        KERN_PROC,
        KERN_PROC_PID,
        getpid()
    };

    struct kinfo_proc info;
    size_t info_size = sizeof(info);
    if (sysctl(name, sizeof(name) / sizeof(name[0]), &info, &info_size, NULL, 0) == -1) {
        NSLog(@"sysctl() failed: %s", strerror(errno));
        return false;
    }

    return (info.kp_proc.p_flag & P_TRACED) != 0;
}

static NSDictionary *RLMAnalyticsPayload() {
    static NSString * const kUnknownString = @"unknown";
    NSBundle *appBundle = NSBundle.mainBundle;
    NSString *hashedBundleID = appBundle.bundleIdentifier;
    NSString *hashedMACAddress = RLMMACAddress();

    // Main bundle isn't always the one of interest (e.g. when running tests
    // it's xctest rather than the app's bundle), so look for one with a bundle ID
    if (!hashedBundleID) {
        for (NSBundle *bundle in NSBundle.allBundles) {
            if ((hashedBundleID = bundle.bundleIdentifier)) {
                appBundle = bundle;
                break;
            }
        }
    }

    // If we found a bundle ID anywhere, hash it as it could contain sensitive
    // information (e.g. the name of an unnanounced product)
    if (hashedBundleID) {
        NSData *data = [hashedBundleID dataUsingEncoding:NSUTF8StringEncoding];
        hashedBundleID = RLMHashData(data.bytes, data.length);
    }

    return @{
        @"event": @"Run",
        @"properties": @{
            // MixPanel properties
            @"token": @"ce0fac19508f6c8f20066d345d360fd0",

            // Anonymous identifiers to deduplicate events
            @"distinct_id": hashedMACAddress ?: kUnknownString,
            @"Anonymized MAC Address": hashedMACAddress ?: kUnknownString,
            @"Anonymized Bundle ID": hashedBundleID ?: kUnknownString,

            // Which version of Realm is being used
            @"Binding": @"js",
            @"Language": @"js",
            @"Framework": @"react-native",
            @"Virtual Machine": @"jsc",
            @"Realm Version": [[@(RealmReactVersionString) componentsSeparatedByString:@"-"] lastObject] ?: kUnknownString,
#if TARGET_OS_IPHONE
            @"Target OS Type": @"ios",
#else
            @"Target OS Type": @"osx",
#endif
            // Current OS version the app is targetting
            @"Target OS Version": [[NSProcessInfo processInfo] operatingSystemVersionString],
            // Minimum OS version the app is targetting
            @"Target OS Minimum Version": appBundle.infoDictionary[@"MinimumOSVersion"] ?: kUnknownString,

            // Host OS version being built on
            @"Host OS Type": @"osx",
            @"Host OS Version": RLMOSVersion() ?: kUnknownString,
        }
    };
}

void RLMSendAnalytics() {
    if (getenv("REALM_DISABLE_ANALYTICS") || !RLMIsDebuggerAttached()) {
        return;
    }

    NSData *payload = [NSJSONSerialization dataWithJSONObject:RLMAnalyticsPayload() options:0 error:nil];
    NSString *url = [NSString stringWithFormat:@"https://api.mixpanel.com/track/?data=%@&ip=1", [payload base64EncodedStringWithOptions:0]];

    // No error handling or anything because logging errors annoyed people for no
    // real benefit, and it's not clear what else we could do
    [[NSURLSession.sharedSession dataTaskWithURL:[NSURL URLWithString:url]] resume];
}

#else

void RLMSendAnalytics() {}

#endif
