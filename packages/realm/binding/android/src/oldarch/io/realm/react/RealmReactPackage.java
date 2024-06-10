/*
 * Copyright 2018 Realm Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package io.realm.react;

import android.content.res.AssetManager;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.common.annotations.UnstableReactNativeAPI;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.soloader.SoLoader;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@UnstableReactNativeAPI @FrameworkAPI public class RealmReactPackage extends TurboReactPackage {
    static {
        SoLoader.loadLibrary("realm");
    }

    // Passes the React Native jsCallInvokerHolder over to C++ so we can setup our UI queue flushing

    static native void injectModuleIntoJSGlobal(long runtimePointer);

    static native void injectFlushUiQueue(CallInvokerHolderImpl callInvoker);

    static native void setDefaultRealmFileDirectory(String fileDir, AssetManager assets);

    static native void invalidateCaches();

    // Used to create a native AssetManager in C++ in order to load file from APK
    // Note: We keep a VM reference to the assetManager to prevent its being
    //       garbage collected while the native object is in use.
    //http://developer.android.com/ndk/reference/group___asset.html#gadfd6537af41577735bcaee52120127f4
    @SuppressWarnings("FieldCanBeLocal")
    private static AssetManager assetManager;

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public NativeModule getModule(String name, final ReactApplicationContext reactContext) {
        if (name.equals(RealmReactModule.NAME)) {
            configure(reactContext);
            return new RealmReactModule(reactContext);
        } else {
            return null;
        }
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return () -> {
            final Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
            moduleInfos.put(
                    RealmReactModule.NAME,
                    new ReactModuleInfo(
                            RealmReactModule.NAME,
                            RealmReactModule.NAME,
                    false, // canOverrideExistingModule
                    false, // needsEagerInit
                    true, // hasConstants
                    false, // isCxxModule
                    false // isTurboModule
            ));
            return moduleInfos;
        };
    }

    static void configure(@NonNull ReactApplicationContext reactContext) {
        assetManager = reactContext.getResources().getAssets();
        try {
            String fileDir = reactContext.getFilesDir().getCanonicalPath();
            setDefaultRealmFileDirectory(fileDir, assetManager);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }

    }
}
