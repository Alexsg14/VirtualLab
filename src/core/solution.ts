import {SOLUTOS} from '../data/catalog.ts';
import {REACTIVOS_AB} from './acid-base.ts';
import {evaluarVolumen,masaAguaLibre,densidadAgua,RHO_AGUA_25} from './density.ts';
import type {Disolucion,Concentraciones,Componente} from './types.ts';
export function componentesDe(rec:Disolucion):Record<string,Componente> {
  return rec.componentes || (rec.masaG>0?{[rec.soluteId]:{masaG:rec.masaG,molesN:rec.molesN}}:{});
}
export function puedeCombinar(a:Disolucion,b:Disolucion):boolean {
  if(a.masaG===0 || b.masaG===0 || (!a.componentes && !b.componentes && a.soluteId===b.soluteId))return true;
  return !!(a.acidBase && b.acidBase && [...Object.keys(componentesDe(a)),...Object.keys(componentesDe(b))].every(id=>REACTIVOS_AB.includes(id)));
}
export function actualizarVolumen(rec:Disolucion):void {
  if(rec.componentes){rec.masaG=0;rec.molesN=0;for(const c of Object.values(rec.componentes)){rec.masaG+=c.masaG;rec.molesN+=c.molesN;}}
  rec.modeloVolumen=evaluarVolumen(rec);
  rec.volMl=rec.volSolucionMl=rec.modeloVolumen.volumenMl;
}
/** Conserva masa de agua. El campo histórico es volumen equivalente a 25 °C. */
export function agregarAgua(rec:Disolucion,ml:number,temperatura=25):void {
  if(!Number.isFinite(ml)||ml<0)throw Error('Volumen de agua no válido.');
  const aguaNuevaG=ml*densidadAgua(temperatura),masa=rec.masaG+masaAguaLibre(rec);
  rec.temperaturaC=masa+aguaNuevaG>0?(masa*(rec.temperaturaC??25)+aguaNuevaG*temperatura)/(masa+aguaNuevaG):temperatura;
  rec.volH2OMl+=aguaNuevaG/RHO_AGUA_25;actualizarVolumen(rec);
}
/** Bisección sobre el agua añadida, incluyendo dilución y mezcla térmica. */
export function aguaParaEnrasar(rec:Disolucion,objetivoMl:number,temperaturaAgua=25):number {
  const base=structuredClone(rec);actualizarVolumen(base);
  if(!Number.isFinite(objetivoMl)||objetivoMl<=0||objetivoMl<base.volMl-1e-8)throw Error('Enrasar solo añade agua: el objetivo debe ser al menos el volumen actual.');
  if(Math.abs(objetivoMl-base.volMl)<1e-9)return 0;
  const volumen=(agua:number)=>{const c=structuredClone(base);agregarAgua(c,agua,temperaturaAgua);return c.volMl;};
  let lo=0,hi=Math.max(1,objetivoMl-base.volMl);
  for(let i=0;i<40&&volumen(hi)<objetivoMl;i++)hi*=2;
  if(!Number.isFinite(volumen(hi))||volumen(hi)<objetivoMl)throw Error('No se puede resolver el enrase con estas condiciones.');
  for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(volumen(mid)<objetivoMl)lo=mid;else hi=mid;}
  return (lo+hi)/2;
}
/** Preparación de un solo soluto a volumen final, no a volumen de agua. */
export function crearDisolucion(id:string,cMolar:number,volumenMl:number,temperatura=25):Disolucion {
  const s=SOLUTOS.find(s=>s.id===id);
  if(!s||!Number.isFinite(cMolar)||cMolar<=0||!Number.isFinite(volumenMl)||volumenMl<=0)throw Error('Preparación no válida.');
  const n=cMolar*volumenMl/1000;
  const rec:Disolucion={soluteId:id,masaG:n*s.M,molesN:n,volH2OMl:0,volMl:0,volSolucionMl:0,temperaturaC:temperatura};
  actualizarVolumen(rec);const agua=aguaParaEnrasar(rec,volumenMl,temperatura);agregarAgua(rec,agua,temperatura);return rec;
}
/** Mutación interna sobre copias; no presupone aditividad de los volúmenes. */
function transferirInterno(origen:Disolucion,destino:Disolucion,ml:number):void {
  const f=Math.min(1,ml/origen.volMl),masaDestino=destino.masaG+masaAguaLibre(destino),masaTransferida=(origen.masaG+masaAguaLibre(origen))*f;
  destino.temperaturaC=(masaDestino*(destino.temperaturaC??25)+masaTransferida*(origen.temperaturaC??25))/(masaDestino+masaTransferida);
  if(destino.masaG===0&&origen.masaG>0)destino.soluteId=origen.soluteId;
  if(origen.componentes || destino.componentes || (origen.acidBase && destino.acidBase)) {
    const a=structuredClone(componentesDe(origen)),b=structuredClone(componentesDe(destino));
    for(const [id,c]of Object.entries(a)) {
      b[id]??={masaG:0,molesN:0};
      for(const k of ['masaG','molesN'] as const){const cantidad=c[k]*f;b[id][k]+=cantidad;c[k]-=cantidad;if(Math.abs(c[k])<1e-12)c[k]=0;}
      if(c.masaG===0)delete a[id];
    }
    origen.componentes=a;destino.componentes=b;
    const agua=origen.volH2OMl*f;origen.volH2OMl-=agua;destino.volH2OMl+=agua;
  }else for(const k of ['masaG','molesN','volH2OMl'] as const){const cantidad=origen[k]*f;destino[k]+=cantidad;origen[k]-=cantidad;if(Math.abs(origen[k])<1e-12)origen[k]=0;}
  if(origen.indicador&&!destino.indicador)destino.indicador=origen.indicador;
  actualizarVolumen(origen);actualizarVolumen(destino);
  if(origen.volMl<1e-9)origen.indicador=undefined;
}
export function transferirAlicuota(origen:Disolucion,destino:Disolucion,ml:number):void {
  if(origen===destino)throw Error('Origen y destino deben ser distintos.');
  if(!Number.isFinite(ml)||ml<=0||origen.volMl<=0||ml>origen.volMl+1e-9)throw Error('Volumen de transferencia no válido.');
  if(!puedeCombinar(origen,destino))throw Error('Solutos incompatibles con este modelo.');
  const a=structuredClone(origen),b=structuredClone(destino);transferirInterno(a,b,ml);
  if(b.volMl>(destino.capacidadMax??Infinity)+1e-8)throw Error('La transferencia supera la capacidad del destino.');
  Object.assign(origen,a);Object.assign(destino,b);
}
/** Máximo volumen que puede salir del instrumento sin desbordar el destino. */
export function maximoTransferible(origen:Disolucion,destino:Disolucion,solicitado:number,capacidadMl=destino.capacidadMax??Infinity):number {
  const max=Math.max(0,Math.min(solicitado,origen.volMl));if(max<=0||!puedeCombinar(origen,destino))return 0;
  const cabe=(ml:number)=>{const a=structuredClone(origen),b=structuredClone(destino);transferirInterno(a,b,ml);return b.volMl<=capacidadMl+1e-10;};
  if(cabe(max))return max;
  let lo=0,hi=max;for(let i=0;i<55;i++){const mid=(lo+hi)/2;if(cabe(mid))lo=mid;else hi=mid;}return lo;
}
export function calcularConcentraciones(rec:Disolucion):Concentraciones {
  const litros=rec.volMl/1000,agua=masaAguaLibre(rec),masaTotal=rec.masaG+agua,aguaTotal=evaluarVolumen(rec).masaAguaG;
  return {molaridad:litros>0?rec.molesN/litros:0,masica:litros>0?rec.masaG/litros:0,pMasa:masaTotal>0?rec.masaG/masaTotal*100:0,ppm:masaTotal>0?rec.masaG/masaTotal*1e6:0,molalidad:aguaTotal>0?rec.molesN/(aguaTotal/1000):0};
}
export function anadirReactivoPuro(rec:Disolucion,id:string,moles:number,capacidadMl=Infinity):void {
  if(!REACTIVOS_AB.includes(id)||!Number.isFinite(moles)||moles<=0)throw Error('Cantidad de reactivo no válida.');
  if(Object.keys(componentesDe(rec)).some(k=>!REACTIVOS_AB.includes(k)))throw Error('La muestra contiene un reactivo fuera del modelo.');
  const s=SOLUTOS.find(s=>s.id===id)!;
  const copia=structuredClone(rec);copia.acidBase=true;copia.componentes=structuredClone(componentesDe(rec));
  copia.componentes[id]??={masaG:0,molesN:0};copia.componentes[id].masaG+=moles*s.M;copia.componentes[id].molesN+=moles;
  if(rec.masaG===0)copia.soluteId=id;actualizarVolumen(copia);
  if(copia.volMl>capacidadMl+1e-9)throw Error('El reactivo supera la capacidad del recipiente.');Object.assign(rec,copia);
}
export function anadirDisolucionPreparada(rec:Disolucion,id:string,molaridad:number,ml:number,capacidadMl:number):void {
  if(!REACTIVOS_AB.includes(id)||!Number.isFinite(molaridad)||molaridad<=0||molaridad>1||!Number.isFinite(ml)||ml<=0)throw Error('Indica una concentración entre 0 y 1 mol/L y un volumen positivo.');
  const contenido=rec.volMl>1e-9||rec.masaG>0;
  if(contenido){
    const cs=componentesDe(rec),ids=Object.keys(cs).filter(k=>cs[k].molesN>0||cs[k].masaG>0);
    if(ids.length!==1||ids[0]!==id||rec.volMl<=0||rec.volH2OMl<=0)throw Error('Solo puedes reponer una disolución de la misma sustancia, sin otros reactivos.');
    const actual=cs[id].molesN/(rec.volMl/1000);
    if(Math.abs(actual-molaridad)>Math.max(1e-12,Math.abs(molaridad)*1e-8))throw Error('La concentración añadida debe coincidir con la del contenido actual.');
  }
  const origen=crearDisolucion(id,molaridad,ml);origen.acidBase=true;origen.componentes=componentesDe(origen);
  const copia=structuredClone(rec);copia.acidBase=true;copia.capacidadMax=capacidadMl;
  if(!contenido){copia.componentes={};copia.indicador=undefined;copia.nombreReserva=undefined;copia.objetivoTemperatura=undefined;}
  transferirAlicuota(origen,copia,ml);Object.assign(rec,copia);
}
