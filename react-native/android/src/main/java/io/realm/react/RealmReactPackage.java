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

import com.facebook.react.ReactPackage;
import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

public class RealmReactPackage extends TurboReactPackage implements ReactPackage {
    @Override
    public NativeModule getModule(String name, final ReactApplicationContext reactContext) {
        if (name.equals(RealmReactModule.NAME)) {
            return new RealmReactModule(reactContext);
        } else {
            return null;
        }
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return new ReactModuleInfoProvider() {
            @Override
            public Map<String, ReactModuleInfo> getReactModuleInfos() {
                Map reactModuleInfoMap = new HashMap();
                reactModuleInfoMap.put(RealmReactModule.NAME, new ReactModuleInfo(
                        RealmReactModule.NAME,
                        "io.realm.react.RealmReactModule",
                        false,
                        false,
                        false,
                        false, // TODO: Should we be using this?
                        true
                ));
                return reactModuleInfoMap;
            }
        };
    }
}
