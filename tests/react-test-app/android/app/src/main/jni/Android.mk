LOCAL_PATH:= $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE := librealmreact

LOCAL_SRC_FILES := \
  js_list.cpp \
  js_results.cpp \
  js_init.cpp \
  js_realm.cpp \
  js_util.cpp \
  js_object.cpp \
  js_schema.cpp	\
  rpc.cpp \
  index_set.cpp \
  list.cpp \
  object_schema.cpp \
  object_store.cpp \
  results.cpp \
  schema.cpp \
  shared_realm.cpp

LOCAL_C_INCLUDES := ../../../../../../../vendor
LOCAL_C_INCLUDES += ../../../../../../../core/include

LOCAL_CFLAGS += -fexceptions -std=c++14 -frtti -Wno-extern-c-compat
CXX11_FLAGS := -std=c++11
LOCAL_CFLAGS += $(CXX11_FLAGS)
LOCAL_EXPORT_CPPFLAGS := $(CXX11_FLAGS)
LOCAL_SHARED_LIBRARIES := libjsc

include $(BUILD_SHARED_LIBRARY)

$(call import-module,jsc)

