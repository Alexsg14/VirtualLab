import type {Disolucion} from '../core/types.ts';
import {INDICADORES,medirAcidez} from '../core/acid-base.ts';
/** Textual equivalent of the existing indicator colors; never changes chemical rendering. */
export function describirColorIndicador(rec:Disolucion):string {
 const id=rec.indicador as keyof typeof INDICADORES,k=INDICADORES[id];
 if(!k)return 'Sin indicador añadido.';
 const m=medirAcidez(rec);if(!m)return 'Color del indicador no calculable para esta muestra.';
 const bajo=m.pH<=k.desde,alto=m.pH>=k.hasta;
 if(id==='fenolftaleina')return bajo?'Color previsto: incoloro.':alto?'Color previsto: rosa.':'En intervalo de viraje: de incoloro a rosa.';
 if(id==='naranja')return bajo?'Color previsto: rojo.':alto?'Color previsto: amarillo.':'En intervalo de viraje: de rojo a amarillo, pasando por anaranjado.';
 return bajo?'Color previsto: amarillo.':alto?'Color previsto: azul.':'En intervalo de viraje: de amarillo a azul, pasando por verde.';
}