import type {Disolucion} from './types.ts';
import {actualizarVolumen,calcularConcentraciones,componentesDe} from './solution.ts';
import {RHO_AGUA_25} from './density.ts';
import {medirAcidez} from './acid-base.ts';
import {SOLUTOS,NOMBRES_RECIPIENTE} from '../data/catalog.ts';
export interface ReservaComparable {nombre:string;fecha?:string;rec:Disolucion&{tipo?:string};}
/** A read-only snapshot: none of the source reservations or active vessels are changed. */
export function compararDisoluciones(reservas:ReservaComparable[]){
 if(reservas.length<2)throw Error('Selecciona al menos dos disoluciones guardadas.');
 return reservas.map((f,index)=>{
  const r=structuredClone(f.rec);if(![r.masaG,r.molesN,r.volH2OMl,r.temperaturaC??25].every(Number.isFinite)||r.masaG<0||r.molesN<0||r.volH2OMl<=0)throw Error('La disolución guardada «'+f.nombre+'» no contiene datos válidos.');
  actualizarVolumen(r);if(!Number.isFinite(r.volMl)||r.volMl<=0)throw Error('Volumen guardado no válido.');
  const componentes=Object.entries(componentesDe(r)).filter(([,v])=>v.masaG>0||v.molesN>0).map(([id,v])=>({id,nombre:SOLUTOS.find(s=>s.id===id)?.nombre??id,formula:SOLUTOS.find(s=>s.id===id)?.formula??id,...v}));
  const mezcla=componentes.length>1,c=calcularConcentraciones(r),v=r.modeloVolumen!,ph=medirAcidez(r);
  const avisos=[...v.avisos];if(mezcla)avisos.push('Mezcla de reactivos: no se asigna una molaridad o molalidad única; las cantidades registradas no representan la especiación de equilibrio.');
  return {numero:index+1,nombre:f.nombre,fecha:f.fecha??'',sustancias:componentes.length?componentes.map(x=>x.nombre+' ('+x.formula+')').join(' + '):'Agua (H₂O)',componentes,mezcla,
   recipiente:NOMBRES_RECIPIENTE[(r.tipo??'vaso') as keyof typeof NOMBRES_RECIPIENTE]??r.tipo??'Recipiente',capacidadMl:r.capacidadMax??null,
   masaG:r.masaG,molesN:mezcla||!componentes.length?null:r.molesN,masaAguaG:v.masaAguaG,aguaEquivalente25Ml:v.masaAguaG/RHO_AGUA_25,volumenMl:r.volMl,
   molaridad:mezcla||!componentes.length?null:c.molaridad,masica:c.masica,pMasa:c.pMasa,ppm:c.ppm,molalidad:mezcla||!componentes.length?null:c.molalidad,
   temperaturaC:r.temperaturaC??25,densidadGmL:v.densidadGmL,pH:ph?.pH??null,modelo:v.modelo,fuente:v.fuente??'',avisos};
 });
}
export type DisolucionComparada=ReturnType<typeof compararDisoluciones>[number];
/** Spreadsheet-safe text, decimal comma and UTF-8 BOM for Spanish Excel. */
export function generarCSVComparacion(rows:DisolucionComparada[]):string{
 const text=(value:unknown)=>{let s=String(value??'');if(/^\s*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const n=(x:number|null)=>x===null||!Number.isFinite(x)?'':String(Number(x.toPrecision(12))).replace('.',',');
 const headers=['ensayo','nombre','fecha_guardado','sustancias_o_reactivos','recipiente','capacidad_mL','masa_soluto_registrada_g','moles_soluto','agua_presente_g','agua_equivalente_25C_mL','volumen_final_mL','concentracion_mol_L','concentracion_g_L','porcentaje_m_m','ppm_mg_kg_disolucion','molalidad_mol_kg_agua','temperatura_C','densidad_g_mL','pH_modelo_ideal','modelo_volumen','fuente','avisos'];
 return '\uFEFF'+headers.join(';')+'\r\n'+rows.map(r=>[String(r.numero),text(r.nombre),text(r.fecha),text(r.sustancias),text(r.recipiente),n(r.capacidadMl),n(r.masaG),n(r.molesN),n(r.masaAguaG),n(r.aguaEquivalente25Ml),n(r.volumenMl),n(r.molaridad),n(r.masica),n(r.pMasa),n(r.ppm),n(r.molalidad),n(r.temperaturaC),n(r.densidadGmL),n(r.pH),text(r.modelo),text(r.fuente),text(r.avisos.join(' | '))].join(';')).join('\r\n')+'\r\n';
}