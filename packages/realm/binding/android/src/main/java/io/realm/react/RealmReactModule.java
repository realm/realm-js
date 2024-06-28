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

import androidx.annotation.NonNull;
import android.content.res.AssetManager;
import android.util.Log;

import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.soloader.SoLoader;

import java.io.IOException;
import java.util.Objects;

@ReactModule(name = RealmReactModule.NAME)
class RealmReactModule extends ReactContextBaseJavaModule {
    public static final String NAME = "Realm";
    private boolean injected = false;

    public RealmReactModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

    /**
     * Used to create a native AssetManager in C++ in order to load file from APK
     * Note: We keep a VM reference to the assetManager to prevent its being garbage collected while the native object is in use.
     * See: http://developer.android.com/ndk/reference/group___asset.html#gadfd6537af41577735bcaee52120127f4
     */
    @SuppressWarnings("FieldCanBeLocal")
    private AssetManager assetManager;

    @Override
    public void invalidate() {
        if (injected) {
            invalidateCaches();
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean injectModuleIntoJSGlobal() {
        // Calling loadLibrary multiple times will be ignored
        // We do it here instead of statically to allow the app load faster if Realm isn't accessed.
        // Effectively emulating the behaviour of TurboModules.
        Log.d("Realm", "Loading librealm.so");
        SoLoader.loadLibrary("realm");
        injected = true;

        ReactApplicationContext reactContext = getReactApplicationContext();

        // Tell the native module where to store database files and from where to load bundled database files
        assetManager = reactContext.getResources().getAssets();
        try {
            setDefaultRealmFileDirectoryImpl(reactContext.getFilesDir().getCanonicalPath(), assetManager);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }

        // Since https://github.com/facebook/react-native/pull/43396 this should only be needed when bridgeless is not enabled.
        // but unfortunately, that doesn't seem to be the case.
        // See https://github.com/facebook/react-native/pull/43396#issuecomment-2178586017 for context
        // If it was, we could use the enablement of "microtasks" to avoid the overhead of calling the invokeAsync on every call from C++ into JS.
        // if (!ReactNativeFeatureFlags.enableMicrotasks())

        CallInvokerHolderImpl jsCallInvokerHolder = (CallInvokerHolderImpl) reactContext.getCatalystInstance().getJSCallInvokerHolder();
        injectCallInvoker(jsCallInvokerHolder);

        // Get the javascript runtime and inject our native module with it
        JavaScriptContextHolder jsContext = reactContext.getJavaScriptContextHolder();
        synchronized(jsContext) {
            Log.d("Realm", "Calling into native code to inject module into JS global");
            injectModuleIntoJSGlobal(jsContext.get());
        }

        return true;
    }

    /**
     * @param fileDir Path of the internal storage of the application
     * @param assetManager Manager used when restoring database files from the application assets
     */
    private native void setDefaultRealmFileDirectoryImpl(String fileDir, AssetManager assetManager);

    /**
     * Injects the native module into the JS global
     * NOTE: We're using a global instead of returning a JSI object, to workaround limitations
     * in the expressiveness of the React Native Codegen and to retain support for the "old architecture".
     * @param runtimePointer The memory address of the JSI Runtime object.
     */
    private native void injectModuleIntoJSGlobal(long runtimePointer);

    /**
     * Passes the React Native jsCallInvokerHolder over to C++ so we can setup our UI queue flushing.
     * This is needed as a workaround for https://github.com/facebook/react-native/issues/33006
     * where we call the invokeAsync method to flush the React Native UI queue whenever we call from C++ to JS.
     */
    private native void injectCallInvoker(CallInvokerHolderImpl callInvoker);

    private native void invalidateCaches();
}
