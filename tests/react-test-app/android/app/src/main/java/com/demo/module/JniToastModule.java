package com.demo.module;

import android.widget.Toast;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.reacttests.API;

import java.util.HashMap;
import java.util.Map;

/**
 * Created by Nabil on 30/11/15.
 */
public class JniToastModule extends ReactContextBaseJavaModule {
    private static final String DURATION_SHORT_KEY = "SHORT";
    private static final String DURATION_LONG_KEY = "LONG";

    public JniToastModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "JniToastAndroid";
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
                .append(API.getDefaultRealmFileDirectory());
        Toast.makeText(getReactApplicationContext(), sb.toString(), duration).show();
    }

    static {
        System.loadLibrary("realmreact");
    }
}
