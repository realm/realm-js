package io.realm.react;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.soloader.SoLoader;

import java.io.IOException;
import java.lang.IllegalStateException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;

import fi.iki.elonen.NanoHTTPD;

public class RealmReactModule extends ReactContextBaseJavaModule {
    private static final int DEFAULT_PORT = 8082;

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
    }

    @Override
    public String getName() {
        return "Realm";
    }

    @Override
    public Map<String, Object> getConstants() {
        // FIXME: Only start web server when in Chrome debug mode!
        startWebServer();
        return Collections.EMPTY_MAP;
    }

    @Override
    public void onCatalystInstanceDestroy() {
        stopWebServer();
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

    // fileDir: path of the internal storage of the application
    private native void setDefaultRealmFileDirectory(String fileDir);

    // responsible for creating the rpcServer that will accept the chrome Websocket command
    private native long setupChromeDebugModeRealmJsContext();

    // this receives one command from Chrome debug then return the processing we should post back
    private native String processChromeDebugCommand(String cmd, String args);
}
