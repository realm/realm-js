package io.realm.react;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.util.Map;
import java.util.HashMap;
import android.widget.Toast;
import com.facebook.react.bridge.Callback;
import android.util.Log;
import java.io.IOException;
import java.util.Map;
import fi.iki.elonen.NanoHTTPD;
import android.os.Handler;
import android.os.Looper;
import java.util.concurrent.CountDownLatch;
import com.facebook.soloader.SoLoader;

public class RealmReactAndroid extends ReactContextBaseJavaModule {
	private static final String DURATION_SHORT_KEY = "SHORT";
    private static final String DURATION_LONG_KEY = "LONG";
    private String filesDirPath;

    private static final int DEFAULT_PORT = 8082;
    private AndroidWebServer webServer;
    private long rpcServerPtr;
		private Handler handler = new Handler(Looper.getMainLooper());

	public RealmReactAndroid(ReactApplicationContext reactContext) {
		super(reactContext);
        try {
            filesDirPath = getReactApplicationContext().getFilesDir().getCanonicalPath();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
			SoLoader.loadLibrary("realmreact");
    }

    @Override
    public String getName() {
        return "RealmReactAndroid";
    }

    @Override
    public Map<String, Object> getConstants() {
        long contexts = injectRealmJsContext(filesDirPath);
        Log.i("RealmReactAndroid", "Initialized " + contexts + " contexts");
        if (contexts == 0) {// we're running in Chrome debug mode
            startWebServer();
        }
        return new HashMap<>();
    }

    @Override
    public void onCatalystInstanceDestroy() {
       if (webServer != null) {
            Log.i("RealmReactAndroid", "Stopping the webserver");
            webServer.stop();
       }
    }
    private void startWebServer() {
        rpcServerPtr = setupChromeDebugModeRealmJsContext();
        webServer = new AndroidWebServer(DEFAULT_PORT);
        try {
            webServer.start();
            Log.i("RealmReactAndroid", "Starting WebServer, Host: " + webServer.getHostname() + " Port: " + webServer.getListeningPort());
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
            final String cmdUri = session.getUri();
            Log.v("AndroidWebServer", "Session Uri: " + cmdUri + " Mehtod: " + session.getMethod().name());
            final HashMap<String, String> map = new HashMap<String, String>();
            try {
                session.parseBody(map);
            } catch (IOException e) {
                e.printStackTrace();
            } catch (ResponseException e) {
                e.printStackTrace();
            }
            final String json = map.get("postData");
						Log.v("AndroidWebServer", "Post Data: \n" + json + "\n Thread id: " + Thread.currentThread().getName());
						final String[] jsonResponse = new String[1];
						final CountDownLatch latch = new CountDownLatch(1);
						// Process the command on the UI thread
						handler.post(new Runnable() {
		            @Override
		            public void run() {
		                	jsonResponse[0] = processChromeDebugCommand(rpcServerPtr, cmdUri, json);
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
	  private native long injectRealmJsContext(String fileDir);
    // responsible for creating the rpcServer that will accept thw chrome Websocket command
    private native long setupChromeDebugModeRealmJsContext();
    // this receives one command from Chrome debug, & return the processing we should post back
    private native String processChromeDebugCommand(long rpcServerPointer, String cmd, String args);
}
