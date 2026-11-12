import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function glslRawPlugin(): Plugin {
  return {
    name: 'vite-plugin-glsl-raw',
    enforce: 'pre',
    load(id) {
      const cleanId = id.split('?')[0];
      if (cleanId.endsWith('.frag') || cleanId.endsWith('.vert') || cleanId.endsWith('.glsl')) {
        const code = fs.readFileSync(cleanId, 'utf-8');
        return `export default ${JSON.stringify(code)};`;
      }
      return null;
    },
  };
}

function softwareGlHtmlPacerPlugin(): Plugin {
  const buildPacerScript = (defaultQuery: string) =>
    `<script>(function(){try{var c=document.createElement("canvas"),gl=c.getContext("webgl2")||c.getContext("webgl");if(!gl)return;var dbg=gl.getExtension("WEBGL_debug_renderer_info"),r=gl.getParameter(dbg?dbg.UNMASKED_RENDERER_WEBGL:gl.RENDERER)||"";gl.getExtension("WEBGL_lose_context")?.loseContext();if(!/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(String(r)))return;window.__isSoftwareGl=true;try{Object.defineProperty(window,"devicePixelRatio",{get:function(){return 1;},configurable:true});}catch(e){}if(!location.search&&${JSON.stringify(defaultQuery)}&&history&&history.replaceState){history.replaceState(null,"",location.pathname+${JSON.stringify(defaultQuery)}+location.hash);}var gls=[],origGetCtx=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,attrs){var ctx=origGetCtx.call(this,type,attrs);if(ctx&&(type==="webgl2"||type==="webgl")&&gls.indexOf(ctx)===-1)gls.push(ctx);return ctx;};var origRAF=window.requestAnimationFrame.bind(window),queue=[],busy=false,nextId=1;function afterAllDraws(done){var syncs=[];for(var i=0;i<gls.length;i++){var g=gls[i];if(g&&typeof g.fenceSync==="function"&&!g.isContextLost()){var s=g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE,0);g.flush();if(s)syncs.push({g:g,s:s});}}if(!syncs.length){setTimeout(done,120);return;}function poll(){var pending=false;for(var j=0;j<syncs.length;j++){var item=syncs[j];if(!item.done){var st=item.g.getSyncParameter(item.s,item.g.SYNC_STATUS);if(st===item.g.UNSIGNALED){pending=true;}else{item.g.deleteSync(item.s);item.done=true;}}}if(pending)setTimeout(poll,10);else setTimeout(done,120);}setTimeout(poll,10);}function pump(){if(busy||!queue.length)return;busy=true;origRAF(function(ts){var batch=queue.splice(0,queue.length);for(var i=0;i<batch.length;i++){try{batch[i].cb(ts);}catch(e){console.error(e);}}if(!window.__ready&&!window.__kage&&!window.__scene){busy=false;if(queue.length)pump();return;}afterAllDraws(function(){busy=false;if(queue.length)pump();});});}window.requestAnimationFrame=function(cb){var id=nextId++;queue.push({id:id,cb:cb});pump();return id;};window.cancelAnimationFrame=function(id){for(var i=queue.length-1;i>=0;i--){if(queue[i].id===id)queue.splice(i,1);}};}catch(e){}})();</script>`;

  const transformInnerGreenHtml = (raw: string) =>
    raw
      .replace('<head>', '<head>' + buildPacerScript('?blades=18000'))
      .replace(
        'if (!REDUCED && !document.hidden) { uScanOn.value = 1; uScanR.value = 0; scanning = true; }',
        'if (!REDUCED && !document.hidden && !window.__isSoftwareGl) { uScanOn.value = 1; uScanR.value = 0; scanning = true; }'
      );

  const transformKageHtml = (raw: string) =>
    raw
      .replace('<head>', '<head>' + buildPacerScript('?q=low&dpr=1&shot=0'))
      .replace(
        "document.fonts.load('600 320px Wordmark')",
        "Promise.all([document.fonts.load('600 320px Wordmark'), document.fonts.load('700 320px Onest')])"
      )
      .replace('const SZ = 320, TRACK = .40, PAD = 26;', 'const SZ = 320, TRACK = .14, PAD = 26;')
      .replace(/600 ' \+ SZ \+ 'px Wordmark, sans-serif/g, "700 ' + SZ + 'px Onest, sans-serif")
      .replace("const word = 'KAGE', gl = [];", "const word = 'AAKARSH', gl = [];");

  const transformJapaneseTowerHtml = (raw: string) =>
    raw
      .replace('<head>', '<head>' + buildPacerScript(''))
      .replace(
        'const N=104000,im=new T.InstancedMesh(bg,mat,N);',
        'const N=window.__isSoftwareGl?12000:104000,im=new T.InstancedMesh(bg,mat,N);'
      )
      .replace(
        'key.shadow.mapSize.set(3072,3072);',
        'key.shadow.mapSize.set(window.__isSoftwareGl?512:3072,window.__isSoftwareGl?512:3072);'
      )
      .replace(
        "timeEl.textContent=tt.toFixed(2)+' / '+DUR.toFixed(2);",
        "timeEl.textContent=tt.toFixed(2)+' / '+DUR.toFixed(2);try{if(window.parent&&window.parent!==window){window.parent.postMessage({type:'japanese-tower-progress',pct:Math.round(frac*100),stageCn:st?st.cn:'',stageEn:st?st.en:'',done:tt>=DUR-0.001,country:STYLES[styleIdx]?STYLES[styleIdx].id:''},'*');}}catch(e){}"
      )
      .replace(
        'applyStyle(0);\napplyWeather(0,true);\napplyTheme(0,true);\nautoStartAudio();\nlayout();\napplyTime(0);',
        "const _initStyleIdx=(function(){var c=(new URLSearchParams(location.search).get('country')||'').toLowerCase();var m={japan:0,china:1,vietnam:2,thailand:3,thai:3,cambodia:4,turkey:5};return m[c]!==undefined?m[c]:0;})();\napplyStyle(_initStyleIdx);\napplyWeather(0,true);\napplyTheme(0,true);\nautoStartAudio();\nlayout();\napplyTime(window.__isSoftwareGl?3.2:0);"
      )
      .replace(
        'const dt=Math.min(0.05,(now-prev)/1000);prev=now;',
        'const dt=Math.min(window.__isSoftwareGl?0.6:0.05,(now-prev)/1000);prev=now;'
      );

  return {
    name: 'vite-plugin-software-gl-pacer',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/japanese-tower.html')) {
          const htmlPath = path.resolve(import.meta.dirname, 'src/shaders/japanese-tower/Towers.html');
          if (fs.existsSync(htmlPath)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(transformJapaneseTowerHtml(fs.readFileSync(htmlPath, 'utf-8')));
            return;
          }
        }
        if (req.url && req.url.startsWith('/landing-pages/inner-green-3d.html')) {
          const htmlPath = path.resolve(import.meta.dirname, 'public/landing-pages/inner-green-3d.html');
          if (fs.existsSync(htmlPath)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(transformInnerGreenHtml(fs.readFileSync(htmlPath, 'utf-8')));
            return;
          }
        }
        if (req.url && req.url.startsWith('/landing-pages/kage.html')) {
          const htmlPath = path.resolve(import.meta.dirname, 'public/landing-pages/kage.html');
          if (fs.existsSync(htmlPath)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(transformKageHtml(fs.readFileSync(htmlPath, 'utf-8')));
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      const srcTowers = path.resolve(import.meta.dirname, 'src/shaders/japanese-tower/Towers.html');
      const distTowers = path.resolve(import.meta.dirname, 'dist/japanese-tower.html');
      if (fs.existsSync(srcTowers) && fs.existsSync(path.dirname(distTowers))) {
        fs.writeFileSync(distTowers, transformJapaneseTowerHtml(fs.readFileSync(srcTowers, 'utf-8')));
      }
      const distInner = path.resolve(import.meta.dirname, 'dist/landing-pages/inner-green-3d.html');
      if (fs.existsSync(distInner)) {
        fs.writeFileSync(distInner, transformInnerGreenHtml(fs.readFileSync(distInner, 'utf-8')));
      }
      const distKage = path.resolve(import.meta.dirname, 'dist/landing-pages/kage.html');
      if (fs.existsSync(distKage)) {
        fs.writeFileSync(distKage, transformKageHtml(fs.readFileSync(distKage, 'utf-8')));
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [softwareGlHtmlPacerPlugin(), glslRawPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@designcodeio/threeui/style.css': path.resolve(__dirname, 'src/shaders/threeui.css'),
        '@designcodeio/threeui': path.resolve(__dirname, 'src/shaders/index.ts'),
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

