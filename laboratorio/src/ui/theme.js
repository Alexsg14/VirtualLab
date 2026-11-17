export function iniciarTema(){
 const tip=document.createElement('div');tip.id='insignia-tooltip';tip.role='tooltip';tip.hidden=true;document.body.appendChild(tip);
 const ocultar=()=>{tip.hidden=true;};
 for(const badge of document.querySelectorAll('.insignia[data-tooltip]')){
  badge.tabIndex=0;badge.removeAttribute('title');badge.setAttribute('aria-describedby',tip.id);
  const mostrar=()=>{
   tip.textContent=badge.dataset.tooltip+(badge.classList.contains('bloqueada')?' · Pendiente':' · Conseguida');tip.hidden=false;
   const rect=badge.getBoundingClientRect();
   tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,rect.left+rect.width/2-tip.offsetWidth/2))+'px';
   tip.style.top=Math.max(8,Math.min(innerHeight-tip.offsetHeight-8,rect.bottom+10))+'px';
  };
  badge.addEventListener('pointerenter',mostrar);badge.addEventListener('pointerleave',ocultar);badge.addEventListener('focus',mostrar);badge.addEventListener('blur',ocultar);
 }
 window.addEventListener('resize',ocultar);window.addEventListener('scroll',ocultar,true);document.addEventListener('keydown',e=>{if(e.key==='Escape')ocultar();});
 const selector=document.getElementById('tema-laboratorio');
 const aplicar=tema=>{
  document.documentElement.dataset.tema=tema;
  selector.checked=tema==='dark';
  window.dispatchEvent(new Event('laboratorio-tema'));
 };
 let tema='dark';try{tema=localStorage.getItem('lab_tema')==='light'?'light':'dark';}catch{}
 aplicar(tema);
 selector.addEventListener('change',()=>{const tema=selector.checked?'dark':'light';aplicar(tema);try{localStorage.setItem('lab_tema',tema);}catch{}});
}
