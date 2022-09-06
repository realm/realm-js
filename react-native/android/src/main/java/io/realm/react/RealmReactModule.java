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
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;

import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.soloader.SoLoader;

import java.io.IOException;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;

class RealmReactModule extends ReactContextBaseJavaModule {
    public static final String NAME = "Realm";
    private static boolean sentAnalytics = false;

    // used to create a native AssetManager in C++ in order to load file from APK
    // Note: We keep a VM reference to the assetManager to prevent its being
    //       garbage collected while the native object is in use.
    //http://developer.android.com/ndk/reference/group___asset.html#gadfd6537af41577735bcaee52120127f4
    @SuppressWarnings("FieldCanBeLocal")
    private final AssetManager assetManager;

    static {
        try {
            SoLoader.loadLibrary("realm");
        } catch (UnsatisfiedLinkError err) {
            if (err.getMessage().contains("library \"libjsi.so\" not found")) {
                throw new LinkageError("This version of Realm JS needs at least React Native version 0.66.0", err);
            }
            throw err;
        }
    }

    public RealmReactModule(ReactApplicationContext reactContext) {
        super(reactContext);

        assetManager = reactContext.getResources().getAssets();

        String fileDir;
        try {
            fileDir = reactContext.getFilesDir().getCanonicalPath();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }

        setDefaultRealmFileDirectory(fileDir, assetManager);

        // Get the javascript runtime and install our native module with it

        // TODO: Update this to use reactContext.getRuntimeExecutor() instead (since this is calling a deprecated method underneath)
        // Using the RuntimeExecutor however, requires that we link our native module against fbjni.

        JavaScriptContextHolder jsContext = reactContext.getJavaScriptContextHolder();
        synchronized(jsContext) {
            install(jsContext.get());
        }
    }

    @Override
    public void initialize() {
        // Pass the React Native jsCallInvokerHolder over to C++, so that we can access the invokeAsync
        // method which we use to flush the React Native UI queue whenever we call from C++ to JS.
        // See RealmReact.mm's setBridge method for details, this is the equivalent for Android.
        CallInvokerHolderImpl jsCallInvokerHolder = (CallInvokerHolderImpl) getReactApplicationContext().getCatalystInstance().getJSCallInvokerHolder();
        setupFlushUiQueue(jsCallInvokerHolder);
    }

    @Override
    public void invalidate() {
        invalidateCaches();
    }

    @Override
    public String getName() {
        return NAME;
    }

    @Override
    public Map<String, Object> getConstants() {
        return Collections.<String, Object>emptyMap();
    }

    // fileDir: path of the internal storage of the application
    private native void setDefaultRealmFileDirectory(String fileDir, AssetManager assets);

    private native void install(long runtimePointer);

    private native void invalidateCaches();
    // Passes the React Native jsCallInvokerHolder over to C++ so we can setup our UI queue flushing
    private native void setupFlushUiQueue(CallInvokerHolderImpl callInvoker);
}
