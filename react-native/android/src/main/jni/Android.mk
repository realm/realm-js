LOCAL_PATH:= $(call my-dir)

ifeq ($(strip $(BUILD_TYPE_SYNC)),1)
include $(CLEAR_VARS)
LOCAL_MODULE := realm-android-sync-$(TARGET_ARCH_ABI)
LOCAL_EXPORT_C_INCLUDES := core/include
LOCAL_SRC_FILES := core/librealm-sync-android-$(TARGET_ARCH_ABI).a
include $(PREBUILT_STATIC_LIBRARY)
endif

include $(CLEAR_VARS)
LOCAL_MODULE := realm-android-$(TARGET_ARCH_ABI)
LOCAL_EXPORT_C_INCLUDES := core/include
LOCAL_SRC_FILES := core/librealm-android-$(TARGET_ARCH_ABI).a
include $(PREBUILT_STATIC_LIBRARY)

include $(CLEAR_VARS)
LOCAL_MODULE := libjsc
LOCAL_EXPORT_C_INCLUDES := jsc
include $(BUILD_SHARED_LIBRARY)

include $(CLEAR_VARS)
LOCAL_MODULE := librealmreact

LOCAL_SRC_FILES := vendor/base64.cpp
LOCAL_SRC_FILES += src/js_realm.cpp
LOCAL_SRC_FILES += src/rpc.cpp
LOCAL_SRC_FILES += src/jsc/jsc_init.cpp
LOCAL_SRC_FILES += src/jsc/jsc_value.cpp
LOCAL_SRC_FILES += src/android/io_realm_react_RealmReactModule.cpp
LOCAL_SRC_FILES += src/android/jsc_override.cpp
LOCAL_SRC_FILES += src/android/platform.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/collection_change_builder.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/collection_notifier.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/list_notifier.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/object_notifier.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/realm_coordinator.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/results_notifier.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/transact_log_handler.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/weak_realm_notifier.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/epoll/external_commit_helper.cpp
LOCAL_SRC_FILES += src/object-store/src/parser/parser.cpp
LOCAL_SRC_FILES += src/object-store/src/parser/query_builder.cpp
LOCAL_SRC_FILES += src/object-store/src/util/format.cpp
LOCAL_SRC_FILES += src/object-store/src/binding_callback_thread_observer.cpp
LOCAL_SRC_FILES += src/object-store/src/collection_notifications.cpp
LOCAL_SRC_FILES += src/object-store/src/index_set.cpp
LOCAL_SRC_FILES += src/object-store/src/list.cpp
LOCAL_SRC_FILES += src/object-store/src/object_schema.cpp
LOCAL_SRC_FILES += src/object-store/src/object_store.cpp
LOCAL_SRC_FILES += src/object-store/src/object.cpp
LOCAL_SRC_FILES += src/object-store/src/results.cpp
LOCAL_SRC_FILES += src/object-store/src/schema.cpp
LOCAL_SRC_FILES += src/object-store/src/shared_realm.cpp
LOCAL_SRC_FILES += src/object-store/src/thread_safe_reference.cpp
ifeq ($(strip $(BUILD_TYPE_SYNC)),1)
LOCAL_SRC_FILES += src/object-store/src/sync/sync_manager.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/sync_session.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/sync_user.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/impl/sync_file.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/impl/sync_metadata.cpp
endif

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
ifeq ($(strip $(BUILD_TYPE_SYNC)),1)
LOCAL_C_INCLUDES += src/object-store/src/sync
endif

LOCAL_ALLOW_UNDEFINED_SYMBOLS := true
ifeq ($(strip $(BUILD_TYPE_SYNC)),1)
LOCAL_STATIC_LIBRARIES := realm-android-sync-$(TARGET_ARCH_ABI)
LOCAL_STATIC_LIBRARIES += realm-android-$(TARGET_ARCH_ABI)
else
LOCAL_STATIC_LIBRARIES := realm-android-$(TARGET_ARCH_ABI)
endif


LOCAL_SHARED_LIBRARIES := libjsc
include $(BUILD_SHARED_LIBRARY)
