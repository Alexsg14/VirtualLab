import type {Disolucion} from './types.ts';
import {actualizarVolumen,componentesDe} from './solution.ts';
export interface ObjetivoPreparacion {soluto:string;volMl:number;molL:number;}
/** Judge the final solution, allowing weighing roundoff but not water-volume preparation. */
export function evaluarPreparacion(rec:Disolucion,reto:ObjetivoPreparacion){
 const copia=structuredClone(rec);actualizarVolumen(copia);
 const activos=Object.entries(componentesDe(copia)).filter(([,c])=>c.masaG>1e-12).map(([id])=>id);
 const molaridad=copia.volMl>0?copia.molesN/(copia.volMl/1000):0;
 const toleranciaVolMl=0.05,toleranciaMolarRel=0.002;
 const objetivoValido=Number.isFinite(reto.volMl)&&reto.volMl>0&&Number.isFinite(reto.molL)&&reto.molL>0;
 const solutoOk=activos.length===1&&activos[0]===reto.soluto&&copia.volH2OMl>0;
 const volumenOk=objetivoValido&&Math.abs(copia.volMl-reto.volMl)<=toleranciaVolMl+1e-9;
 const molaridadOk=objetivoValido&&Math.abs(molaridad-reto.molL)/reto.molL<=toleranciaMolarRel+1e-12;
 return {correcto:solutoOk&&volumenOk&&molaridadOk,solutoOk,volumenOk,molaridadOk,volumenMl:copia.volMl,molaridad,toleranciaVolMl,toleranciaMolarRel};
}