import type {Disolucion,Concentraciones} from './types.ts';
import {actualizarVolumen,componentesDe,calcularConcentraciones} from './solution.ts';
import {SOLUTOS,formulaSoluto} from '../data/catalog.ts';
export const UNIDADES_RETO={
 'mol/L':{nombre:'Molaridad',campo:'molaridad',ayuda:'Moles de soluto por litro de disolución final.'},
 'g/L':{nombre:'Concentración másica',campo:'masica',ayuda:'Gramos de soluto por litro de disolución final.'},
 '% m/m':{nombre:'Porcentaje en masa',campo:'pMasa',ayuda:'Gramos de soluto por cada 100 g de disolución (soluto + agua).'},
 'ppm':{nombre:'Partes por millón',campo:'ppm',ayuda:'Aquí ppm significa mg de soluto por kg de disolución; no mg/L.'},
 'mol/kg':{nombre:'Molalidad',campo:'molalidad',ayuda:'Moles de soluto por kg de agua, no por kg de disolución.'}
} as const;
export type UnidadReto=keyof typeof UNIDADES_RETO;
export interface ObjetivoPreparacion {soluto:string;volMl:number;molL?:number;unidad?:UnidadReto;concentracion?:number;texto?:string;}
/** Check final volume and concentration independently in the requested unit. */
export function evaluarPreparacion(rec:Disolucion,reto:ObjetivoPreparacion){
 const copia=structuredClone(rec);actualizarVolumen(copia);
 const activos=Object.entries(componentesDe(copia)).filter(([,c])=>c.masaG>1e-12).map(([id])=>id);
 const unidad=reto.unidad??'mol/L',objetivo=reto.concentracion??reto.molL??NaN;
 const descriptor=UNIDADES_RETO[unidad];
 const valores=calcularConcentraciones(copia),concentracion=descriptor?valores[descriptor.campo as keyof Concentraciones]:NaN;
 const toleranciaVolMl=0.05,toleranciaConcentracionRel=0.002;
 const objetivoValido=!!descriptor&&Number.isFinite(reto.volMl)&&reto.volMl>0&&Number.isFinite(objetivo)&&objetivo>0&&(unidad!=='% m/m'||objetivo<100)&&(unidad!=='ppm'||objetivo<1e6);
 const solutoOk=activos.length===1&&activos[0]===reto.soluto&&copia.volH2OMl>0;
 const volumenOk=objetivoValido&&Math.abs(copia.volMl-reto.volMl)<=toleranciaVolMl+1e-9;
 const diferenciaRel=Math.abs(concentracion-objetivo)/objetivo;
 const concentracionOk=objetivoValido&&diferenciaRel<=toleranciaConcentracionRel+1e-12;
 return {correcto:solutoOk&&volumenOk&&concentracionOk,solutoOk,volumenOk,concentracionOk,unidad,objetivo,concentracion,diferenciaRel,volumenMl:copia.volMl,toleranciaVolMl,toleranciaConcentracionRel,
  molaridad:valores.molaridad,molaridadOk:objetivoValido&&Math.abs(valores.molaridad-(reto.molL??(unidad==='mol/L'?objetivo:NaN)))/(reto.molL??objetivo)<=toleranciaConcentracionRel+1e-12};
}
/** Strict full-string parser. M = mol/L, m = mol/kg; comma decimals accepted. */
export function parsearReto(texto:string):ObjetivoPreparacion {
 const match=texto.trim().match(/^(\d+(?:[.,]\d+)?)\s*mL\s+(\S+)\s+(\d+(?:[.,]\d+)?)\s*(mol\s*\/\s*L|g\s*\/\s*L|%\s*m\s*\/\s*m|ppm|mol\s*\/\s*kg|M|m)\s*$/);
 if(!match)throw Error('Formato: 250 mL NaCl 10 g/L. Unidades: mol/L (M), g/L, % m/m, ppm o mol/kg (m).');
 const volMl=Number(match[1].replace(',','.')),concentracion=Number(match[3].replace(',','.'));
 const id=match[2].replace(/[\u2080-\u2089]/g,c=>String(c.charCodeAt(0)-0x2080));
 const soluto=SOLUTOS.find(s=>s.id===id||s.formula.replace(/[\u2080-\u2089]/g,c=>String(c.charCodeAt(0)-0x2080))===id);
 if(!soluto)throw Error('Sustancia no reconocida. Usa una sustancia del catálogo, por ejemplo NaCl o CuSO₄.');
 const raw=match[4].replace(/\s/g,''),unidad=(raw==='M'?'mol/L':raw==='m'?'mol/kg':raw==='%m/m'?'% m/m':raw) as UnidadReto;
 if(!(volMl>0&&concentracion>0)||!Number.isFinite(volMl)||!Number.isFinite(concentracion)||(unidad==='% m/m'&&concentracion>=100)||(unidad==='ppm'&&concentracion>=1e6))throw Error('El volumen y la concentración deben ser positivos; el porcentaje en masa debe ser menor de 100 %.');
 return {soluto:soluto.id,volMl,concentracion,unidad,texto:`Prepara ${volMl} mL de ${formulaSoluto(soluto.id)} a ${concentracion} ${unidad}`};
}