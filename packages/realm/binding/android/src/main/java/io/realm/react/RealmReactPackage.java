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

import android.content.res.AssetManager;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.soloader.SoLoader;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

public class RealmReactPackage implements ReactPackage {
  static {
    SoLoader.loadLibrary("realm");
  }

  /**
   * Used to create a native AssetManager in C++ in order to load file from APK
   * Note: We keep a VM reference to the assetManager to prevent its being garbage collected while the native object is in use.
   * See: http://developer.android.com/ndk/reference/group___asset.html#gadfd6537af41577735bcaee52120127f4
   */
  @SuppressWarnings("FieldCanBeLocal")
  private AssetManager assetManager;

  @NonNull
  @Override
  public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext context) {
    // Tell the native module where to store database files and from where to load bundled database files
    assetManager = context.getResources().getAssets();
    try {
      setDefaultRealmFileDirectoryImpl(context.getFilesDir().getCanonicalPath(), assetManager);
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
    return Collections.emptyList();
  }

  @NonNull
  @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext context) {
    return Collections.emptyList();
  }

  /**
   * @param fileDir Path of the internal storage of the application
   * @param assetManager Manager used when restoring database files from the application assets
   */
  private native void setDefaultRealmFileDirectoryImpl(String fileDir, AssetManager assetManager);
}
