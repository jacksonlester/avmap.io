this._s=this._s||{};(function(_){var window=this;
try{
_.t("Ko78Df");
var raC=class{constructor(a){this.state=a}getId(){return this.state.id}getPushId(){return this.state.pushId}getUrl(){return this.state.url}getUserData(){return this.state.userData}};
_.$e(_.k0a,class extends _.Co{static Sa(){return{service:{history:_.ecb}}}constructor(a){super();this.history=a.service.history;this.Aw=document.body;this.oa=new Map;this.history.addListener((b,c,d)=>{if(d.Yfa)for(const e of d.Yfa)if(this.oa.has(e.id)){const f=this.oa.get(e.id);f&&_.Fn(()=>{f(e.tNa)});this.oa.delete(e.id)}d.userInitiated&&this.Aw.dispatchEvent(new CustomEvent("FWkcec"))})}pushAsync(a,b,c,d){a=d?this.history.oa(a,b):this.history.pushAsync(a,b);return Promise.resolve(a.then(e=>{c&&
this.oa.set(e.id,c);return e.id}))}pop(a,b){a=b?this.history.Ca(a):this.history.pop(a);return Promise.resolve(a.then(c=>c?new raC(c):null))}getState(){const a=this.history.getState();return a?new raC(a):null}getCurrentUrl(){return this.history.getCurrentUrl()}getEventTarget(){return this.Aw}navigate(a,b){a=this.history.navigate(a,b).committed;return Promise.resolve(a.then(c=>new raC(c)))}});
_.u();
}catch(e){_._DumpException(e)}
})(this._s);
// Google Inc.
