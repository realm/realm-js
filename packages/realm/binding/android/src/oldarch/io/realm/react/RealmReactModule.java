/*
 * Copyright 2018 Realm Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package io.realm.react;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.OptIn;

import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.common.annotations.UnstableReactNativeAPI;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;


@ReactModule(name = RealmReactModule.NAME) @FrameworkAPI @OptIn(markerClass = UnstableReactNativeAPI.class)
class RealmReactModule extends ReactContextBaseJavaModule {
    public static final String NAME = "Realm";

    public RealmReactModule(ReactApplicationContext reactContext) {
        super(reactContext);
        JavaScriptContextHolder jsContext = getReactApplicationContext().getJavaScriptContextHolder();
        synchronized(jsContext) {
            // Pass the React Native jsCallInvokerHolder over to C++, so that we can access the invokeAsync
            // method which we use to flush the React Native UI queue whenever we call from C++ to JS.
            RealmReactPackage.injectModuleIntoJSGlobal(jsContext.get());
        }
    }

    @Override
    public void initialize() {
        CallInvokerHolderImpl callInvokerHolder = (CallInvokerHolderImpl) getReactApplicationContext().getCatalystInstance().getJSCallInvokerHolder();
        RealmReactPackage.injectCallInvoker(callInvokerHolder);
    }

    @Override
    public void invalidate() {
        RealmReactPackage.invalidateCaches();
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }
}
