package com.reacttests;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.getkeepsafe.relinker.ReLinker;
import java.util.Map;
import java.util.HashMap;
import android.widget.Toast;
import com.facebook.react.bridge.Callback;
import android.util.Log;
import java.io.IOException;
import java.util.Map;
import fi.iki.elonen.NanoHTTPD;

public class RealmReactAndroid extends ReactContextBaseJavaModule {
	private static final String DURATION_SHORT_KEY = "SHORT";
    private static final String DURATION_LONG_KEY = "LONG";
    private String filesDirPath;

    private static final int DEFAULT_PORT = 8082;
    private AndroidWebServer webServer;
    private long rpcServerPtr;

	public RealmReactAndroid(ReactApplicationContext reactContext) {
		super(reactContext);
        try {
            filesDirPath = getReactApplicationContext().getFilesDir().getCanonicalPath();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
		ReLinker.loadLibrary(reactContext, "realmreact");
    }

    @Override
    public String getName() {
        return "RealmReactAndroid";
    }

    @Override
    public Map<String, Object> getConstants() {
        long contexts = injectRealmJsContext(filesDirPath);
        Log.w("RealmReactAndroid", "Initialized " + contexts + " contexts");
        if (contexts == 0) {
            startWebServer();
        }
        return new HashMap<>();
    }

    @Override
    public void onCatalystInstanceDestroy() {
       if (webServer != null) {
            Log.w("RealmReactAndroid", "Stopping the webserver");
            webServer.stop();
       }
    }
    // @ReactMethod
    // public void setUpChromeDebugMode() {
    //     startWebServer();
    //     // setupChromeDebugModeRealmJsContext();
    // }
    ///FIXME find the right callback to call webServerstop
    private void startWebServer() {
        rpcServerPtr = setupChromeDebugModeRealmJsContext();
        webServer = new AndroidWebServer(DEFAULT_PORT);
        try {
            webServer.start();
            Log.w("RealmReactAndroid", "Starting WebServer, Host: " + webServer.getHostname() + " Port: " + webServer.getListeningPort());
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    // WebServer
    class AndroidWebServer extends NanoHTTPD {
        public AndroidWebServer(int port) {
            super(port);
        }

        public AndroidWebServer(String hostname, int port) {
            super(hostname, port);
        }

        @Override
        public Response serve(IHTTPSession session) {
            String cmdUri = session.getUri();
            Log.w("AndroidWebServer", "Session Uri: " + cmdUri + " Mehtod: " + session.getMethod().name());
            // String msg = "<html><body><h1>Hello server</h1>\n";
            // Map<String, String> parms = session.getParms();
            // if (parms.get("username") == null) {
            //     msg += "<form action='?' method='get'>\n  <p>Your name: <input type='text' name='username'></p>\n" + "</form>\n";
            // } else {
            //     msg += "<p>Hello, " + parms.get("username") + "!</p>";
            // }
            // return newFixedLengthResponse( msg + "</body></html>\n" );
            final HashMap<String, String> map = new HashMap<String, String>();
            try {
                session.parseBody(map);
            } catch (IOException e) {
                e.printStackTrace();
            } catch (ResponseException e) {
                e.printStackTrace();
            }
            final String json = map.get("postData");
            String jsonResponse = processChromeDebugCommand(rpcServerPtr, cmdUri, json);
            Response response = newFixedLengthResponse(jsonResponse);
            response.addHeader("Access-Control-Allow-Origin", "http://localhost:8081");
            return response;
        }    
    }

    // fileDir: path of the internal storage of the application
	private native long injectRealmJsContext(String fileDir);
    // responsible for creating the rpcServer that will accept thw chrome Websocket command
    private native long setupChromeDebugModeRealmJsContext();
    // this receives one command from Chrome debug, & return the processing we should post back
    private native String processChromeDebugCommand(long rpcServerPointer, String cmd, String args);
}
