import type {Disolucion} from './types.ts';
import {componentesDe,actualizarVolumen,transferirAlicuota} from './solution.ts';
import {medirAcidez} from './acid-base.ts';

/** Etapas estequiométricas; no garantizan saltos de pH separados. */
export function volumenesEquivalencia(muestra:Disolucion,valorante:Disolucion):number[] {
  const a=componentesDe(muestra),b=componentesDe(valorante);
  const ids=Object.keys(b).filter(id=>b[id].molesN>1e-15 && id!=='NaCl');
  if(ids.length!==1||!['HCl','NaOH'].includes(ids[0])||valorante.volMl<=0)return [];
  const mono=(a.HCl?.molesN||0)+(a.CH3COOH?.molesN||0);
  const di=(a.H2SO4?.molesN||0)+(a.H2Mal?.molesN||0);
  const base=(a.NaOH?.molesN||0)+(a.NH3?.molesN||0),c=b[ids[0]].molesN/valorante.volMl;
  const activos=Object.keys(a).filter(id=>a[id].molesN>1e-15 && id!=='NaCl');
  if(ids[0]==='NaOH'&&activos.length===1&&['H2SO4','H2Mal'].includes(activos[0]))return [di/c,2*di/c];
  const exceso=ids[0]==='NaOH'?mono+2*di-base:base-mono-2*di;
  return exceso>1e-14?[exceso/c]:[];
}
/** Compatibilidad: equivalencia de neutralización total. */
export function volumenEquivalencia(muestra:Disolucion,valorante:Disolucion):number|null {
  return volumenesEquivalencia(muestra,valorante).at(-1)??null;
}
/** La referencia usa el mismo equilibrio y la misma dilución que el experimento. */
export function muestraTrasAdicionar(muestra:Disolucion,valorante:Disolucion,ml:number):Disolucion {
  const destino=structuredClone(muestra);destino.capacidadMax=Infinity;
  if(ml<=0)return destino;
  if(valorante.volMl<=0)throw Error('El valorante debe contener líquido.');
  const origen=structuredClone(valorante),factor=ml/origen.volMl;
  origen.volH2OMl*=factor;
  if(origen.componentes)for(const c of Object.values(origen.componentes)){c.masaG*=factor;c.molesN*=factor;}
  else {origen.masaG*=factor;origen.molesN*=factor;}
  actualizarVolumen(origen);transferirAlicuota(origen,destino,origen.volMl);
  return destino;
}
export function puntosReferencia(muestra:Disolucion,valorante:Disolucion,maxMl:number) {
  const xs=new Set<number>([0]);
  for(let i=1;i<=160;i++)xs.add(maxMl*i/160);
  for(const eq of volumenesEquivalencia(muestra,valorante)){xs.add(eq);for(const f of [0.5,0.1,0.01,0.001,0.0001,0.00001,0.000001]){xs.add(eq*(1-f));xs.add(eq*(1+f));}}
  return [...xs].filter(x=>x>=0&&x<=maxMl).sort((a,b)=>a-b).flatMap(volumenMl=>{
    const m=medirAcidez(muestraTrasAdicionar(muestra,valorante,volumenMl));return m?[{volumenMl,pH:m.pH,pOH:m.pOH}]:[];
  });
}
