package com.devcguild.apptech;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import com.igaworks.adpopcorn.Adpopcorn;
import com.igaworks.adpopcorn.interfaces.IAdPOPcornEventListener;

import java.io.ByteArrayInputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

public final class MainActivity extends Activity {
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + ASSET_HOST + "/assets/index.html";
    private static final String HTML_POLICY = "default-src 'self'; script-src 'self'; "
        + "style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; "
        + "font-src 'self' data: https:; connect-src https:; frame-src 'none'; "
        + "object-src 'none'; base-uri 'self'; form-action 'none'";

    private WebView webView;
    private volatile boolean trustedDocument;
    private volatile boolean resumed;
    private volatile boolean destroyed;
    private boolean keysConfigured;
    private boolean pausedForOfferwall;
    private final AtomicBoolean offerwallPending = new AtomicBoolean(false);

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        keysConfigured = !getString(R.string.adpopcorn_app_key).trim().isEmpty()
            && !getString(R.string.adpopcorn_hash_key).trim().isEmpty();
        FrameLayout container = new FrameLayout(this);
        container.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        webView = new WebView(this);
        container.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(container);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        if (Build.VERSION.SDK_INT >= 26) {
            settings.setSafeBrowsingEnabled(true);
        }
        // Only packaged HTML can host the bridge. Its CSP blocks every frame,
        // remote script, form and object, including otherwise privileged iframes.
        WebViewAssetLoader.AssetsPathHandler assets = new WebViewAssetLoader.AssetsPathHandler(this);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", path -> assets.handle(
                path.endsWith("/") ? path + "index.html" : path))
            .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                trustedDocument = isTrusted(Uri.parse(url));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isTrusted(uri)) {
                    return false;
                }
                if (request.isForMainFrame() && "https".equalsIgnoreCase(uri.getScheme())) {
                    openExternal(uri);
                }
                return true;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isTrusted(uri)) {
                    WebResourceResponse response = loader.shouldInterceptRequest(uri);
                    if (response == null) {
                        return blockedResponse();
                    }
                    if ("text/html".equals(response.getMimeType())) {
                        Map<String, String> headers = new HashMap<>();
                        headers.put("Content-Security-Policy", HTML_POLICY);
                        headers.put("X-Content-Type-Options", "nosniff");
                        response.setResponseHeaders(headers);
                    }
                    return response;
                }
                if (request.isForMainFrame() || !"https".equalsIgnoreCase(uri.getScheme())
                        || ASSET_HOST.equalsIgnoreCase(uri.getHost())) {
                    return blockedResponse();
                }
                // HTTPS API/image requests may use the normal network stack.
                return null;
            }
        });
        webView.addJavascriptInterface(new RewardsBridge(), "ApptechRewards");
        webView.loadUrl(START_URL);
    }

    private static boolean isTrusted(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme())
            && ASSET_HOST.equalsIgnoreCase(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443)
            && uri.getUserInfo() == null
            && uri.getPath() != null && uri.getPath().startsWith("/assets/");
    }

    private static WebResourceResponse blockedResponse() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
            new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (ActivityNotFoundException ignored) {
            Toast.makeText(this, "링크를 열 브라우저가 없어요", Toast.LENGTH_SHORT).show();
        }
    }

    private final class RewardsBridge {
        @JavascriptInterface
        public String getStatus() {
            return "{\"platform\":\"android\",\"configured\":"
                + (keysConfigured && trustedDocument && !destroyed) + "}";
        }

        @JavascriptInterface
        public boolean openOfferwall(String usn) {
            if (!keysConfigured || !trustedDocument || !resumed || destroyed || usn == null) {
                return false;
            }
            try {
                if (!UUID.fromString(usn).toString().equals(usn)) {
                    return false;
                }
            } catch (IllegalArgumentException invalidId) {
                return false;
            }
            if (!offerwallPending.compareAndSet(false, true)) {
                return false;
            }
            runOnUiThread(() -> {
                if (destroyed || !resumed || !trustedDocument) {
                    notifyOfferwallClosed();
                    return;
                }
                try {
                    Adpopcorn.setEventListener(MainActivity.this, new IAdPOPcornEventListener() {
                        @Override public void OnClosedOfferWallPage() { notifyOfferwallClosed(); }
                        @Override public void OnAgreePrivacy() { }
                        @Override public void OnDisagreePrivacy() { notifyOfferwallClosed(); }
                        @Override public void OnCompletedCampaign() { }
                    });
                    Adpopcorn.setUserId(MainActivity.this, usn);
                    Adpopcorn.openOfferwall(MainActivity.this);
                } catch (RuntimeException failure) {
                    Toast.makeText(MainActivity.this, "광고를 열지 못했어요. 다시 시도해 주세요",
                        Toast.LENGTH_SHORT).show();
                    notifyOfferwallClosed();
                }
            });
            return true;
        }
    }

    private void notifyOfferwallClosed() {
        if (!offerwallPending.getAndSet(false)) {
            return;
        }
        pausedForOfferwall = false;
        runOnUiThread(() -> {
            if (!destroyed && trustedDocument) {
                webView.evaluateJavascript(
                    "window.dispatchEvent(new Event('apptech:offerwall-closed'))", null);
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        resumed = true;
        if (webView != null) {
            webView.onResume();
        }
        if (pausedForOfferwall) {
            notifyOfferwallClosed();
        }
    }

    @Override
    protected void onPause() {
        resumed = false;
        pausedForOfferwall = offerwallPending.get();
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        trustedDocument = false;
        webView.removeJavascriptInterface("ApptechRewards");
        webView.stopLoading();
        ((ViewGroup) webView.getParent()).removeView(webView);
        webView.destroy();
        super.onDestroy();
    }
}
