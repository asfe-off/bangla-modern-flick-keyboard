package dev.banglaflick.test;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.inputmethodservice.InputMethodService;
import android.media.AudioManager;
import android.os.*;
import android.text.InputType;
import android.view.*;
import android.view.inputmethod.*;
import android.webkit.*;
import android.widget.FrameLayout;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Offline input service. All editor operations stay on the Android main thread. */
public final class FlickInputService extends InputMethodService {
    private static final String ORIGIN="https://appassets.androidplatform.net/";
    private final Handler main=new Handler(Looper.getMainLooper());
    private WebView browser;
    private FrameLayout container;
    private boolean ready=false,active=false,secure=false,noLearning=false,editorReadable=true;
    private int session=0,revision=0,selectionStart=0,selectionEnd=0,absoluteStart=0,absoluteEnd=0,offset=0;
    private String shadow="",kind="text";
    private EncryptedPreferences encryptedPreferences;
    private final ExecutorService preferenceWriter=Executors.newSingleThreadExecutor();
    private long visualState=0;
    private final Runnable refresh=()->{if(active){captureEditor();publish(true);}};
    @Override public boolean onEvaluateFullscreenMode(){return false;}
    @Override public boolean onEvaluateInputViewShown(){return true;}

    @SuppressLint({"SetJavaScriptEnabled","AddJavascriptInterface"})
    @Override public View onCreateInputView(){
        ready=false;session++;revision=0;if(browser!=null){browser.removeJavascriptInterface("AndroidKeyboard");if(browser.getParent() instanceof ViewGroup)((ViewGroup)browser.getParent()).removeView(browser);browser.destroy();}
        container=new FrameLayout(this);container.setBackgroundColor(Color.rgb(40,40,40));
        browser=new WebView(this);browser.setBackgroundColor(Color.rgb(41,41,41));
        browser.setOverScrollMode(View.OVER_SCROLL_NEVER);browser.setVerticalScrollBarEnabled(false);
        WebSettings settings=browser.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);settings.setMediaPlaybackRequiresUserGesture(false);settings.setTextZoom(100);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setGeolocationEnabled(false);
        settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setSaveFormData(false);settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        if(encryptedPreferences==null)encryptedPreferences=new EncryptedPreferences(this);
        browser.setOnScrollChangeListener((view,x,y,oldX,oldY)->{if(x!=0||y!=0)view.scrollTo(0,0);});
        browser.addJavascriptInterface(new KeyboardBridge(),"AndroidKeyboard");
        browser.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return true;}
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                String url=request.getUrl().toString();
                if(url.startsWith("data:"))return null;
                if(!url.startsWith(ORIGIN))return emptyResponse();
                String asset=request.getUrl().getPath();
                if(asset==null||!java.util.Arrays.asList("/keyboard.html","/bangla-words.js","/english-words.js","/emoji-data.js","/keyboard-engine.js","/icons.js","/lucide.min.js").contains(asset))return emptyResponse();
                try{
                    String mime=asset.endsWith(".js")?"application/javascript":asset.endsWith(".json")?"application/json":asset.endsWith(".css")?"text/css":"text/html";
                    return new WebResourceResponse(mime,"UTF-8",getAssets().open(asset.substring(1)));
                }catch(Exception ignored){return emptyResponse();}
            }
            @Override public void onPageFinished(WebView view,String url){
                if(!url.equals(ORIGIN+"keyboard.html"))return;
                ready=true;if(active)captureEditor();publish(true);refreshDrawing();
            }
            @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){
                ready=false;main.post(()->{if(browser==view)setInputView(onCreateInputView());});return true;
            }
        });
        WebView.setWebContentsDebuggingEnabled(false);
        int initial=Math.round(350*getResources().getDisplayMetrics().density);
        container.addView(browser,new FrameLayout.LayoutParams(-1,initial));
        browser.loadUrl(ORIGIN+"keyboard.html");
        return container;
    }
    private static WebResourceResponse emptyResponse(){return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
    private void refreshDrawing(){
        if(browser==null)return;WebView view=browser;view.scrollTo(0,0);view.requestLayout();view.invalidate();
        view.postVisualStateCallback(++visualState,new WebView.VisualStateCallback(){@Override public void onComplete(long id){if(browser==view)view.postInvalidateOnAnimation();}});
    }
    @Override public void onWindowShown(){super.onWindowShown();refreshDrawing();}
    @Override public void onStartInput(EditorInfo info,boolean restarting){
        super.onStartInput(info,restarting);main.removeCallbacks(refresh);active=true;session++;revision=0;shadow="";
        absoluteStart=Math.max(0,info.initialSelStart);absoluteEnd=Math.max(absoluteStart,info.initialSelEnd);
        int cls=info.inputType&InputType.TYPE_MASK_CLASS,var=info.inputType&InputType.TYPE_MASK_VARIATION;
        secure=(cls==InputType.TYPE_CLASS_TEXT&&(var==InputType.TYPE_TEXT_VARIATION_PASSWORD||var==InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD||var==InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD))||(cls==InputType.TYPE_CLASS_NUMBER&&var==InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        noLearning=secure||(info.imeOptions&EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING)!=0;
        if(getWindow()!=null&&getWindow().getWindow()!=null){if(secure)getWindow().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);else getWindow().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);}
        kind=cls==InputType.TYPE_CLASS_NUMBER?"number":cls==InputType.TYPE_CLASS_PHONE?"phone":secure?"password":"text";
        captureEditor();publish(true);
    }
    @Override public void onStartInputView(EditorInfo info,boolean restarting){super.onStartInputView(info,restarting);active=true;if(browser!=null){browser.onResume();captureEditor();publish(true);refreshDrawing();}}
    @Override public void onFinishInputView(boolean finishingInput){
        super.onFinishInputView(finishingInput);active=false;session++;revision=0;shadow="";selectionStart=selectionEnd=0;main.removeCallbacks(refresh);publish(true);
    }
    @Override public void onFinishInput(){
        super.onFinishInput();active=false;session++;revision=0;shadow="";selectionStart=selectionEnd=offset=0;main.removeCallbacks(refresh);publish(true);
    }
    @Override public void onUpdateSelection(int oldStart,int oldEnd,int newStart,int newEnd,int candidatesStart,int candidatesEnd){
        super.onUpdateSelection(oldStart,oldEnd,newStart,newEnd,candidatesStart,candidatesEnd);
        main.removeCallbacks(refresh);
        if(!active)return;
        if(newStart==offset+selectionStart&&newEnd==offset+selectionEnd){absoluteStart=newStart;absoluteEnd=newEnd;return;}
        absoluteStart=Math.max(0,newStart);absoluteEnd=Math.max(absoluteStart,newEnd);main.postDelayed(refresh,70);
    }
    @Override public void onUpdateExtractedText(int token,ExtractedText text){
        super.onUpdateExtractedText(token,text);if(active){main.removeCallbacks(refresh);main.postDelayed(refresh,90);}
    }
    private String[] editorParts(InputConnection connection,int before,int after){
        if(Build.VERSION.SDK_INT>=31){
            SurroundingText surrounding=connection.getSurroundingText(before,after,0);
            if(surrounding!=null){String text=surrounding.getText().toString();int start=Math.min(surrounding.getSelectionStart(),surrounding.getSelectionEnd()),end=Math.max(surrounding.getSelectionStart(),surrounding.getSelectionEnd());return new String[]{text.substring(Math.max(0,start-before),start),text.substring(start,end),text.substring(end,Math.min(text.length(),end+after))};}
        }
        CharSequence left=connection.getTextBeforeCursor(before,0),selected=connection.getSelectedText(0),right=connection.getTextAfterCursor(after,0);
        return new String[]{left==null?"":left.toString(),selected==null?null:selected.toString(),right==null?"":right.toString()};
    }
    private void captureEditor(){
        editorReadable=true;
        InputConnection ic=getCurrentInputConnection();if(ic==null){shadow="";selectionStart=selectionEnd=offset=0;return;}
        try{
            String[] parts=editorParts(ic,1024,512);String a=parts[0],b=parts[1]==null?"":parts[1],c=parts[2];
            // Reject enormous selections; inserting text must never silently replace an uncaptured selection.
            if(b.length()>8192||(absoluteEnd>absoluteStart&&parts[1]==null)){editorReadable=false;shadow="";selectionStart=selectionEnd=0;offset=absoluteStart;revision++;return;}
            shadow=a+b+c;selectionStart=a.length();selectionEnd=a.length()+b.length();offset=Math.max(0,absoluteStart-selectionStart);revision++;
        }catch(Exception ignored){editorReadable=false;shadow="";selectionStart=selectionEnd=0;offset=absoluteStart;revision++;}
    }
    private JSONObject snapshot(boolean reset){
        JSONObject json=new JSONObject();try{
            EditorInfo info=getCurrentInputEditorInfo();int action=info==null?EditorInfo.IME_ACTION_NONE:info.imeOptions&EditorInfo.IME_MASK_ACTION;
            if(info!=null&&(info.imeOptions&EditorInfo.IME_FLAG_NO_ENTER_ACTION)!=0)action=EditorInfo.IME_ACTION_NONE;
            json.put("ok",true).put("session",session).put("revision",revision).put("text",shadow).put("start",selectionStart).put("end",selectionEnd).put("reset",reset)
                .put("secure",secure).put("noLearning",noLearning).put("kind",kind).put("active",active)
                .put("readable",editorReadable)
                .put("maxHeight",Math.round(getResources().getDisplayMetrics().heightPixels*.72f/getResources().getDisplayMetrics().density))
                .put("action",action==EditorInfo.IME_ACTION_SEND?"send":action==EditorInfo.IME_ACTION_SEARCH?"search":action==EditorInfo.IME_ACTION_DONE?"done":action==EditorInfo.IME_ACTION_NEXT?"next":action==EditorInfo.IME_ACTION_GO?"go":"newline");
        }catch(Exception ignored){}return json;
    }
    private void publish(boolean reset){if(browser!=null&&ready)browser.evaluateJavascript("window.BanglaNative&&window.BanglaNative.receive("+snapshot(reset).toString()+")",null);}
    private String edit(JSONObject request){
        if(!active||!editorReadable||getCurrentInputConnection()==null)return failure();
        try{
            if(request.getInt("session")!=session||request.getInt("revision")!=revision||!request.getString("before").equals(shadow))return failure();
            // An app may replace text without moving its cursor (autofill, autocorrect).
            // Verify the editor context before applying a stale deletion or replacement.
            InputConnection current=getCurrentInputConnection();
            String[] actual=editorParts(current,Math.min(1024,selectionStart),Math.min(512,shadow.length()-selectionEnd));
            String expectedLeft=shadow.substring(Math.max(0,selectionStart-1024),selectionStart),expectedSelected=shadow.substring(selectionStart,selectionEnd),expectedRight=shadow.substring(selectionEnd,Math.min(shadow.length(),selectionEnd+512));
            if(!actual[0].equals(expectedLeft)||!(actual[1]==null?"":actual[1]).equals(expectedSelected)||!actual[2].equals(expectedRight)){captureEditor();return failure();}
            String text=request.getString("text");int start=request.getInt("start"),end=request.getInt("end");
            if(text.length()>24000||start<0||end<start||end>text.length())return failure();
            EditorDelta delta=EditorDelta.between(shadow,selectionStart,selectionEnd,text);
            InputConnection ic=getCurrentInputConnection();boolean success=true;
            ic.beginBatchEdit();
            try{
                if(delta.beforeDelete>0||delta.afterDelete>0)success=ic.deleteSurroundingText(delta.beforeDelete,delta.afterDelete);
                if(success)success=ic.commitText(delta.replacement,1);
                int natural=delta.replacementStart+delta.replacement.length();
                if(success&&(start!=natural||end!=natural))success=ic.setSelection(offset+start,offset+end);
                if(success){shadow=text;selectionStart=start;selectionEnd=end;absoluteStart=offset+start;absoluteEnd=offset+end;revision++;}
            }finally{ic.endBatchEdit();}
            if(!success){captureEditor();return failure();}
            JSONObject result=new JSONObject();result.put("ok",true).put("session",session).put("revision",revision);return result.toString();
        }catch(Exception ignored){captureEditor();return failure();}
    }
    private String failure(){JSONObject result=snapshot(true);try{result.put("ok",false);}catch(Exception ignored){}return result.toString();}
    private String action(String requested){
        if(!java.util.Arrays.asList("switchIme","hide","delete","editor").contains(requested))return "false";
        if("switchIme".equals(requested)){((InputMethodManager)getSystemService(Context.INPUT_METHOD_SERVICE)).showInputMethodPicker();return "true";}
        if("hide".equals(requested)){requestHideSelf(0);return "true";}
        InputConnection ic=getCurrentInputConnection();EditorInfo info=getCurrentInputEditorInfo();if(!active||ic==null||info==null)return "false";
        if("delete".equals(requested)){boolean deleted=ic.deleteSurroundingTextInCodePoints(1,0);captureEditor();publish(true);return Boolean.toString(deleted);}
        int code=info.actionId!=0&&info.actionLabel!=null?info.actionId:info.imeOptions&EditorInfo.IME_MASK_ACTION;
        boolean performed;
        if(code==EditorInfo.IME_ACTION_NONE||code==EditorInfo.IME_ACTION_UNSPECIFIED||(info.imeOptions&EditorInfo.IME_FLAG_NO_ENTER_ACTION)!=0){performed=ic.commitText("\n",1);}
        else performed=ic.performEditorAction(code);
        if(performed&&code==EditorInfo.IME_ACTION_DONE)requestHideSelf(0);
        main.removeCallbacks(refresh);main.postDelayed(refresh,60);return Boolean.toString(performed);
    }
    private String onMain(Callable<String> callable){
        if(Looper.myLooper()==Looper.getMainLooper())try{return callable.call();}catch(Exception ignored){return "{}";}
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>("{}");AtomicBoolean cancelled=new AtomicBoolean(false);
        Runnable task=()->{try{if(!cancelled.get())result.set(callable.call());}catch(Exception ignored){}finally{done.countDown();}};
        main.post(task);
        try{if(!done.await(2500,TimeUnit.MILLISECONDS)){cancelled.set(true);main.removeCallbacks(task);main.post(refresh);return "{}";}}catch(InterruptedException ignored){cancelled.set(true);main.removeCallbacks(task);Thread.currentThread().interrupt();}
        return result.get();
    }
    public final class KeyboardBridge {
        @JavascriptInterface public String edit(String request){if(request==null||request.length()>65536)return "{}";return onMain(()->FlickInputService.this.edit(new JSONObject(request)));}
        @JavascriptInterface public void submitEdit(String raw){
            if(raw==null||raw.length()>65536)return;
            main.post(()->{
                JSONObject request=null,response;try{request=new JSONObject(raw);response=new JSONObject(raw.length()>65536?failure():FlickInputService.this.edit(request));}catch(Exception ignored){try{response=new JSONObject(failure());}catch(Exception invalid){return;}}
                try{response.put("requestId",request==null?-1:request.optLong("requestId",-1)).put("requestSession",request==null?-1:request.optInt("session",-1));}catch(Exception ignored){}
                if(browser!=null&&ready)browser.evaluateJavascript("window.BanglaNative&&window.BanglaNative.acknowledge("+response.toString()+")",null);
            });
        }
        @JavascriptInterface public String action(String action){return onMain(()->FlickInputService.this.action(action));}
        @JavascriptInterface public void height(double cssPixels){
            if(!Double.isFinite(cssPixels))return;
            main.post(()->{if(browser==null)return;float density=getResources().getDisplayMetrics().density;int max=Math.round(getResources().getDisplayMetrics().heightPixels*.72f);int px=Math.max(Math.round(220*density),Math.min(max,Math.round((float)cssPixels*density)));ViewGroup.LayoutParams lp=browser.getLayoutParams();if(lp!=null&&lp.height!=px){lp.height=px;browser.setLayoutParams(lp);refreshDrawing();}});
        }
        @JavascriptInterface public String version(){return "0.1.3-test";}
        @JavascriptInterface public String loadPreferences(){try{return preferenceWriter.submit(()->encryptedPreferences.load()).get(2500,TimeUnit.MILLISECONDS);}catch(Exception ignored){return "";}}
        @JavascriptInterface public boolean savePreferences(String json){try{return encryptedPreferences.save(json);}catch(Exception ignored){return false;}}
        @JavascriptInterface public void savePreferencesAsync(String json){
            if(json==null||json.length()>16384)return;
            preferenceWriter.execute(()->{try{if(encryptedPreferences.save(json))return;}catch(Exception ignored){}main.post(()->{if(browser!=null&&ready)browser.evaluateJavascript("window.BanglaNative&&window.BanglaNative.preferenceSaveFailed()",null);});});
        }
        @JavascriptInterface public void sound(String type){main.post(()->{AudioManager audio=(AudioManager)getSystemService(AUDIO_SERVICE);if(audio!=null&&audio.getRingerMode()==AudioManager.RINGER_MODE_NORMAL){int effect="delete".equals(type)?AudioManager.FX_KEYPRESS_DELETE:"modifier".equals(type)?AudioManager.FX_KEYPRESS_RETURN:AudioManager.FX_KEYPRESS_STANDARD;audio.playSoundEffect(effect,.5f);}});}
        @JavascriptInterface public void haptic(){main.post(()->{android.os.Vibrator vibrator=(android.os.Vibrator)getSystemService(VIBRATOR_SERVICE);if(vibrator!=null&&vibrator.hasVibrator())vibrator.vibrate(android.os.VibrationEffect.createOneShot(8,android.os.VibrationEffect.DEFAULT_AMPLITUDE));});}
    }
    @Override public void onDestroy(){main.removeCallbacksAndMessages(null);preferenceWriter.shutdown();if(browser!=null){browser.removeJavascriptInterface("AndroidKeyboard");if(browser.getParent() instanceof ViewGroup)((ViewGroup)browser.getParent()).removeView(browser);browser.destroy();browser=null;}super.onDestroy();}
}

