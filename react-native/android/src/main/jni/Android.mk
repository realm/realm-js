LOCAL_PATH:= $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := realm-android-$(TARGET_ARCH_ABI)
LOCAL_EXPORT_C_INCLUDES := core/include
ifeq ($(NDK_DEBUG),1)
LOCAL_SRC_FILES := core/librealm-android-$(TARGET_ARCH_ABI)-dbg.a
else
LOCAL_SRC_FILES := core/librealm-android-$(TARGET_ARCH_ABI).a
endif

include $(PREBUILT_STATIC_LIBRARY)

include $(CLEAR_VARS)
LOCAL_MODULE := libjsc
LOCAL_EXPORT_C_INCLUDES := jsc
include $(BUILD_SHARED_LIBRARY)

include $(CLEAR_VARS)
ifeq ($(NDK_DEBUG),1)
LOCAL_MODULE := librealmreact-dbg
else
LOCAL_MODULE := librealmreact
endif


LOCAL_SRC_FILES := \
  src/js_realm.cpp \
  src/rpc.cpp \
  src/jsc/jsc_init.cpp \
  src/android/platform.cpp \
  src/android/io_realm_react_RealmReactModule.cpp \
  src/android/jsc_override.cpp \
  src/object-store/src/index_set.cpp \
  src/object-store/src/list.cpp \
  src/object-store/src/object_schema.cpp \
  src/object-store/src/object_store.cpp \
  src/object-store/src/results.cpp \
  src/object-store/src/schema.cpp \
  src/object-store/src/shared_realm.cpp \
  src/object-store/src/parser/parser.cpp \
  src/object-store/src/parser/query_builder.cpp \
  src/object-store/src/impl/transact_log_handler.cpp \
  src/object-store/src/impl/async_query.cpp \
  src/object-store/src/impl/realm_coordinator.cpp \
  src/object-store/src/impl/generic/external_commit_helper.cpp \
  vendor/base64.cpp

LOCAL_C_INCLUDES := src
LOCAL_C_INCLUDES += src/jsc
LOCAL_C_INCLUDES += src/object-store/src
LOCAL_C_INCLUDES += src/object-store/src/impl
LOCAL_C_INCLUDES += src/object-store/src/parser
LOCAL_C_INCLUDES += src/object-store/external/pegtl
LOCAL_C_INCLUDES += vendor
LOCAL_C_INCLUDES += $(JAVA_HOME)/include
LOCAL_C_INCLUDES += $(JAVA_HOME)/include/darwin
LOCAL_C_INCLUDES += core/include

LOCAL_ALLOW_UNDEFINED_SYMBOLS := true

LOCAL_STATIC_LIBRARIES := realm-android-$(TARGET_ARCH_ABI)
LOCAL_SHARED_LIBRARIES := libjsc
include $(BUILD_SHARED_LIBRARY)
