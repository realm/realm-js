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

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
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
        } catch (UnsatisfiedLinkError e) {
            if (e.getMessage().contains("library \"libjsc.so\" not found")) {
                throw new RuntimeException("Realm JS does not support the Hermes engine yet. Express your 💚 on https://github.com/realm/realm-js/issues/2455", e);
            }
            throw e;
        }
    }

    private Handler worker;
    private HandlerThread workerThread;

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
    }

    @Override
    public String getName() {
        return NAME;
    }

    @Override
    public Map<String, Object> getConstants() {
        return Collections.<String, Object>emptyMap();
    }

    private static boolean isRunningOnEmulator() {
        // Check if running in Genymotion or on the stock emulator.
        return Build.FINGERPRINT.contains("vbox") || Build.FINGERPRINT.contains("generic");
    }

    private List<String> getIPAddresses() {
        ArrayList<String> ipAddresses = new ArrayList<String>();

        try {
            Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();

            while (networkInterfaces.hasMoreElements()) {
                NetworkInterface networkInterface = networkInterfaces.nextElement();
                if (networkInterface.isLoopback() || !networkInterface.isUp()) {
                    continue;
                }

                Enumeration<InetAddress> addresses = networkInterface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress address = addresses.nextElement();
                    if (address.isLoopbackAddress() || address.isLinkLocalAddress() || address.isAnyLocalAddress()) {
                        continue;
                    }

                    ipAddresses.add(address.getHostAddress());
                }
            }
        } catch (SocketException e) {
            e.printStackTrace();
        }

        return ipAddresses;
    }

    // fileDir: path of the internal storage of the application
    private native void setDefaultRealmFileDirectory(String fileDir, AssetManager assets);
}
