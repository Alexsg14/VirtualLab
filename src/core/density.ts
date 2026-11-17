import {SOLUTOS} from '../data/catalog.ts';
import {DENSIDADES} from '../data/density.ts';
import type {Disolucion} from './types.ts';

export interface VolumenCalculado {
 volumenMl:number;masaAguaG:number;aguaLibreG:number;volumenAguaMl:number;densidadGmL:number|null;
 modelo:'laliberte'|'aproximado'|'agua'|'seco';avisos:string[];fuente?:string;
}
/** Densidad del agua: correlación usada por los anexos, g/mL. */
export function densidadAgua(t=25):number {
 return (((((-2.8054253e-10*t+1.0556302e-7)*t-4.6170461e-5)*t-.0079870401)*t+16.945176)*t+999.83952)/(1+.01687985*t)/1000;
}
export const RHO_AGUA_25=densidadAgua(25);
/** volH2OMl se conserva como volumen equivalente de agua pura a 25 °C.
 * Es un inventario proporcional a la masa, no el volumen parcial en disolución.
 * Mantiene compatibles reservas antiguas, transferencias y deshacer.
 */
export function masaAguaLibre(rec:Disolucion):number{return rec.volH2OMl*RHO_AGUA_25;}
export function densidadLaliberte(id:string,t:number,w:number):number {
 const data=DENSIDADES[id];if(!data)throw Error('No hay datos de densidad para '+id);
 const [c0,c1,c2,c3,c4]=data.c;
 // Evaluar 1/rho_aparente directamente: puede ser negativo por electrostricción.
 // Evita una división intermedia infinita donde el volumen aparente cruza cero.
 const especifico=(w+c2+c3*t)/((c0*w+c1)*Math.exp(1e-6*(t+c4)**2));
 return 1/((1-w)/(densidadAgua(t)*1000)+w*especifico)/1000;
}
export function evaluarVolumen(rec:Disolucion):VolumenCalculado {
 const t=rec.temperaturaC??25,aguaLibreG=masaAguaLibre(rec),avisos:string[]=[];
 const componentes=rec.componentes??(rec.masaG>0?{[rec.soluteId]:{masaG:rec.masaG,molesN:rec.molesN}}:{});
 const ids=Object.keys(componentes).filter(id=>componentes[id].masaG>1e-12);
 let masaSoluto=0,aguaCristal=0,deltaAprox=0;
 for(const id of ids){
  const s=SOLUTOS.find(s=>s.id===id);if(!s)throw Error('Soluto desconocido: '+id);
  const c=componentes[id];masaSoluto+=c.masaG;deltaAprox+=c.masaG*s.volAparenteG;
  aguaCristal+=c.molesN*(DENSIDADES[id]?.aguasHidratacion??0)*18.01528;
 }
 const masaAguaG=aguaLibreG+aguaCristal,aguaVol=masaAguaG/densidadAgua(t),total=aguaLibreG+masaSoluto;
 const result=(volumenMl:number,modelo:VolumenCalculado['modelo'],fuente?:string):VolumenCalculado=>({volumenMl,masaAguaG,aguaLibreG,volumenAguaMl:aguaVol,densidadGmL:volumenMl>0&&masaAguaG>0?total/volumenMl:null,modelo,avisos,fuente});
 if(masaAguaG<=0)return result(deltaAprox,'seco');
 if(!ids.length)return result(aguaVol,'agua','Correlación de agua de Laliberté (2009)');
 if(ids.length===1&&DENSIDADES[ids[0]]){
  const id=ids[0],data=DENSIDADES[id],w=(masaSoluto-aguaCristal)/total;
  if(t<data.tMin||t>data.tMax)avisos.push('Temperatura fuera de los datos ('+data.tMin.toFixed(1)+'–'+data.tMax.toFixed(1)+' °C): extrapolación.');
  if(w>data.wMax)avisos.push('Concentración fuera del máximo de datos ('+(data.wMax*100).toFixed(2)+' % en masa): extrapolación.');
  if(w<data.wMinDatos)avisos.push('Concentración inferior al mínimo de datos disponibles: extrapolación hacia dilución infinita.');
  const rho=densidadLaliberte(id,t,w);
  if(Number.isFinite(rho)&&rho>0)return result(total/rho,'laliberte','Laliberté (2009), DOI 10.1021/je8008123; '+data.archivo);
  avisos.push('La correlación no da una densidad física en estas condiciones. Se usa el modelo aproximado.');
 }else avisos.push(ids.length>1?'Mezcla de reactivos: volumen aproximado; las correlaciones de un soluto no se aplican a la reacción.':'Sin parámetros de densidad verificados para este soluto: volumen aproximado.');
 return result(aguaVol+deltaAprox,'aproximado');
}
