this._s=this._s||{};(function(_){var window=this;
try{
_.aFb=class{constructor(a){this.Ql=a}};
}catch(e){_._DumpException(e)}
try{
_.t("aLUfP");
var cFb;_.bFb=!1;cFb=function(){return _.qa()&&_.Wd.yF()&&!navigator.userAgent.includes("GSA")};
_.$e(_.DXa,class extends _.Co{static Sa(){return{service:{window:_.Do}}}constructor(a){super();this.window=a.service.window.get();this.Ba=this.Ql();this.Aa=window.orientation;this.oa=()=>{const b=this.Ql();var c=this.hYb()&&Math.abs(window.orientation)===90&&this.Aa===-1*window.orientation;this.Aa=window.orientation;if(b!==this.Ba||c){this.Ba=b;for(const d of this.listeners){c=new _.aFb(b);try{d(c)}catch(e){_.da(e)}}}};this.listeners=new Set;this.window.addEventListener("resize",this.oa);this.hYb()&&
this.window.addEventListener("orientationchange",this.oa)}addListener(a){this.listeners.add(a)}removeListener(a){this.listeners.delete(a)}Ql(){if(cFb()){var a=_.km(this.window);a=new _.cm(a.width,Math.round(a.width*this.window.innerHeight/this.window.innerWidth))}else a=this.Kc()||(_.qa()?cFb():this.window.visualViewport)?_.km(this.window):new _.cm(this.window.innerWidth,this.window.innerHeight);return a.height<a.width}destroy(){this.window.removeEventListener("resize",this.oa);this.window.removeEventListener("orientationchange",
this.oa)}Kc(){return _.bFb}hYb(){return"orientation"in window}});
_.bFb=!0;
_.u();
}catch(e){_._DumpException(e)}
})(this._s);
// Google Inc.
