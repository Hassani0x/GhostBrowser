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
 WindowManager manager; LinearLayout panel; WebView web; WindowManager.LayoutParams params; boolean glass=false; int tint=65, blur=24; boolean siteGlass=true; LinearLayout settings;
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
  Button theme=new Button(this);theme.setText("Glass");bar.addView(theme);theme.setOnClickListener(v->{glass=!glass;settings.setVisibility(glass?View.VISIBLE:View.GONE);applyGlass();});
  Button quit=new Button(this);quit.setText("×");bar.addView(quit);quit.setOnClickListener(v->stopSelf());panel.addView(bar);
  LinearLayout navigation=new LinearLayout(this);EditText address=new EditText(this);address.setSingleLine(true);address.setTextColor(Color.WHITE);address.setHintTextColor(Color.LTGRAY);address.setHint("https://…");navigation.addView(address,new LinearLayout.LayoutParams(0,-2,1));
  Button go=new Button(this);go.setText("Go");navigation.addView(go);panel.addView(navigation);
  web=new WebView(this);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  web.setWebViewClient(new WebViewClient(){public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){String scheme=req.getUrl().getScheme();return !"https".equals(scheme);}public void onPageFinished(WebView view,String url){address.setText(url);applyGlass();}});
  web.setWebChromeClient(new WebChromeClient(){public void onPermissionRequest(PermissionRequest request){request.deny();}});
  go.setOnClickListener(v->{String url=address.getText().toString().trim();if(!url.startsWith("https://"))url="https://"+url;web.loadUrl(url);web.requestFocus();});
  settings=new LinearLayout(this);settings.setOrientation(1);settings.setVisibility(View.GONE);panel.addView(settings);
  addSlider("Background tint",15,95,tint,value->{tint=value;applyGlass();});
  addSlider(Build.VERSION.SDK_INT>=31?"Background blur (device dependent)":"Blur unavailable before Android 12",0,60,blur,value->{blur=value;applyGlass();});
  CheckBox sites=new CheckBox(this);sites.setText("Glass website backgrounds (experimental)");sites.setTextColor(Color.WHITE);sites.setChecked(siteGlass);settings.addView(sites);sites.setOnCheckedChangeListener((b,checked)->{siteGlass=checked;applyGlass();});
  LinearLayout sizes=new LinearLayout(this);settings.addView(sizes);
  for(int direction:new int[]{-1,1}){Button size=new Button(this);size.setText(direction<0?"Smaller":"Larger");sizes.addView(size);size.setOnClickListener(v->{params.width=Math.max(Math.min(280,width),Math.min(width,params.width+direction*60));params.height=Math.max(Math.min(360,height),Math.min(height-params.y,params.height+direction*80));manager.updateViewLayout(panel,params);});}
  Button copy=new Button(this);copy.setText("Copy selected text");settings.addView(copy);copy.setOnClickListener(v->web.evaluateJavascript("window.getSelection().toString()",result->{try{String text=(String)new org.json.JSONTokener(result).nextValue();if(!text.isEmpty()){getSystemService(android.content.ClipboardManager.class).setPrimaryClip(ClipData.newPlainText("Ghost selection",text));Toast.makeText(this,"Copied",Toast.LENGTH_SHORT).show();}else Toast.makeText(this,"Select text first",Toast.LENGTH_SHORT).show();}catch(Exception e){Toast.makeText(this,"Could not copy",Toast.LENGTH_SHORT).show();}}));
  panel.addView(web,new LinearLayout.LayoutParams(-1,0,1));
  TextView resize=new TextView(this);resize.setText("Drag to resize ↘");resize.setTextColor(Color.WHITE);resize.setGravity(Gravity.RIGHT);resize.setPadding(16,16,16,16);panel.addView(resize);
  resize.setOnTouchListener(new View.OnTouchListener(){float x,y;int w,h;public boolean onTouch(View v,android.view.MotionEvent e){if(e.getAction()==0){x=e.getRawX();y=e.getRawY();w=params.width;h=params.height;}else if(e.getAction()==2){params.width=Math.max(Math.min(280,width),Math.min(width-params.x,w+(int)(e.getRawX()-x)));params.height=Math.max(Math.min(360,height),Math.min(height-params.y,h+(int)(e.getRawY()-y)));manager.updateViewLayout(panel,params);}return true;}});
  manager.addView(panel,params);web.loadUrl("https://www.google.com");
 }
 interface ValueChanged{void set(int value);}
 void addSlider(String title,int min,int max,int initial,ValueChanged change){TextView label=new TextView(this);label.setTextColor(Color.WHITE);label.setText(title+": "+initial);settings.addView(label);SeekBar slider=new SeekBar(this);slider.setMax(max-min);slider.setProgress(initial-min);settings.addView(slider);slider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onStartTrackingTouch(SeekBar s){}public void onStopTrackingTouch(SeekBar s){}public void onProgressChanged(SeekBar s,int p,boolean user){if(user){label.setText(title+": "+(min+p));change.set(min+p);}}});}
 void applyGlass(){
  params.alpha=1f;
  android.graphics.drawable.GradientDrawable background=new android.graphics.drawable.GradientDrawable();background.setColor(glass?Color.argb((int)(255*tint/100f),16,30,24):Color.rgb(16,21,20));background.setCornerRadius(28);background.setStroke(2,Color.argb(100,230,255,242));panel.setBackground(background);panel.setClipToOutline(true);
  if(Build.VERSION.SDK_INT>=31){if(glass&&blur>0){params.flags|=WindowManager.LayoutParams.FLAG_BLUR_BEHIND;params.setBlurBehindRadius(blur);}else{params.flags&=~WindowManager.LayoutParams.FLAG_BLUR_BEHIND;params.setBlurBehindRadius(0);}}
  web.setBackgroundColor(glass&&siteGlass?Color.TRANSPARENT:Color.WHITE);
  String css=glass&&siteGlass?"html,body{background:transparent!important}body{color:#edf4ef!important}body :where(div,main,section,article,header,footer,aside,pre,input,textarea){background-color:rgba(16,30,24,"+(tint/100f*.35f)+")!important;background-image:none!important}pre,input,textarea{color:#edf4ef!important}":"";
  web.evaluateJavascript("(()=>{let s=document.getElementById('__ghost_glass_style');if(!s){s=document.createElement('style');s.id='__ghost_glass_style';document.documentElement.append(s)}s.textContent="+org.json.JSONObject.quote(css)+"})()",null);
  manager.updateViewLayout(panel,params);
 } public int onStartCommand(Intent intent,int flags,int id){if(intent!=null&&"close".equals(intent.getAction()))stopSelf();return START_NOT_STICKY;}
 public void onDestroy(){if(panel!=null)manager.removeView(panel);if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
