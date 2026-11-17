
export let panelLaboratorioAbierto=null;

export function cerrarPanelLaboratorio(devolverFoco=true) {
  if(!panelLaboratorioAbierto)return;
  const id=panelLaboratorioAbierto;
  document.getElementById('flotante-'+id).hidden=true;
  document.getElementById('menu-'+id).setAttribute('aria-expanded','false');
  panelLaboratorioAbierto=null;
  if(devolverFoco)document.getElementById('menu-'+id).focus();
}

export function alternarPanelLaboratorio(id) {
  const anterior=panelLaboratorioAbierto;cerrarPanelLaboratorio(false);
  if(anterior===id)return;
  const panel=document.getElementById('flotante-'+id);
  panel.hidden=false;panelLaboratorioAbierto=id;
  document.getElementById('menu-'+id).setAttribute('aria-expanded','true');
  ajustarPanelLaboratorio(panel);
  panel.querySelector('.lab-floating-header button').focus();
}

export function ajustarPanelLaboratorio(panel) {
  if(window.innerWidth<=700) {
    const top=Math.max(72,document.getElementById('sidebar-left').getBoundingClientRect().bottom+8);
    panel.style.top=top+'px';panel.style.maxHeight=Math.max(120,window.innerHeight-top-12)+'px';
  }
  const rect=panel.getBoundingClientRect();
  panel.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-rect.width-8))+'px';
  panel.style.top=Math.max(8,Math.min(rect.top,window.innerHeight-Math.min(rect.height,window.innerHeight-16)-8))+'px';
}

export function iniciarPanelesLaboratorio() {
  document.querySelectorAll('.lab-floating-header').forEach(header=>{
    let drag=null;
    header.addEventListener('pointerdown',e=>{
      if(e.button!==0 || e.target.closest('button'))return;
      const panel=header.parentElement,rect=panel.getBoundingClientRect();
      drag={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top};
      header.setPointerCapture(e.pointerId);e.preventDefault();
    });
    header.addEventListener('pointermove',e=>{
      if(!drag)return;
      const panel=header.parentElement;
      panel.style.left=drag.left+e.clientX-drag.x+'px';panel.style.top=drag.top+e.clientY-drag.y+'px';
      ajustarPanelLaboratorio(panel);
    });
    header.addEventListener('pointerup',()=>drag=null);
    header.addEventListener('pointercancel',()=>drag=null);
    header.addEventListener('lostpointercapture',()=>drag=null);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && panelLaboratorioAbierto){e.preventDefault();cerrarPanelLaboratorio();}});
  window.addEventListener('resize',()=>{if(panelLaboratorioAbierto)ajustarPanelLaboratorio(document.getElementById('flotante-'+panelLaboratorioAbierto));});
}
