/*! VisionNet tracker */
(function(w,d){try{
var s=d.currentScript;if(!s||w.VisionNet)return;
var site=s.getAttribute("data-site-id"),key=s.getAttribute("data-key"),api=new URL(s.src).origin+"/api/public/collect",T=2592e6;
function gc(n){var m=d.cookie.match("(?:^|; )"+n+"=([^;]*)");return m?decodeURIComponent(m[1]):null}
function set(n,v){try{d.cookie=n+"="+encodeURIComponent(v)+";path=/;max-age=2592000;SameSite=Lax"+(location.protocol=="https:"?";Secure":"")}catch(e){}try{localStorage.setItem(n,JSON.stringify({v:v,t:Date.now()}))}catch(e){}}
function get(n){var v=gc(n);if(v)return v;try{var o=JSON.parse(localStorage.getItem(n)||"null");if(o&&Date.now()-o.t<T)return o.v}catch(e){}return null}
var ref=null;try{ref=new URLSearchParams(location.search).get("vn_ref")}catch(e){}
if(ref&&!/^[A-Za-z0-9_-]{1,32}$/.test(ref))ref=null;
if(ref&&!get("vn_ref"))set("vn_ref",ref);
var vid=get("vn_vid");if(!vid){vid=w.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}set("vn_vid",vid);
function send(ev,data){try{
var b=JSON.stringify({site_id:site,key:key,event:ev,visitor_id:vid,vn_ref:ev=="visit"?(ref||get("vn_ref")):get("vn_ref"),url:location.href,referrer:d.referrer||null,data:data||{}});
if(navigator.sendBeacon&&navigator.sendBeacon(api,new Blob([b],{type:"text/plain"})))return;
fetch(api,{method:"POST",body:b,keepalive:true,headers:{"content-type":"text/plain"}}).catch(function(){})}catch(e){}}
w.VisionNet={track:function(n,data){if(n=="signup"||n=="activation")send(n,data)},getRef:function(){return get("vn_ref")},getVisitorId:function(){return vid}};
send("visit");
}catch(e){}})(window,document);
