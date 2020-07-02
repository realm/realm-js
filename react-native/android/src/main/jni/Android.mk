LOCAL_PATH:= $(call my-dir)

ifeq ($(strip $(BUILD_TYPE_SYNC)),1)
include $(CLEAR_VARS)
LOCAL_MODULE := realm-android-sync-$(TARGET_ARCH_ABI)
LOCAL_EXPORT_C_INCLUDES := core/include
LOCAL_SRC_FILES := core/librealm-sync-android-$(TARGET_ARCH_ABI).a
include $(PREBUILT_STATIC_LIBRARY)

include $(CLEAR_VARS)
LOCAL_MODULE := crypto-$(TARGET_ARCH_ABI)
LOCAL_EXPORT_C_INCLUDES := core/include/openssl
LOCAL_SRC_FILES := core/lib/libcrypto-$(TARGET_ARCH_ABI).a
include $(PREBUILT_STATIC_LIBRARY)
endif

include $(CLEAR_VARS)
LOCAL_MODULE := realm-android-$(TARGET_ARCH_ABI)
LOCAL_EXPORT_C_INCLUDES := core/include
LOCAL_SRC_FILES := core/librealm-android-$(TARGET_ARCH_ABI).a
include $(PREBUILT_STATIC_LIBRARY)

include $(CLEAR_VARS)
LOCAL_MODULE := realm-parser-android-$(TARGET_ARCH_ABI)
LOCAL_SRC_FILES := core/librealm-parser-android-$(TARGET_ARCH_ABI).a
include $(PREBUILT_STATIC_LIBRARY)

include $(CLEAR_VARS)
LOCAL_MODULE := libjsc
LOCAL_EXPORT_C_INCLUDES := jsc
include $(BUILD_SHARED_LIBRARY)

include $(CLEAR_VARS)
LOCAL_MODULE := ssl-$(TARGET_ARCH_ABI)
LOCAL_EXPORT_C_INCLUDES := core/include
LOCAL_SRC_FILES := core/lib/libssl-$(TARGET_ARCH_ABI).a
include $(PREBUILT_STATIC_LIBRARY)

include $(CLEAR_VARS)
LOCAL_MODULE := librealmreact

LOCAL_SRC_FILES := vendor/base64.cpp
LOCAL_SRC_FILES += src/js_realm.cpp
LOCAL_SRC_FILES += src/rpc.cpp
LOCAL_SRC_FILES += src/jsc/jsc_init.cpp
LOCAL_SRC_FILES += src/jsc/jsc_value.cpp
LOCAL_SRC_FILES += src/android/io_realm_react_RealmReactModule.cpp
LOCAL_SRC_FILES += src/android/jni_utils.cpp
LOCAL_SRC_FILES += src/android/jsc_override.cpp
LOCAL_SRC_FILES += src/android/platform.cpp
LOCAL_SRC_FILES += src/android/hack.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/collection_change_builder.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/collection_notifier.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/list_notifier.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/object_notifier.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/realm_coordinator.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/results_notifier.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/transact_log_handler.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/weak_realm_notifier.cpp
LOCAL_SRC_FILES += src/object-store/src/impl/epoll/external_commit_helper.cpp
LOCAL_SRC_FILES += src/object-store/src/util/uuid.cpp
LOCAL_SRC_FILES += src/object-store/src/binding_callback_thread_observer.cpp
LOCAL_SRC_FILES += src/object-store/src/collection_notifications.cpp
LOCAL_SRC_FILES += src/object-store/src/index_set.cpp
LOCAL_SRC_FILES += src/object-store/src/list.cpp
LOCAL_SRC_FILES += src/object-store/src/object_schema.cpp
LOCAL_SRC_FILES += src/object-store/src/object_store.cpp
LOCAL_SRC_FILES += src/object-store/src/object.cpp
LOCAL_SRC_FILES += src/object-store/src/object_changeset.cpp
LOCAL_SRC_FILES += src/object-store/src/results.cpp
LOCAL_SRC_FILES += src/object-store/src/schema.cpp
LOCAL_SRC_FILES += src/object-store/src/shared_realm.cpp
LOCAL_SRC_FILES += src/object-store/src/thread_safe_reference.cpp
LOCAL_SRC_FILES += src/object-store/src/util/scheduler.cpp
ifeq ($(strip $(BUILD_TYPE_SYNC)),1)
LOCAL_SRC_FILES += src/object-store/src/sync/async_open_task.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/partial_sync.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/sync_config.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/sync_manager.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/sync_session.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/sync_user.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/impl/sync_file.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/impl/sync_metadata.cpp
LOCAL_SRC_FILES += src/object-store/src/sync/impl/work_queue.cpp
endif

LOCAL_C_INCLUDES := src
LOCAL_C_INCLUDES += src/jsc
LOCAL_C_INCLUDES += src/object-store/src
LOCAL_C_INCLUDES += src/object-store/external/json
LOCAL_C_INCLUDES += vendor
LOCAL_C_INCLUDES += core/include
LOCAL_C_INCLUDES += core/include/openssl
LOCAL_C_INCLUDES += include
ifeq ($(strip $(BUILD_TYPE_SYNC)),1)
LOCAL_C_INCLUDES += src/object-store/src/sync
endif

LOCAL_ALLOW_UNDEFINED_SYMBOLS := true
ifeq ($(strip $(BUILD_TYPE_SYNC)),1)
LOCAL_STATIC_LIBRARIES := realm-android-sync-$(TARGET_ARCH_ABI)
LOCAL_STATIC_LIBRARIES += realm-parser-android-$(TARGET_ARCH_ABI)
LOCAL_STATIC_LIBRARIES += realm-android-$(TARGET_ARCH_ABI)
LOCAL_STATIC_LIBRARIES += ssl-$(TARGET_ARCH_ABI)
LOCAL_STATIC_LIBRARIES += crypto-$(TARGET_ARCH_ABI)
else
LOCAL_STATIC_LIBRARIES := realm-parser-android-$(TARGET_ARCH_ABI)
LOCAL_STATIC_LIBRARIES += realm-android-$(TARGET_ARCH_ABI)
LOCAL_STATIC_LIBRARIES += crypto-$(TARGET_ARCH_ABI)
endif

# Workaround for memmove/memcpy bug
ifeq ($(TARGET_ARCH_ABI),armeabi-v7a)
LOCAL_CPPFLAGS += -DREALM_WRAP_MEMMOVE=1
LOCAL_LDFLAGS += -Wl,--wrap,memmove
LOCAL_LDFLAGS += -Wl,--wrap,memcpy
else
LOCAL_CPPFLAGS += -DREALM_WRAP_MEMMOVE=0
endif

LOCAL_SHARED_LIBRARIES := libjsc
include $(BUILD_SHARED_LIBRARY)
