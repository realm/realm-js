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

public class RealmReactAndroid extends ReactContextBaseJavaModule {
	private static final String DURATION_SHORT_KEY = "SHORT";
    private static final String DURATION_LONG_KEY = "LONG";

	public RealmReactAndroid(ReactApplicationContext reactContext) {
		super(reactContext);
		ReLinker.loadLibrary(reactContext, "realmreact");
    }

    @Override
    public void initialize() {
        Log.w("RealmReactAndroid", injectRealmJsContext());
    }

    @Override
    public String getName() {
        return "RealmReactAndroid";
    }

	@Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put(DURATION_SHORT_KEY, Toast.LENGTH_SHORT);
        constants.put(DURATION_LONG_KEY, Toast.LENGTH_LONG);
        return constants;
    }

    @ReactMethod
    public void resultOfJsContextInjection(Callback successCallback) {
        // Inject our JS Context
        successCallback.invoke(injectRealmJsContext());
    }

    @ReactMethod
    public void show(String message, int duration) {
        Toast.makeText(getReactApplicationContext(), message, duration).show();
    }

	private native String injectRealmJsContext();
}
