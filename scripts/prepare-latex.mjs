/** One-time preparation. The resulting public/vendor/latex folder is portable/offline. */
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=fileURLToPath(new URL('../public/vendor/latex/',import.meta.url));
const commit='34edceddc82a8ff0a592ab62bebf060810b8302d',repo='swimmingbrain/texbrain';
const sha=b=>createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
async function valid(path,expected){try{return sha(await readFile(path))===expected;}catch{return false;}}
try {
 const stamp=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
 if(stamp.commit===commit&&await valid(resolve(root,'worker.js'),stamp.workerSha)&&(await Promise.all(stamp.files.map(f=>valid(resolve(root,f.target),f.sha)))).every(Boolean)){
  console.log('LaTeX local preparado: no necesita Internet.');process.exit(0);
 }
}catch{}
console.log('Preparando compilador LaTeX local (solo la primera vez, requiere Internet)...');
try{
 const response=await fetch(`https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`,{headers:{'User-Agent':'VirtualLab'}});
 if(!response.ok)throw Error(`GitHub: ${response.status}`);
 const tree=await response.json();if(tree.sha!==commit||tree.truncated)throw Error('Indice de recursos incompleto.');
 const names=/\/(article\.cls|size11\.clo|fontenc\.sty|inputenc\.sty|utf8\.def|utf8enc\.dfu|t1enc\.(def|dfu)|ot1enc\.(def|dfu)|omsenc\.(def|dfu)|omlenc\.(def|dfu)|ts1enc\.(def|dfu)|geometry\.(sty|cfg)|keyval\.sty|if[a-z0-9-]*\.(sty|tex)|lmodern\.sty|[a-z0-9]*lm[a-z0-9]*\.fd|ams[a-z0-9]*\.(sty|cfg)|[a-z0-9]*cm[a-z0-9]*\.fd|umsa\.fd|umsb\.fd|xcolor\.sty|color\.cfg|pdftex\.(def|map)|mathcolor\.ltx|longtable\.sty|array\.sty|booktabs\.sty|l3[a-z0-9-]*\.(sty|tex|def)|expl3\.(sty|ltx)|[a-z0-9-]*backend[a-z0-9-]*\.def|[a-z0-9-]*\.enc|[a-z0-9-]*\.map|glyphtounicode\.tex|supp-pdf\.mkii|epstopdf-base\.sty|epstopdf-sys\.cfg|infwarerr\.sty|ltxcmds\.sty|pdftexcmds\.sty|kv[a-z0-9-]*\.sty|etexcmds\.sty|auxhook\.sty|pdfescape\.sty)$/;
 const fonts=/\/(?:[a-z0-9-]*lm[a-z0-9-]*|cm[a-z0-9]+|ms[ab][0-9]+)\.(tfm|pfb|vf)$/;
 const files=tree.tree.filter(x=>x.type==='blob'&&(x.path==='LICENSE'||x.path==='THIRD_PARTY_LICENSES'||/^static\/swiftlatex\/swiftlatexpdftex\.(js|wasm)$/.test(x.path)||x.path.endsWith('swiftlatexpdftex.fmt')||(x.path.startsWith('static/texlive/cache/')&&(names.test(x.path)||fonts.test(x.path)))))
 .map(x=>({path:x.path,target:x.path.replace(/^static\/swiftlatex\//,'').replace(/^static\/texlive\/(?:cache\/|pdftex\/10\/)/,'tex/'),sha:x.sha,size:x.size}));
 let next=0,done=0;
 await Promise.all(Array.from({length:6},async()=>{while(next<files.length){const f=files[next++],dest=resolve(root,f.target);if(!dest.startsWith(root))throw Error('Ruta no valida');if(!await valid(dest,f.sha)){
  let success=false;for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(`https://raw.githubusercontent.com/${repo}/${commit}/${f.path}`,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`HTTP ${r.status}: ${f.path}`);const bytes=Buffer.from(await r.arrayBuffer());if(sha(bytes)!==f.sha)throw Error('Integridad incorrecta');await mkdir(dirname(dest),{recursive:true});await writeFile(dest+'.part',bytes);await rename(dest+'.part',dest);success=true;break;}catch(e){if(attempt===2)throw e;}}if(!success)throw Error('Descarga incompleta');}
  done++;if(done%100===0)console.log(`${done}/${files.length} recursos`);
 }}));
 // Preload all dependencies into the worker: compilation never contacts a package server.
 const worker=await readFile(resolve(root,'swiftlatexpdftex.js'),'utf8');
 const offline='const remote_url=self.texlive_endpoint+"pdftex/"+cacheKey;';
 if(!worker.includes(offline))throw Error('Version de motor no compatible');
 await writeFile(resolve(root,'worker.js'),worker.replace(offline,'return 0;'+offline));
 const workerSha=sha(await readFile(resolve(root,'worker.js')));
 await writeFile(resolve(root,'manifest.json'),JSON.stringify({commit,repository:repo,workerSha,files}));
 console.log(`LaTeX preparado (${files.length} archivos). Copia public/vendor/latex con el laboratorio para usarlo sin Internet.`);
}catch(e){console.error('No se pudo preparar LaTeX: '+e.message+'\nEjecuta npm run preparar:latex con conexion a Internet. El laboratorio puede seguir utilizandose.');process.exitCode=1;}