import {build} from 'vite';
import {mkdir,writeFile,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import config from '../vite.config.js';
const root=fileURLToPath(new URL('../',import.meta.url));
// Compilar en memoria y guardar mediante Node también funciona en entornos administrados.
const result=await build({...config,root,configFile:false,build:{...config.build,write:false,emptyOutDir:false}});
const out=resolve(root,'dist');
await cp(resolve(root,'public'),out,{recursive:true});
const payload=process.env.VIRTUAL_LAB_BUILD_PAYLOAD;
if(payload){
 const files=(Array.isArray(result)?result:[result]).flatMap(bundle=>bundle.output.map(item=>({fileName:item.fileName,base64:Buffer.from(item.type==='chunk'?item.code:item.source).toString('base64')})));
 await writeFile(payload,JSON.stringify(files));console.log('Compilación en memoria completada.');
}else {
for(const bundle of Array.isArray(result)?result:[result]){
 for(const item of bundle.output){
  const dest=resolve(out,item.fileName);
  if(!dest.startsWith(out+'\\')&&!dest.startsWith(out+'/'))throw Error('Salida fuera de dist');
  await mkdir(dirname(dest),{recursive:true});
  await writeFile(dest,item.type==='chunk'?item.code:item.source);
 }
}
console.log('Versión compilada guardada en dist.');

}
