APP_BUILD_SCRIPT := Android.mk

APP_ABI := armeabi-v7a x86
APP_PLATFORM := android-9

APP_MK_DIR := $(dir $(lastword $(MAKEFILE_LIST)))

NDK_MODULE_PATH := $(APP_MK_DIR)$(HOST_DIRSEP)$(THIRD_PARTY_NDK_DIR)$(HOST_DIRSEP)$(APP_MK_DIR)

APP_STL := gnustl_static
APP_CPPFLAGS := -std=c++14
APP_CPPFLAGS += -frtti
APP_CPPFLAGS += -fexceptions
APP_CPPFLAGS += -DREALM_HAVE_CONFIG
APP_CPPFLAGS += -fomit-frame-pointer
APP_CPPFLAGS += -fvisibility=hidden

# Make sure every shared lib includes a .note.gnu.build-id header
APP_LDFLAGS := -Wl,--build-id
APP_LDFLAGS += -llog
APP_LDFLAGS += -landroid
APP_LDFLAGS += -fvisibility=hidden

# Workaround for memmove/memcpy bug
ifeq ($(strip $(BUILD_WRAP_MEMMOVE)),1)
APP_CPPFLAGS += -DREALM_WRAP_MEMMOVE=1
APP_LDFLAGS += -Wl,--wrap,memmove
APP_LDFLAGS += -Wl,--wrap,memcpy
else
APP_CPPFLAGS += -DREALM_WRAP_MEMMOVE=0
endif

ifeq ($(strip $(BUILD_TYPE_SYNC)),1)
APP_CPPFLAGS += -DREALM_ENABLE_SYNC=1
APP_LDFLAGS += -lz
endif

NDK_TOOLCHAIN_VERSION := 4.9
