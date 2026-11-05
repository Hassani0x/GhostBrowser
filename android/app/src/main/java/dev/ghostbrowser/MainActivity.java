package dev.ghostbrowser;
import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.provider.Settings;
import android.widget.*;

public class MainActivity extends Activity {
 public void onCreate(Bundle state) {
  super.onCreate(state);
  LinearLayout layout=new LinearLayout(this); layout.setOrientation(1); layout.setPadding(32,64,32,32);
  TextView title=new TextView(this); title.setText("Ghost Browser · Android preview\n\nA floating browser above other apps. Grant Display over other apps, then tap Open. Secure windows may appear black in recordings; test your device.\n\nThis preview supports browsing, copying and Glass mode. Microphone, uploads and desktop screenshot features are not yet supported."); layout.addView(title);
  Button open=new Button(this); open.setText("Open floating browser"); layout.addView(open);
  open.setOnClickListener(v->{if(!Settings.canDrawOverlays(this)) startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName()))); else {startForegroundService(new Intent(this,BrowserService.class));finish();}});
  Button stop=new Button(this); stop.setText("Close browser");layout.addView(stop);stop.setOnClickListener(v->stopService(new Intent(this,BrowserService.class)));
  setContentView(layout);
 }
}
