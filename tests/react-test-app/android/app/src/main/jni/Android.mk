LOCAL_PATH:= $(call my-dir)

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
  src/object-store/index_set.cpp \
  src/object-store/list.cpp \
  src/object-store/object_schema.cpp \
  src/object-store/object_store.cpp \
  src/object-store/results.cpp \
  src/object-store/schema.cpp \
  src/object-store/shared_realm.cpp \
  src/object-store/parser/parser.cpp \
  src/object-store/parser/query_builder.cpp \
  src/object-store/impl/transact_log_handler.cpp

LOCAL_C_INCLUDES := src/object-store
LOCAL_C_INCLUDES += src/object-store/parser
LOCAL_C_INCLUDES += ../../../../../../../vendor
LOCAL_C_INCLUDES += ../../../../../../../vendor/PEGTL
LOCAL_C_INCLUDES += ../../../build/third-party-ndk/realm-core/include

LOCAL_CFLAGS += -fexceptions -std=c++14 -frtti -Wno-extern-c-compat
CXX11_FLAGS := -std=c++11
LOCAL_CFLAGS += $(CXX11_FLAGS)
LOCAL_EXPORT_CPPFLAGS := $(CXX11_FLAGS)
LOCAL_SHARED_LIBRARIES := libjsc
LOCAL_STATIC_LIBRARIES := librealm-core

include $(BUILD_SHARED_LIBRARY)

$(call import-module,jsc)

