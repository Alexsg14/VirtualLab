import type {Disolucion} from './types.ts';
import {botePorId} from '../data/reagent-bottles.ts';
import {componentesDe,actualizarVolumen} from './solution.ts';
import {RHO_AGUA_25,masaAguaLibre} from './density.ts';
export interface AporteComercial {productoId:string;cantidad:number;unidad:'mL'|'g';masaProductoG:number;masaSolutoG:number;masaAguaG:number;moles:number;fraccionMasica:number;densidadGmL?:number;temperaturaC:number;idealizado:boolean;}
export function calcularAporteComercial(productoId:string,cantidad:number):AporteComercial{
 const b=botePorId(productoId);if(!Number.isFinite(cantidad)||cantidad<=0)throw Error('Indica una cantidad positiva y finita.');
 const masaProductoG=b.estado==='disolucion'?cantidad*b.densidadGmL!:cantidad;
 const masaSolutoG=masaProductoG*b.fraccionMasica,masaAguaG=masaProductoG-masaSolutoG,moles=masaSolutoG/b.M;
 if(![masaProductoG,masaSolutoG,masaAguaG,moles].every(Number.isFinite))throw Error('Cantidad fuera del rango numérico.');
 return {productoId,cantidad,unidad:b.estado==='disolucion'?'mL':'g',masaProductoG,masaSolutoG,masaAguaG,moles,fraccionMasica:b.fraccionMasica,densidadGmL:b.densidadGmL,temperaturaC:b.temperaturaC,idealizado:b.estado==='solido'};
}
/** Addition is atomic. Stock water is conserved as mass; final volume is recalculated. */
export function anadirDesdeBote(rec:Disolucion,productoId:string,cantidad:number,capacidadMl:number,permitirReaccion=false):AporteComercial{
 const b=botePorId(productoId),aporte=calcularAporteComercial(productoId,cantidad),cs=componentesDe(rec);
 if(!Number.isFinite(capacidadMl)||capacidadMl<=0)throw Error('Capacidad de recipiente no válida.');
 if(!permitirReaccion&&Object.entries(cs).some(([id,c])=>c.masaG>0&&id!==b.soluteId))throw Error('En Disoluciones solo se admite un soluto. Usa un recipiente vacío o el mismo soluto.');
 if(permitirReaccion&&Object.keys(cs).some(id=>!['HCl','NaOH','NaCl','CH3COOH','NH3','H2SO4','H2Mal'].includes(id)))throw Error('El recipiente contiene un soluto fuera del modelo ácido-base.');
 const copia=structuredClone(rec),masaAnterior=rec.masaG+masaAguaLibre(rec);
 copia.temperaturaC=(masaAnterior*(rec.temperaturaC??25)+aporte.masaProductoG*b.temperaturaC)/(masaAnterior+aporte.masaProductoG);
 copia.componentes=structuredClone(cs);copia.componentes[b.soluteId]??={masaG:0,molesN:0};
 copia.componentes[b.soluteId].masaG+=aporte.masaSolutoG;copia.componentes[b.soluteId].molesN+=aporte.moles;
 copia.volH2OMl+=aporte.masaAguaG/RHO_AGUA_25;
 if(rec.masaG===0)copia.soluteId=b.soluteId;
 copia.acidBase=permitirReaccion||rec.acidBase;copia.capacidadMax=capacidadMl;
 actualizarVolumen(copia);if(!permitirReaccion&&!rec.acidBase)copia.componentes=undefined;
 if(!Number.isFinite(copia.volMl)||copia.volMl>capacidadMl+1e-8)throw Error('El volumen resultante supera la capacidad del recipiente.');
 Object.assign(rec,copia);return aporte;
}
/** Nominal preparation calculation. Does not automatically dispense or enrase. */
export function calcularPreparacionComercial(productoId:string,cMolar:number,volumenFinalMl:number){
 const b=botePorId(productoId);if(!Number.isFinite(cMolar)||cMolar<=0||!Number.isFinite(volumenFinalMl)||volumenFinalMl<=0)throw Error('Indica una concentración y un volumen final positivos.');
 const moles=cMolar*volumenFinalMl/1000,masaSolutoG=moles*b.M,masaProductoG=masaSolutoG/b.fraccionMasica;
 const cantidad=b.estado==='disolucion'?masaProductoG/b.densidadGmL!:masaProductoG;
 const cBote=b.estado==='disolucion'?b.fraccionMasica*b.densidadGmL!*1000/b.M:null;
 if(cBote!==null&&cMolar>cBote)throw Error('La concentración objetivo supera la del bote: no se alcanza por dilución.');
 if(![moles,masaSolutoG,masaProductoG,cantidad].every(Number.isFinite))throw Error('Objetivo fuera del rango numérico.');
 return {moles,masaSolutoG,masaProductoG,cantidad,unidad:b.estado==='disolucion'?'mL':'g',cBote};
}