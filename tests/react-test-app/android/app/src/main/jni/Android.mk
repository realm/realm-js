LOCAL_PATH:= $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE := nabil

LOCAL_SRC_FILES := \
  js_list.cpp \
  js_results.cpp \
  js_init.cpp \
  js_realm.cpp \
  js_util.cpp \
  js_object.cpp \
  js_schema.cpp	\
  rpc.cpp \

LOCAL_CFLAGS += -Wall -Werror -fexceptions
CXX11_FLAGS := -std=c++11
LOCAL_CFLAGS += $(CXX11_FLAGS)
LOCAL_EXPORT_CPPFLAGS := $(CXX11_FLAGS)

LOCAL_C_INCLUDES := ../../../../../../../vendor
LOCAL_C_INCLUDES += ../../../../../../../core/include

LOCAL_SHARED_LIBRARIES := libjsc

include $(BUILD_SHARED_LIBRARY)

$(call import-module,jsc)

