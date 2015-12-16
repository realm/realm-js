LOCAL_PATH:= $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := realm-android-$(TARGET_ARCH_ABI)
LOCAL_EXPORT_C_INCLUDES := core/include
LOCAL_SRC_FILES := core/librealm-android-$(TARGET_ARCH_ABI).a
include $(PREBUILT_STATIC_LIBRARY)

include $(CLEAR_VARS)
LOCAL_MODULE := librealmreact

LOCAL_SRC_FILES := \
  src/js_list.cpp \
  src/js_results.cpp \
  src/js_init.cpp \
  src/js_realm.cpp \
  src/js_util.cpp \
  src/js_object.cpp \
  src/js_schema.cpp	\
  src/rpc.cpp \
  src/android/platform.cpp \
  src/android/com_reacttests_RealmReactAndroid.cpp \
  src/object-store/index_set.cpp \
  src/object-store/list.cpp \
  src/object-store/object_schema.cpp \
  src/object-store/object_store.cpp \
  src/object-store/results.cpp \
  src/object-store/schema.cpp \
  src/object-store/shared_realm.cpp \
  src/object-store/parser/parser.cpp \
  src/object-store/parser/query_builder.cpp \
  src/object-store/impl/transact_log_handler.cpp \
  vendor/base64.cpp

LOCAL_C_INCLUDES := src
LOCAL_C_INCLUDES += src/object-store
LOCAL_C_INCLUDES += src/object-store/parser
LOCAL_C_INCLUDES += vendor
LOCAL_C_INCLUDES += vendor/PEGTL
LOCAL_C_INCLUDES += ../../../../../../../react-native/ReactAndroid/src/main/jni/react
LOCAL_C_INCLUDES += ../../../../../../../react-native/ReactAndroid/src/main/jni/first-party
LOCAL_C_INCLUDES += ../../../../../../../react-native/ReactAndroid/src/main/jni/first-party/fb/include
LOCAL_C_INCLUDES += $(JAVA_HOME)/include
LOCAL_C_INCLUDES += $(JAVA_HOME)/include/darwin
LOCAL_C_INCLUDES += core/include

CXX11_FLAGS := -std=c++14
LOCAL_CFLAGS += -fexceptions $(CXX11_FLAGS) -frtti
LOCAL_EXPORT_CPPFLAGS := $(CXX11_FLAGS)


LOCAL_STATIC_LIBRARIES := realm-android-$(TARGET_ARCH_ABI)
LOCAL_SHARED_LIBRARIES := libjsc
include $(BUILD_SHARED_LIBRARY)

$(call import-module,jsc)

