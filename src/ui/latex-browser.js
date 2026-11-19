/** Compiles a fixed diary template on this PC. No API or native TeX process. */
let busy=false;
const base=()=>new URL(`${import.meta.env.BASE_URL}vendor/latex/`,location.href);
export async function compilarDiarioPDF(source,onStatus=()=>{}){
 if(busy)throw Error('Ya hay un diario compilándose.');
 busy=true;let worker;
 try{
  onStatus('Cargando el compilador local de LaTeX…');
  const root=base(),response=await fetch(new URL('manifest.json',root));
  if(!response.ok||!response.headers.get('content-type')?.includes('json'))throw Error('Falta preparar LaTeX. Ejecuta npm run preparar:latex una vez con Internet; después podrás copiar y usar el laboratorio sin conexión.');
  const manifest=await response.json();
  const files=manifest.files.filter(f=>f.target.startsWith('tex/'));
  worker=new Worker(new URL('worker.js',root));
  function wait(predicate,timeout=90000){return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>finish(Error('La compilación ha superado el tiempo de espera.')),timeout);
   const message=e=>{if(predicate(e.data))finish(null,e.data);};
   const error=()=>finish(Error('No se pudo cargar el compilador LaTeX local.'));
   function finish(err,value){clearTimeout(timer);worker.removeEventListener('message',message);worker.removeEventListener('error',error);err?reject(err):resolve(value);}
   worker.addEventListener('message',message);worker.addEventListener('error',error);
  });}
  await wait(d=>d.result==='ok'&&!d.cmd);
  worker.postMessage({cmd:'settexliveurl',url:new URL('unavailable/',root).href});
  onStatus('Cargando fuentes y paquetes locales…');
  let index=0;
  await Promise.all(Array.from({length:8},async()=>{while(index<files.length){const f=files[index++],r=await fetch(new URL(f.target,root));if(!r.ok)throw Error('Falta un recurso local de LaTeX: '+f.target);const bytes=await r.arrayBuffer();worker.postMessage({cmd:'writebinaryfile',url:'/tex/'+f.target.slice(4),src:bytes},[bytes]);}}));
  worker.postMessage({cmd:'writefile',url:'diario.tex',src:source});
  worker.postMessage({cmd:'setmainfile',url:'diario.tex'});
  onStatus('Compilando el PDF en este ordenador…');
  // Two passes resolve longtable widths and page references.
  let result;for(let pass=0;pass<2;pass++){
   const pending=wait(d=>d.cmd==='compile');worker.postMessage({cmd:'compilelatex'});result=await pending;
   if(result.result!=='ok'||result.status!==0||!result.pdf){console.error(result.log);throw Error('LaTeX no ha podido compilar el diario. Puedes descargar el .tex para revisar el documento.');}
  }
  const bytes=new Uint8Array(result.pdf);if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw Error('El compilador no devolvió un PDF válido.');
  return new Blob([bytes],{type:'application/pdf'});
 }finally{worker?.terminate();busy=false;}
}