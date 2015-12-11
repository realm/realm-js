package com.reacttests;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.Map;

public class RealmReactAndroid extends ReactContextBaseJavaModule {

	public RealmReactAndroid(ReactApplicationContext reactContext) {
		super(reactContext);
        getDefaultRealmFileDirectory();
    }

    @Override
    public String getName() {
        return "RealmReactAndroid";
    }

	public static native String getDefaultRealmFileDirectory();
}
