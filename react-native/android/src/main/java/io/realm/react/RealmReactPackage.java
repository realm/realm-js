package io.realm.react;

import android.content.Context;
import android.content.res.AssetManager;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.JavaScriptModule;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.channels.Channels;
import java.nio.channels.FileChannel;
import java.nio.channels.ReadableByteChannel;
import java.util.Collections;
import java.util.List;

public class RealmReactPackage implements ReactPackage {
    private final static String REALM_FILE_FILTER = ".realm";

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        return Collections.<NativeModule>singletonList(new RealmReactModule(reactContext));
    }

    @Override
    public List<Class<? extends JavaScriptModule>> createJSModules() {
        return Collections.emptyList();
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    public static void copyRealmsFromAsset(final Context context) {
        try {
            final AssetManager assets = context.getAssets();
            String[] list = assets.list("");
            File file = null;
            for (String asset : list) {
                //FIXME instead check if the file exist with the .management extension
                //      ex: dates-v3.realm.management
                if (asset.endsWith(REALM_FILE_FILTER) && !(file = new File(context.getFilesDir(), asset)).exists()) {
                    copyFromAsset(assets, asset, file);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static void copyFromAsset(AssetManager assets, String realmFile, File destination) {

        ReadableByteChannel inChannel = null;
        FileChannel outChannel = null;
        boolean newFileCreated = false;
        try {
            newFileCreated = destination.createNewFile();
            inChannel = Channels.newChannel(assets.open(realmFile));
            FileOutputStream fileOutputStream = new FileOutputStream(destination);
            outChannel = fileOutputStream.getChannel();

            long offset = 0;
            long quantum = 1024 * 1024;
            long count;
            while ((count = outChannel.transferFrom(inChannel, offset, quantum)) > 0) {
                offset += count;
            }

        } catch (IOException e) {
            e.printStackTrace();
            // try to remove the empty file created
            if (newFileCreated) {
                destination.delete();
            }

        } finally {
            if (inChannel != null) {
                try {
                    inChannel.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            if (outChannel != null) {
                try {
                    outChannel.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }

}