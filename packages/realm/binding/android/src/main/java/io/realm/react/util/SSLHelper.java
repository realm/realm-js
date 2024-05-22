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

package io.realm.react.util;

import android.util.Log;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;

import okhttp3.internal.tls.OkHostnameVerifier;

public class SSLHelper {
    private final static String TAG = "REALM SSLHelper";
    // Holds the certificate chain (per hostname). We need to keep the order of each certificate
    // according to it's depth in the chain. The depth of the last
    // certificate is 0. The depth of the first certificate is chain
    // length - 1.
    private static HashMap<String, List<String>> ROS_CERTIFICATES_CHAIN;

    // The default Android Trust Manager which uses the default KeyStore to
    // validate the certificate chain.
    private static X509TrustManager TRUST_MANAGER;

    // Help transform a String PEM representation of the certificate, into
    // X509Certificate format.
    private static CertificateFactory CERTIFICATE_FACTORY;

    // From Sync implementation:
    //  A recommended way of using the callback function is to return true
    //  if preverify_ok = 1 and depth > 0,
    //  always check the host name if depth = 0,
    //  and use an independent verification step if preverify_ok = 0.
    //
    //  Another possible way of using the callback is to collect all the
    //  ROS_CERTIFICATES_CHAIN until depth = 0, and present the entire chain for
    //  independent verification.
    //
    // In this implementation we use the second method, since it's more suitable for
    // the underlying Java API we need to call to validate the certificate chain.

    public synchronized static boolean certificateVerifier(String serverAddress, String pemData, int depth) {
        try {
            if (ROS_CERTIFICATES_CHAIN == null) {
                ROS_CERTIFICATES_CHAIN = new HashMap<>();
                TRUST_MANAGER = systemDefaultTrustManager();
                CERTIFICATE_FACTORY = CertificateFactory.getInstance("X.509");
            }

            if (!ROS_CERTIFICATES_CHAIN.containsKey(serverAddress)) {
                ROS_CERTIFICATES_CHAIN.put(serverAddress, new ArrayList<String>());
            }

            ROS_CERTIFICATES_CHAIN.get(serverAddress).add(pemData);

            if (depth == 0) {
                // transform all PEM ROS_CERTIFICATES_CHAIN into Java X509
                // with respecting the order/depth provided from Sync.
                List<String> pemChain = ROS_CERTIFICATES_CHAIN.get(serverAddress);
                int n = pemChain.size();
                X509Certificate[] chain = new X509Certificate[n];
                for (String pem : pemChain) {
                    // The depth of the last certificate is 0.
                    // The depth of the first certificate is chain length - 1.
                    chain[--n] = buildCertificateFromPEM(pem);
                }

                // verify the entire chain
                try {
                    TRUST_MANAGER.checkServerTrusted(chain, "RSA");
                    // verify the hostname
                    boolean isValid = OkHostnameVerifier.INSTANCE.verify(serverAddress, chain[0]);
                    if (isValid) {
                        return true;
                    } else {
                        Log.e(TAG, "Can not verify the hostname for the host: " + serverAddress);
                        return false;
                    }
                } catch (CertificateException e) {
                    Log.e(TAG, "Can not validate SSL chain certificate for the host: " + serverAddress, e);
                    return false;
                } finally {
                    // don't keep the certificate chain in memory
                    ROS_CERTIFICATES_CHAIN.remove(serverAddress);
                }
            } else {
                // return true, since the verification will happen for the entire chain
                // when receiving the depth == 0 (host certificate)
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error during certificate validation for host: " + serverAddress, e);
            return false;
        }
    }

    // Credit OkHttp https://github.com/square/okhttp/blob/e5c84e1aef9572adb493197c1b6c4e882aca085b/okhttp/src/main/java/okhttp3/OkHttpClient.java#L270
    private static X509TrustManager systemDefaultTrustManager() {
        try {
            TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(
                    TrustManagerFactory.getDefaultAlgorithm());
            trustManagerFactory.init((KeyStore) null);
            TrustManager[] trustManagers = trustManagerFactory.getTrustManagers();
            if (trustManagers.length != 1 || !(trustManagers[0] instanceof X509TrustManager)) {
                throw new IllegalStateException("Unexpected default trust managers:"
                        + Arrays.toString(trustManagers));
            }
            return (X509TrustManager) trustManagers[0];
        } catch (GeneralSecurityException e) {
            throw new AssertionError(); // The system has no TLS. Just give up.
        }
    }

    private static X509Certificate buildCertificateFromPEM(String pem) throws IOException, CertificateException {
        InputStream stream = null;
        try {
            stream = new ByteArrayInputStream(pem.getBytes("UTF-8"));
            return (X509Certificate) CERTIFICATE_FACTORY.generateCertificate(stream);
        } finally {
            if (stream != null) {
                stream.close();
            }
        }
    }
}
