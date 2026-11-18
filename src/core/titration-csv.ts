import type {Disolucion} from './types.ts';
import {componentesDe} from './solution.ts';
import {formulaSoluto} from '../data/catalog.ts';
interface Punto {volumenMl:number;pH:number;pOH:number;temperaturaC:number;volumenDisolucionMl?:number;molesValorante?:number;}
interface Registro {inicial:Disolucion;valorante:Disolucion;puntos:Punto[];datosCSV?:Punto[];obsoleta?:boolean;}
/** UTF-8 BOM, semicolon delimiter and decimal comma for Spanish Excel. */
export function generarCSVValoracion(r:Registro):string {
 const texto=(x:string)=>'"'+x.replace(/"/g,'""')+'"';
 const numero=(x:number|undefined)=>x==null||!Number.isFinite(x)?'':String(Number(x.toPrecision(12))).replace('.',',');
 const formulas=(rec:Disolucion)=>Object.entries(componentesDe(rec)).filter(([,c])=>c.molesN>0).map(([id])=>formulaSoluto(id)).join(' + ');
 const concentracion=r.valorante.volMl>0?r.valorante.molesN/(r.valorante.volMl/1000):undefined;
 const cabecera=['volumen_bureta_mL','pH','pOH','temperatura_C','punto','volumen_disolucion_mL','moles_valorante_acumulados','reactivos_muestra','reactivo_valorante','concentracion_valorante_mol_L','volumen_muestra_inicial_mL','registro_obsoleto'];
 const filas=(r.datosCSV??r.puntos).map((p,i)=>[
  numero(p.volumenMl),numero(p.pH),numero(p.pOH),numero(p.temperaturaC),String(i),numero(p.volumenDisolucionMl),
  numero(p.molesValorante??(concentracion!=null?p.volumenMl*concentracion/1000:undefined)),
  texto(formulas(r.inicial)),texto(formulas(r.valorante)),numero(concentracion),numero(r.inicial.volMl),r.obsoleta?'1':'0'
 ].join(';'));
 return '\uFEFF'+cabecera.join(';')+'\r\n'+filas.join('\r\n')+'\r\n';
}