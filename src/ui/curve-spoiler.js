let ui,record,shown=false,frame=0;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function init(){
 if(ui)return;
 const svg=document.getElementById('curva-svg'),wrapper=document.createElement('div');wrapper.className='curve-spoiler';
 svg.before(wrapper);const content=document.createElement('div');content.className='curve-spoiler-content';wrapper.append(content);
 for(const node of [svg,svg.nextElementSibling,document.getElementById('curva-detalle'),document.getElementById('curva-equivalencia'),document.getElementById('curva-condiciones')])if(node)content.append(node);
 const cover=document.createElement('div');cover.className='curve-spoiler-cover';
 cover.innerHTML='<canvas aria-hidden="true"></canvas><div class="curve-spoiler-prompt"><span class="spoiler-eyebrow">ANTES DE VER LA RESPUESTA</span><button type="button" class="spoiler-reveal">Spoiler · Visualizar al terminar</button><p>Termina tu valoración y compara después los resultados.</p></div>';
 wrapper.append(cover);const hide=document.createElement('button');hide.type='button';hide.className='spoiler-hide';hide.textContent='Volver a ocultar gráfica';wrapper.after(hide);
 const dialog=document.createElement('dialog');dialog.className='spoiler-dialog';dialog.setAttribute('aria-labelledby','spoiler-dialog-title');dialog.setAttribute('aria-describedby','spoiler-dialog-description');
 dialog.innerHTML='<form method="dialog"><span class="spoiler-eyebrow">REVELAR RESULTADOS</span><h2 id="spoiler-dialog-title">¿Seguro que quieres ver la gráfica?</h2><p id="spoiler-dialog-description">Verás la curva y las equivalencias previstas. Puedes seguir trabajando y volver a ocultarla cuando quieras.</p><div class="spoiler-dialog-actions"><button value="cancel" autofocus>Seguir experimentando</button><button value="reveal" class="spoiler-confirm">Sí, visualizar</button></div></form>';
 document.body.append(dialog);
 const canvas=cover.querySelector('canvas'),ctx=canvas.getContext('2d');
 const particles=Array.from({length:430},()=>({x:Math.random(),y:Math.random(),r:.5+Math.random()*1.5,phase:Math.random()*Math.PI*2,speed:.4+Math.random()}));
 ui={wrapper,content,cover,hide,dialog,canvas,ctx,particles};
 cover.querySelector('button').addEventListener('click',()=>{dialog.returnValue='cancel';dialog.showModal();});
 dialog.addEventListener('close',()=>{if(dialog.returnValue==='reveal'){shown=true;apply();hide.focus();}});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close('cancel');}});
 hide.addEventListener('click',()=>{shown=false;apply();cover.querySelector('button').focus();});
}
function paint(time){
 frame=0;if(shown||document.getElementById('ventana-curva').hidden)return;
 const {canvas,ctx,particles,cover}=ui,w=cover.clientWidth,h=cover.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
 if(w&&h){if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const light=document.documentElement.dataset.tema==='light',t=reduced()?0:time*.0001;
 for(const p of particles){const x=((p.x+t*p.speed*.08)%1)*w+Math.sin(t*7+p.phase)*3,y=((p.y+t*p.speed*.03)%1)*h;ctx.fillStyle=light?'rgba(40,73,91,'+(0.2+.45*Math.abs(Math.sin(p.phase+t*3)))+')':'rgba(224,238,245,'+(0.25+.6*Math.abs(Math.sin(p.phase+t*3)))+')';ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();}}
 if(!reduced())frame=requestAnimationFrame(paint);
}
function apply(){
 ui.wrapper.classList.toggle('is-revealed',shown);ui.content.inert=!shown;ui.content.setAttribute('aria-hidden',String(!shown));ui.cover.hidden=shown;ui.hide.hidden=!shown;
 if(frame){cancelAnimationFrame(frame);frame=0;}if(!shown)paint(performance.now());
}
/** A fresh titration starts concealed; reopening the same record preserves its state. */
export function actualizarSpoilerCurva(currentRecord){
 init();if(record!==currentRecord){record=currentRecord;shown=false;}apply();
}