APP_BUILD_SCRIPT := Android.mk

APP_ABI := armeabi-v7a x86
APP_PLATFORM := android-9

APP_MK_DIR := $(dir $(lastword $(MAKEFILE_LIST)))

NDK_MODULE_PATH := $(APP_MK_DIR)$(HOST_DIRSEP)$(THIRD_PARTY_NDK_DIR)$(HOST_DIRSEP)$(APP_MK_DIR)first-party

APP_STL := gnustl_static
APP_CPPFLAGS := -std=c++14
APP_CPPFLAGS += -frtti
APP_CPPFLAGS += -fexceptions
APP_CPPFLAGS += -DREALM_HAVE_CONFIG

# adding flags for non debug build
ifneq ($(NDK_DEBUG),1)
APP_CPPFLAGS += -fvisibility=hidden
APP_CPPFLAGS += -ffunction-sections
APP_CPPFLAGS += -fdata-sections
APP_CPPFLAGS += -flto
endif

APP_LDFLAGS := -Wl,--build-id
APP_LDFLAGS += -llog

NDK_TOOLCHAIN_VERSION := 4.9
