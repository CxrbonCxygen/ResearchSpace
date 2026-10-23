package cn.researchspace.personal;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.webkit.*;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.util.HashMap;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class MainActivity extends Activity {
  private static final String HOST="appassets.androidplatform.net";
  private static final String CLOUD="researchspace-chenxin.cxrboncxygen.chatgpt.site";
  private WebView web;
  private final ExecutorService network=Executors.newFixedThreadPool(2);
  private ValueCallback<Uri[]> fileCallback;
  private String pendingFile,pendingMime;
  private boolean resumed=false;

  @Override public void onCreate(Bundle saved){
    super.onCreate(saved);
    getWindow().setStatusBarColor(Color.rgb(28,51,53));
    getWindow().setNavigationBarColor(Color.rgb(247,249,245));
    FrameLayout frame=new FrameLayout(this);frame.setBackgroundColor(Color.rgb(28,51,53));
    frame.setOnApplyWindowInsetsListener((v,insets)->{int top=insets.getSystemWindowInsetTop(),bottom=insets.getSystemWindowInsetBottom();v.setPadding(insets.getSystemWindowInsetLeft(),top,insets.getSystemWindowInsetRight(),bottom);return insets.consumeSystemWindowInsets();});
    web=new WebView(this);frame.addView(web,new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));setContentView(frame);
    WebView.setWebContentsDebuggingEnabled(false);
    WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setSupportMultipleWindows(false);settings.setMediaPlaybackRequiresUserGesture(true);
    web.addJavascriptInterface(new VaultBridge(),"ResearchSpaceAndroid");
    web.setWebViewClient(new WebViewClient(){
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){Uri uri=request.getUrl();
        if("https".equals(uri.getScheme())&&HOST.equals(uri.getHost())){
          String path=uri.getPath();if(path==null||!path.startsWith("/assets/")||path.contains(".."))return blocked();
          path=path.substring(8);if(path.isEmpty())path="index.html";
          try{InputStream stream=getAssets().open("web/"+path);String mime=mime(path);WebResourceResponse response=new WebResourceResponse(mime,"UTF-8",stream);HashMap<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-cache");headers.put("X-Content-Type-Options","nosniff");headers.put("Content-Security-Policy","default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src https://"+CLOUD+"; object-src 'none'; frame-src 'none'; base-uri 'none'");response.setResponseHeaders(headers);return response;}catch(IOException e){return blocked();}
        }
        if("https".equals(uri.getScheme())&&CLOUD.equals(uri.getHost()))return null;
        return blocked();
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if("https".equals(uri.getScheme())&&HOST.equals(uri.getHost())){if(request.isForMainFrame()&&(uri.getPath()==null||"/".equals(uri.getPath()))){view.loadUrl("https://"+HOST+"/assets/index.html");return true;}return false;}if("https".equals(uri.getScheme())||"http".equals(uri.getScheme())){try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){toast("没有可打开链接的浏览器");}}return true;}
      @Override public void onReceivedSslError(WebView view,android.webkit.SslErrorHandler handler,android.net.http.SslError error){handler.cancel();}
    });
    web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");try{startActivityForResult(intent,101);return true;}catch(Exception e){fileCallback=null;return false;}}});
    web.loadUrl("https://"+HOST+"/assets/index.html");
  }
  private static WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",new HashMap<>(),new ByteArrayInputStream(new byte[0]));}
  private static String mime(String path){if(path.endsWith(".html"))return "text/html";if(path.endsWith(".js"))return "application/javascript";if(path.endsWith(".css"))return "text/css";if(path.endsWith(".svg"))return "image/svg+xml";if(path.endsWith(".json"))return "application/json";if(path.endsWith(".woff2"))return "font/woff2";if(path.endsWith(".woff"))return "font/woff";if(path.endsWith(".ttf"))return "font/ttf";return "application/octet-stream";}
  private void toast(String text){runOnUiThread(()->Toast.makeText(this,text,Toast.LENGTH_LONG).show());}
  private SecretKey key()throws Exception{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias("researchspace-session")){KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");generator.init(new KeyGenParameterSpec.Builder("researchspace-session",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());generator.generateKey();}return (SecretKey)ks.getKey("researchspace-session",null);}
  public class VaultBridge {
    @JavascriptInterface public void request(String id,String path,String method,String body,String authorization){
      boolean trainingRead=path!=null&&"GET".equals(method)&&path.matches("/api/training(?:\\?run=[a-zA-Z0-9._%\\-]{1,450})?");
      if(id==null||!id.matches("[a-f0-9-]{36}")||path==null||(!path.matches("/api/(state|account/login|account/logout)")&&!trainingRead)||!method.matches("GET|POST|PUT")||body.length()>1800000){return;}
      network.execute(()->{int status=0;String result="";HttpURLConnection connection=null;try{
        connection=(HttpURLConnection)new URL("https://"+CLOUD+path).openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(10000);connection.setReadTimeout(15000);connection.setRequestMethod(method);connection.setRequestProperty("Content-Type","application/json");connection.setRequestProperty("Origin","https://"+CLOUD);if(authorization.matches("Bearer [a-f0-9]{64}"))connection.setRequestProperty("Authorization",authorization);
        if(!"GET".equals(method)){connection.setDoOutput(true);try(OutputStream out=connection.getOutputStream()){out.write(body.getBytes(StandardCharsets.UTF_8));}}
        status=connection.getResponseCode();InputStream input=status>=400?connection.getErrorStream():connection.getInputStream();if(input!=null){try(InputStream in=input;ByteArrayOutputStream buffer=new ByteArrayOutputStream()){byte[] chunk=new byte[8192];int n;while((n=in.read(chunk))!=-1){if(buffer.size()+n>2000000)throw new IOException("Response too large");buffer.write(chunk,0,n);}result=buffer.toString("UTF-8");}}
      }catch(Exception e){status=0;}finally{if(connection!=null)connection.disconnect();}
      final int code=status;final String text=result;runOnUiThread(()->{if(!isDestroyed())web.evaluateJavascript("window.__researchSpaceResponse("+JSONObject.quote(id)+","+code+","+JSONObject.quote(text)+")",null);});});
    }
    @JavascriptInterface public synchronized String getToken(){try{String saved=getSharedPreferences("private",MODE_PRIVATE).getString("session","");if(saved.isEmpty())return "";String[] parts=saved.split(":");Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));return new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8);}catch(Exception e){return "";}}
    @JavascriptInterface public synchronized void setToken(String value){try{SharedPreferences.Editor edit=getSharedPreferences("private",MODE_PRIVATE).edit();if(value==null||value.isEmpty()){edit.remove("session").commit();return;}if(!value.matches("[a-f0-9]{64}"))return;Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());edit.putString("session",Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP)).commit();}catch(Exception e){toast("登录凭据未能保存，请检查手机存储");}}
    @JavascriptInterface public void saveFile(String name,String text,String mime){if(text==null||text.length()>10000000){toast("导出内容过大");return;}runOnUiThread(()->{pendingFile=text;pendingMime=mime;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(mime);intent.putExtra(Intent.EXTRA_TITLE,name);try{startActivityForResult(intent,102);}catch(Exception e){pendingFile=null;toast("无法打开文件保存窗口");}});}
  }
  @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==101){if(fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);fileCallback=null;}}else if(request==102){if(result==RESULT_OK&&data!=null&&data.getData()!=null&&pendingFile!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(pendingFile.getBytes(StandardCharsets.UTF_8));toast("文件已保存");}catch(Exception e){toast("文件未能保存");}}pendingFile=null;}}
  @Override protected void onResume(){super.onResume();if(web!=null&&resumed)web.evaluateJavascript("window.dispatchEvent(new Event('focus'))",null);resumed=true;}
  @Override public void onBackPressed(){web.evaluateJavascript("(function(){const d=document.querySelector('dialog[open]');if(d){d.dispatchEvent(new Event('cancel',{cancelable:true}));return true;}return false;})()",result->{if(!"true".equals(result)){if(web.canGoBack())web.goBack();else finish();}});}
  @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);network.shutdownNow();web.removeJavascriptInterface("ResearchSpaceAndroid");web.destroy();super.onDestroy();}
}
