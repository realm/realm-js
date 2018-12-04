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

import fi.iki.elonen.NanoHTTPD;

class RealmReactModule extends ReactContextBaseJavaModule {
    private static final int DEFAULT_PORT = 8083;
    private static boolean sentAnalytics = false;

    private AndroidWebServer webServer;
    // used to create a native AssetManager in C++ in order to load file from APK
    // Note: We keep a VM reference to the assetManager to prevent its being
    //       garbage collected while the native object is in use.
    //http://developer.android.com/ndk/reference/group___asset.html#gadfd6537af41577735bcaee52120127f4
    @SuppressWarnings("FieldCanBeLocal")
    private final AssetManager assetManager;

    static {
        SoLoader.loadLibrary("realmreact");
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
        return "Realm";
    }

    @Override
    public Map<String, Object> getConstants() {
        if (isContextInjected()) {
            // No constants are needed if *not* running in Chrome debug mode.
            return Collections.<String, Object>emptyMap();
        }

        startWebServer();

        List<String> hosts;
        if (isRunningOnEmulator()) {
            hosts = Arrays.asList("localhost");
        } else {
            hosts = getIPAddresses();
        }

        HashMap<String, Object> constants = new HashMap<String, Object>();
        constants.put("debugHosts", hosts);
        constants.put("debugPort", DEFAULT_PORT);
        return constants;
    }

    @Override
    public void onCatalystInstanceDestroy() {
        clearContextInjectedFlag();
        stopWebServer();
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

    private void startWebServer() {
        setupChromeDebugModeRealmJsContext();
        startWorker();

        webServer = new AndroidWebServer(DEFAULT_PORT, getReactApplicationContext());
        try {
            webServer.start();
            Log.i("Realm", "Starting the debugging WebServer, Host: " + webServer.getHostname() + " Port: " + webServer.getListeningPort());
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void startWorker() {
        workerThread = new HandlerThread("MyHandlerThread");
        workerThread.start();
        worker = new Handler(workerThread.getLooper());
        worker.postDelayed(new Runnable() {
            @Override
            public void run() {
                boolean stop = tryRunTask();
                if (!stop) {
                    worker.postDelayed(this, 10);
                }
            }
        }, 10);
    }

    private void stopWebServer() {
        if (webServer != null) {
             Log.i("Realm", "Stopping the webserver");
             webServer.stop();
        }

        if (workerThread != null) {
            workerThread.quit();
            workerThread = null;
        }
    }

    class AndroidWebServer extends NanoHTTPD {
        private ReactApplicationContext reactApplicationContext;

        public AndroidWebServer(int port, ReactApplicationContext reactApplicationContext) {
            super(port);
            this.reactApplicationContext = reactApplicationContext;
        }

        public AndroidWebServer(String hostname, int port, ReactApplicationContext reactApplicationContext) {
            super(hostname, port);
            this.reactApplicationContext = reactApplicationContext;
        }

        @Override
        public Response serve(IHTTPSession session) {
            final String cmdUri = session.getUri();
            final HashMap<String, String> map = new HashMap<String, String>();
            try {
                session.parseBody(map);
            } catch (IOException e) {
                e.printStackTrace();
            } catch (ResponseException e) {
                e.printStackTrace();
            }
            final String json = map.get("postData");
            if (json == null) {
                Response response = newFixedLengthResponse("");
                response.addHeader("Access-Control-Allow-Origin", "http://localhost:8081");
                return response;
            }  
            final String jsonResponse = processChromeDebugCommand(cmdUri, json);
           
            Response response = newFixedLengthResponse(jsonResponse);
            response.addHeader("Access-Control-Allow-Origin", "http://localhost:8081");
            return response;
        }
    }

    // return true if the Realm API was injected (return false when running in Chrome Debug)
    private native boolean isContextInjected();

    // clear the flag set when injecting Realm API
    private native void clearContextInjectedFlag();

    // fileDir: path of the internal storage of the application
    private native void setDefaultRealmFileDirectory(String fileDir, AssetManager assets);

    // responsible for creating the rpcServer that will accept the chrome Websocket command
    private native long setupChromeDebugModeRealmJsContext();

    // this receives one command from Chrome debug then return the processing we should post back
    private native String processChromeDebugCommand(String cmd, String args);

    // this receives one command from Chrome debug then return the processing we should post back
    private native boolean tryRunTask();
}
