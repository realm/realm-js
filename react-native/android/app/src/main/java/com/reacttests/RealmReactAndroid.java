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

public class RealmReactAndroid extends ReactContextBaseJavaModule {
	private static final String DURATION_SHORT_KEY = "SHORT";
    private static final String DURATION_LONG_KEY = "LONG";

	public RealmReactAndroid(ReactApplicationContext reactContext) {
		super(reactContext);
		ReLinker.loadLibrary(reactContext, "realmreact");
        getDefaultRealmFileDirectory();
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
    public void show(String message, int duration) {
        StringBuilder sb = new StringBuilder("String from Java: ")
                .append(message)
                .append("\n")
                .append("String from JNI: ")
                .append(getDefaultRealmFileDirectory());
        Toast.makeText(getReactApplicationContext(), sb.toString(), duration).show();
    }

	public static native String getDefaultRealmFileDirectory();
}
