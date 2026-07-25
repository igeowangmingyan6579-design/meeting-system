import pathlib, os

SRC = pathlib.Path(r"C:\Users\igeowang\WorkBuddy\2026-07-07-00-00-56\meeting-system-app\dist\index.html")
PJS = pathlib.Path(r"C:\Users\igeowang\WorkBuddy\2026-07-07-00-00-56\meeting-system-app\deploy\public\peerjs.min.js")
OUT = pathlib.Path(r"C:\Users\igeowang\WorkBuddy\2026-07-24-21-03-14\meeting-app\index.html")

# JP_INLINE=1(默认): PeerJS 内联，自包含单文件，规避 Edge 拦截 unpkg / 无外链依赖
INLINE = os.environ.get("JP_INLINE", "1") != "0"

html = SRC.read_text(encoding="utf-8")
pjs = PJS.read_text(encoding="utf-8")

# 0) 安全 localStorage 垫片（沙箱 iframe 下访问 localStorage 会抛 SecurityError，降级为内存存储）
SHIM = """<script>
(function(){
  function makeMem(){
    var m={};
    return {
      getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null;},
      setItem:function(k,v){m[k]=String(v);},
      removeItem:function(k){delete m[k];},
      clear:function(){m={};},
      key:function(i){var ks=Object.keys(m);return i<ks.length?ks[i]:null;},
      get length(){return Object.keys(m).length;}
    };
  }
  try{
    var _p='__jm_probe__';
    window.localStorage.setItem(_p,'1');
    window.localStorage.removeItem(_p);
    var real=window.localStorage, mem=makeMem();
    var proxy={
      getItem:function(k){try{return real.getItem(k);}catch(e){return mem.getItem(k);}},
      setItem:function(k,v){try{real.setItem(k,v);}catch(e){mem.setItem(k,v);}},
      removeItem:function(k){try{real.removeItem(k);}catch(e){mem.removeItem(k);}},
      clear:function(){try{real.clear();}catch(e){mem.clear();}},
      key:function(i){try{return real.key(i);}catch(e){return mem.key(i);}},
      get length(){try{return real.length;}catch(e){return mem.length;}}
    };
    Object.defineProperty(window,'localStorage',{value:proxy,configurable:true});
  }catch(e){
    try{Object.defineProperty(window,'localStorage',{value:makeMem(),configurable:true});}catch(e2){}
  }
})();
</script>
"""

# 0.5) 内联 SVG favicon（data URI，自绘极简摄像头图标），零第三方图标
FAV = '<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2032%2032%27%3E%3Crect%20width=%2732%27%20height=%2732%27%20rx=%277%27%20fill=%27%234f7cff%27/%3E%3Cpath%20d=%27M10%2012h12a2%202%200%200%201%202%202v7a2%202%200%200%201-2%202H10a2%202%200%200%201-2-2v-7a2%202%200%200%201%202-2z%27%20fill=%27white%27/%3E%3Ccircle%20cx=%2716%27%20cy=%2717.5%27%20r=%273%27%20fill=%27%234f7cff%27/%3E%3C/svg%3E">'

# 注入 shim + favicon（仅当缺失时，保证幂等可重复构建）
to_head = ""
if "makeMem" not in html:
    to_head += SHIM + "\n"
if "data:image/svg+xml" not in html:
    to_head += FAV + "\n"
if to_head and "<head>" in html:
    html = html.replace("<head>", "<head>\n" + to_head, 1)

# 1) PeerJS：内联（自包含）或 jsdelivr CDN；替换 unpkg
cdn_unpkg = '<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>'
cdn_jsd = '<script src="https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js"></script>'
if cdn_unpkg in html:
    if INLINE:
        html = html.replace(cdn_unpkg, "<script>\n" + pjs + "\n</script>")
        print("peerjs mode: inline")
    else:
        html = html.replace(cdn_unpkg, cdn_jsd)
        print("peerjs mode: jsdelivr CDN")
elif INLINE and cdn_jsd in html:
    html = html.replace(cdn_jsd, "<script>\n" + pjs + "\n</script>")
    print("peerjs mode: inline (from jsdelivr)")
else:
    print("peerjs mode: unchanged (already self-contained?)")

# 2) ICE：源码 dist 已内联字面值 TURN 配置（STUN+TURN），跳过注入。
# 3) store try/catch、peerId host/rand：源码已含，跳过。
# 4) _render 清空 app、beforeunload 去重：已在源码手写，跳过。

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding="utf-8")
print("OK written:", OUT, "bytes=", len(html.encode("utf-8")))
print("has shim:", "makeMem" in html)
print("has favicon:", "data:image/svg+xml" in html)
print("has unpkg:", "unpkg.com" in html)
print("has jsdelivr:", "cdn.jsdelivr.net" in html)
print("has ICE literal:", "openrelayproject" in html)
print("render clears app:", "app.innerHTML = ''" in html)
print("beforeunload dedup:", "__jmBU" in html)
