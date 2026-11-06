package dev.ghostbrowser;
import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.view.*;
import android.webkit.*;
import android.widget.*;

public class BrowserService extends Service {
 WindowManager manager; LinearLayout panel; WebView web; WindowManager.LayoutParams params; boolean glass=false;
 public IBinder onBind(Intent intent){return null;}
 public void onCreate(){
  super.onCreate();
  NotificationManager notifications=getSystemService(NotificationManager.class);
  notifications.createNotificationChannel(new NotificationChannel("browser","Floating browser",NotificationManager.IMPORTANCE_LOW));
  PendingIntent close=PendingIntent.getService(this,0,new Intent(this,BrowserService.class).setAction("close"),PendingIntent.FLAG_IMMUTABLE);
  startForeground(1,new Notification.Builder(this,"browser").setSmallIcon(android.R.drawable.ic_menu_view).setContentTitle("Ghost Browser is open").setContentText("Use Close to stop the floating browser").addAction(new Notification.Action.Builder(null,"Close",close).build()).setOngoing(true).build());
  manager=getSystemService(WindowManager.class);
  int width=getResources().getDisplayMetrics().widthPixels;
  int height=getResources().getDisplayMetrics().heightPixels;
  params=new WindowManager.LayoutParams((int)(width*.92),(int)(height*.65),WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_SECURE|WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,PixelFormat.TRANSLUCENT);
  params.gravity=Gravity.TOP|Gravity.START;params.x=10;params.y=80;
  params.softInputMode=WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
  panel=new LinearLayout(this);panel.setOrientation(1);panel.setBackgroundColor(Color.rgb(16,21,20));
  LinearLayout bar=new LinearLayout(this);
  TextView handle=new TextView(this);handle.setText("Ghost  •  drag");handle.setTextColor(Color.WHITE);handle.setPadding(12,16,12,16);bar.addView(handle,new LinearLayout.LayoutParams(0,-2,1));
  handle.setOnTouchListener(new View.OnTouchListener(){float x,y;int px,py;public boolean onTouch(View v,android.view.MotionEvent e){if(e.getAction()==0){x=e.getRawX();y=e.getRawY();px=params.x;py=params.y;}else if(e.getAction()==2){params.x=Math.max(0,Math.min(width-100,px+(int)(e.getRawX()-x)));params.y=Math.max(0,Math.min(height-100,py+(int)(e.getRawY()-y)));manager.updateViewLayout(panel,params);}return true;}});
  Button theme=new Button(this);theme.setText("Glass");bar.addView(theme);theme.setOnClickListener(v->{glass=!glass;params.alpha=glass?.88f:1f;panel.setBackgroundColor(glass?Color.rgb(35,65,54):Color.rgb(16,21,20));manager.updateViewLayout(panel,params);});
  Button quit=new Button(this);quit.setText("×");bar.addView(quit);quit.setOnClickListener(v->stopSelf());panel.addView(bar);
  LinearLayout navigation=new LinearLayout(this);EditText address=new EditText(this);address.setSingleLine(true);address.setTextColor(Color.WHITE);address.setHintTextColor(Color.LTGRAY);address.setHint("https://…");navigation.addView(address,new LinearLayout.LayoutParams(0,-2,1));
  Button go=new Button(this);go.setText("Go");navigation.addView(go);panel.addView(navigation);
  web=new WebView(this);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  web.setWebViewClient(new WebViewClient(){public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){String scheme=req.getUrl().getScheme();return !"https".equals(scheme);}public void onPageFinished(WebView view,String url){address.setText(url);}});
  web.setWebChromeClient(new WebChromeClient(){public void onPermissionRequest(PermissionRequest request){request.deny();}});
  go.setOnClickListener(v->{String url=address.getText().toString().trim();if(!url.startsWith("https://"))url="https://"+url;web.loadUrl(url);web.requestFocus();});
  panel.addView(web,new LinearLayout.LayoutParams(-1,0,1));manager.addView(panel,params);web.loadUrl("https://www.google.com");
 }
 public int onStartCommand(Intent intent,int flags,int id){if(intent!=null&&"close".equals(intent.getAction()))stopSelf();return START_NOT_STICKY;}
 public void onDestroy(){if(panel!=null)manager.removeView(panel);if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
