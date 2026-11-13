package dev.banglaflick.test;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.*;

public final class SetupActivity extends Activity {
    private int dp(int n) { return Math.round(n * getResources().getDisplayMetrics().density); }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dp(24),dp(24),dp(24),dp(24)); layout.setBackgroundColor(Color.rgb(242,245,243));
        layout.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(dp(24),dp(24)+insets.getSystemWindowInsetTop(),dp(24),dp(24)+insets.getSystemWindowInsetBottom());return insets;});
        TextView title = new TextView(this);title.setText("Bangla Modern Flick Keyboard");title.setTextSize(28);title.setTextColor(Color.rgb(30,43,38));layout.addView(title);
        TextView intro = new TextView(this);intro.setText("Version 0.1.5\n\nEnable the keyboard, select it, then type in any app. Use ⚙ on the keyboard for Settings and Help. The launcher icon is a placeholder.");intro.setTextSize(16);intro.setPadding(0,dp(16),0,dp(20));layout.addView(intro);
        button(layout,"1 · Enable keyboard",v->startActivity(new Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)));
        button(layout,"2 · Select keyboard",v->((InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).showInputMethodPicker());
        button(layout,"Restore keyboard display",v->{DisplayOptions.requestReset(this);Toast.makeText(this,"Return to your chat and open the keyboard. Settings and messages are kept.",Toast.LENGTH_LONG).show();});
        Switch simple=new Switch(this);simple.setText("Simpler graphics (display test)");simple.setChecked(DisplayOptions.simple(this));simple.setPadding(0,dp(12),0,dp(12));simple.setOnCheckedChangeListener((button,checked)->{DisplayOptions.setSimple(this,checked);Toast.makeText(this,"Applied the next time the keyboard opens",Toast.LENGTH_SHORT).show();});layout.addView(simple);
        button(layout,"Display diagnostics",v->{String report=DisplayOptions.summary(this);new android.app.AlertDialog.Builder(this).setTitle("Keyboard display").setMessage(report).setNeutralButton("Copy report",(dialog,which)->{android.content.ClipboardManager clipboard=(android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);if(clipboard!=null)clipboard.setPrimaryClip(android.content.ClipData.newPlainText("Keyboard display diagnostics",report));}).setPositiveButton("Close",null).show();});
        TextView note=new TextView(this);note.setText("Android shows its standard keyboard warning when you enable an input method. This build has no Internet permission.\n\nTry Bangla and English here:");note.setPadding(0,dp(20),0,dp(8));layout.addView(note);
        EditText input=new EditText(this);input.setHint("ক → যুক্ত → ষ = ক্ষ");input.setTextSize(20);input.setMinLines(3);input.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE);input.setImeOptions(EditorInfo.IME_ACTION_NONE);layout.addView(input,new LinearLayout.LayoutParams(-1,dp(150)));
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.addView(layout);setContentView(scroll);
    }
    private void button(LinearLayout parent,String text,View.OnClickListener action) {
        Button button=new Button(this);button.setText(text);button.setAllCaps(false);button.setOnClickListener(action);parent.addView(button,new LinearLayout.LayoutParams(-1,dp(56)));
    }
}

