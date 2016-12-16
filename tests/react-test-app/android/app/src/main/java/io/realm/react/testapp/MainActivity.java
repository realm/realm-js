package io.realm.react.testapp;

import android.annotation.TargetApi;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.PowerManager;
import android.util.Log;
import android.view.WindowManager;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.concurrent.TimeUnit;

public class MainActivity extends ReactActivity {
    private static final String TAG = "AndroidReactTests";
    private PowerManager.WakeLock wakeLock;
    private Handler handler;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MyWakelockTag");
        wakeLock.acquire();

        handler = new Handler();

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
        Log.d(TAG, "Registering listeners to wait for the Catalyst to become available: isAwake: " + isAwake());

        getReactInstanceManager().addReactInstanceEventListener(new ReactInstanceManager.ReactInstanceEventListener() {
            @Override
            public void onReactContextInitialized(final ReactContext context) {
                Log.d(TAG, "ReactContext is available: " + context + " : isAwake: " + isAwake());

                context.addLifecycleEventListener(new LifecycleEventListener() {
                    @Override
                    public void onHostResume() {
                        Log.d(TAG, "LifecycleEventListener onHostResume: isAwake: " + isAwake());
                        // Signal to JS that the Realm module is ready.
                        // this is helpful for testing scenario for example, to trigger
                        // running tests form JS side.
                        if (context.hasActiveCatalystInstance()) {
                            Log.d(TAG, "Catalyst is active. : isAwake: " + isAwake());
                            context
                                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                                    .emit("REALM_MODULE_LOADED", null);//TODO use constant
                        } else {
                            Log.d(TAG, "Catalyst is not active. : isAwake: " + isAwake());
                            // schedule another run in 2 seconds
                            final Runnable runnable = new Runnable() {
                                @Override
                                public void run() {
                                    if (context.hasActiveCatalystInstance()) {
                                        Log.d(TAG, "Retry: Catalyst is active. : isAwake: " + isAwake());
                                        context
                                                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                                                .emit("REALM_MODULE_LOADED", null);//TODO use constant
                                    } else {
                                        Log.d(TAG, "Retry: Catalyst is not active. : isAwake: " + isAwake());
                                        handler.postDelayed(this, TimeUnit.SECONDS.toMillis(2));
                                    }
                                }
                            };

                            handler.postDelayed(runnable, TimeUnit.SECONDS.toMillis(2));
                        }
                    }

                    @Override
                    public void onHostPause() {
                        Log.d(TAG, "LifecycleEventListener onHostPause. : isAwake: " + isAwake());
                    }

                    @Override
                    public void onHostDestroy() {
                        Log.d(TAG, "LifecycleEventListener onHostDestroy. : isAwake: " + isAwake());
                    }
                });
            }
        });
    }

    @TargetApi(Build.VERSION_CODES.KITKAT_WATCH)
    private boolean isAwake() {
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        boolean isSceenAwake = (Build.VERSION.SDK_INT < 20 ? powerManager.isScreenOn() : powerManager.isInteractive());
        return isSceenAwake;
    }
}
