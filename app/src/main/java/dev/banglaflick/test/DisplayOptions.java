package dev.banglaflick.test;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.webkit.WebView;

/** Display diagnostics only. Never stores editor text, suggestions or screenshots. */
final class DisplayOptions {
    private static SharedPreferences store(Context context){return context.getSharedPreferences("display_recovery",Context.MODE_PRIVATE);}
    static int generation(Context context){return store(context).getInt("generation",0);}
    static boolean simple(Context context){return store(context).getBoolean("simple",false);}
    static boolean reconnect(Context context){return store(context).getBoolean("reconnect",false);}
    static void requestReset(Context context){store(context).edit().putInt("generation",generation(context)+1).apply();}
    static void setSimple(Context context,boolean enabled){store(context).edit().putBoolean("simple",enabled).putInt("generation",generation(context)+1).apply();}
    static void setReconnect(Context context,boolean enabled){store(context).edit().putBoolean("reconnect",enabled).putInt("generation",generation(context)+1).apply();}
    static void nativeState(Context context,int width,int height,int scrollX,int scrollY,int visibility,int windowVisibility,boolean attached,boolean shown,boolean active,boolean paused,int draws,boolean drawHardware){
        String state="Size "+width+"×"+height+", scroll "+scrollX+","+scrollY+", visibility "+visibility+"/"+windowVisibility+", attached "+attached+", shown "+shown+", paused "+paused+", draw callbacks "+draws+", canvas hardware "+drawHardware;
        SharedPreferences.Editor edit=store(context).edit().putString("native_state",state);
        if(shown&&active)edit.putString("visible_native_state",state);
        edit.apply();
    }
    static void pageState(Context context,org.json.JSONObject state,boolean active){
        // Only numeric/boolean diagnostics. Never store arbitrary strings from the page.
        org.json.JSONObject safe=new org.json.JSONObject();try{
            for(String name:new String[]{"visibleButtons","width","height","top","left","scrollX","scrollY","viewportHeight","scriptErrors","promiseErrors","viewportOffsetTop","visualHeight","keyReleases","activeGestures","undoEntries","domNodes"}){
                double value=state.optDouble(name,0);if(Double.isFinite(value))safe.put(name,value);
            }
            safe.put("documentHidden",state.optBoolean("documentHidden",false));safe.put("rootVisible",state.optBoolean("rootVisible",false));
        }catch(org.json.JSONException ignored){}
        SharedPreferences.Editor edit=store(context).edit().putString("page_state",safe.toString());
        if(active&&!state.optBoolean("documentHidden",false))edit.putString("visible_page_state",safe.toString());
        edit.apply();
    }
    static void record(Context context,String event,boolean hardware){
        SharedPreferences prefs=store(context);
        // Call sites pass fixed event names and numeric states, never editor data.
        String[] previous=prefs.getString("events","").split("\n");StringBuilder events=new StringBuilder();
        for(int i=Math.max(0,previous.length-31);i<previous.length;i++)if(!previous[i].isEmpty())events.append(previous[i]).append('\n');
        events.append(android.os.SystemClock.elapsedRealtime()).append("ms ").append(event);
        prefs.edit().putString("last_event",event).putBoolean("hardware",hardware)
            .putInt(event+"_count",prefs.getInt(event+"_count",0)+1).putString("events",events.toString()).apply();
    }
    static String summary(Context context){
        SharedPreferences prefs=store(context);android.content.pm.PackageInfo webview=WebView.getCurrentWebViewPackage();
        return "Display test 0.1.4\n"+Build.MANUFACTURER+" "+Build.MODEL+" · Android "+Build.VERSION.RELEASE
            +"\nWebView: "+(webview==null?"unavailable":webview.versionName)
            +"\nLast display event: "+prefs.getString("last_event","none")
            +"\nHardware drawing: "+prefs.getBoolean("hardware",false)
            +"\nRebuilds on reopen: "+prefs.getInt("rebuilt_on_reopen_count",0)
            +" · renderer restarts: "+prefs.getInt("renderer_exit_count",0)
            +"\nSimple graphics: "+simple(context)+" · rebuild test: "+reconnect(context)
            +"\nLast native sample: "+prefs.getString("native_state","not sampled yet")
            +"\nLast shown native sample: "+prefs.getString("visible_native_state","not sampled yet")
            +"\nLast visible page sample: "+prefs.getString("visible_page_state","not sampled yet")
            +"\nRecent events (milliseconds since boot):\n"+prefs.getString("events","none")
            +"\nNo messages or screenshots are included in these diagnostics.";
    }
}
