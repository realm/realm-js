package io.realm.react.testapp;

import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;
import android.view.WindowManager;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class MainActivity extends ReactActivity {
    private static final String TAG = "AndroidReactTests";
    private PowerManager.WakeLock wakeLock;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MyWakelockTag");
        wakeLock.acquire();

        emitRealmModuleLoadedEvent();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        wakeLock.release();
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "ReactTests";
    }

    private void emitRealmModuleLoadedEvent () {
        Log.d(TAG, "Registering listeners to wait for the Catalyst to become available");

        getReactInstanceManager().addReactInstanceEventListener(new ReactInstanceManager.ReactInstanceEventListener() {
            @Override
            public void onReactContextInitialized(final ReactContext context) {
                Log.d(TAG, "ReactContext is available: " + context);

                context.addLifecycleEventListener(new LifecycleEventListener() {
                    @Override
                    public void onHostResume() {
                        Log.d(TAG, "LifecycleEventListener onHostResume.");
                        // Signal to JS that the Realm module is ready.
                        // this is helpful for testing scenario for example, to trigger
                        // running tests form JS side.
                        if (context.hasActiveCatalystInstance()) {
                            Log.d(TAG, "Catalyst is active.");
                            context
                                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                                    .emit("REALM_MODULE_LOADED", null);//TODO use constant
                        } else {
                            Log.d(TAG, "Catalyst is not active.");
                        }
                    }

                    @Override
                    public void onHostPause() {
                        Log.d(TAG, "LifecycleEventListener onHostPause.");
                    }

                    @Override
                    public void onHostDestroy() {
                        Log.d(TAG, "LifecycleEventListener onHostDestroy.");
                    }

                });
            }
        });
    }
}
