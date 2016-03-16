package io.realm.react;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.soloader.SoLoader;

import java.io.IOException;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;

import fi.iki.elonen.NanoHTTPD;

public class RealmReactModule extends ReactContextBaseJavaModule {
    private static final int DEFAULT_PORT = 8082;
    private static boolean sentAnalytics = false;

    private AndroidWebServer webServer;
    private Handler handler = new Handler(Looper.getMainLooper());

    static {
        SoLoader.loadLibrary("realmreact");
    }

    public RealmReactModule(ReactApplicationContext reactContext) {
        super(reactContext);

        String fileDir;
        try {
            fileDir = reactContext.getFilesDir().getCanonicalPath();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }

        setDefaultRealmFileDirectory(fileDir);

        // Attempt to send analytics info only once, and only if allowed to do so.
        if (!sentAnalytics && RealmAnalytics.shouldExecute()) {
            sentAnalytics = true;

            RealmAnalytics analytics = RealmAnalytics.getInstance(reactContext.getApplicationInfo());
            analytics.execute();
        }
    }

    @Override
    public String getName() {
        return "Realm";
    }

    @Override
    public Map<String, Object> getConstants() {
        if (isContextInjected()) {
            // No constants are needed if *not* running in Chrome debug mode.
            return Collections.EMPTY_MAP;
        }

        startWebServer();

        List<String> hosts;
        if (RealmAnalytics.isRunningOnEmulator()) {
            hosts = Arrays.asList(new String[]{"localhost"});
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
        webServer = new AndroidWebServer(DEFAULT_PORT);
        try {
            webServer.start();
            Log.i("Realm", "Starting the debugging WebServer, Host: " + webServer.getHostname() + " Port: " + webServer.getListeningPort());
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void stopWebServer() {
        if (webServer != null) {
             Log.i("Realm", "Stopping the webserver");
             webServer.stop();
        }
    }

    class AndroidWebServer extends NanoHTTPD {
        public AndroidWebServer(int port) {
            super(port);
        }

        public AndroidWebServer(String hostname, int port) {
            super(hostname, port);
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
            final String[] jsonResponse = new String[1];
            final CountDownLatch latch = new CountDownLatch(1);
            // Process the command on the UI thread
            handler.post(new Runnable() {
                @Override
                public void run() {
                    jsonResponse[0] = processChromeDebugCommand(cmdUri, json);
                    latch.countDown();
                }
            });
            try {
                latch.await();
                Response response = newFixedLengthResponse(jsonResponse[0]);
                response.addHeader("Access-Control-Allow-Origin", "http://localhost:8081");
                return response;
            } catch (InterruptedException e) {
                e.printStackTrace();
                return null;
            }
        }
    }

    // return true if the Realm API was injected (return false when running in Chrome Debug)
    private native boolean isContextInjected();

    // clear the flag set when injecting Realm API
    private native void clearContextInjectedFlag();

    // fileDir: path of the internal storage of the application
    private native void setDefaultRealmFileDirectory(String fileDir);

    // responsible for creating the rpcServer that will accept the chrome Websocket command
    private native long setupChromeDebugModeRealmJsContext();

    // this receives one command from Chrome debug then return the processing we should post back
    private native String processChromeDebugCommand(String cmd, String args);
}
