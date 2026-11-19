import {test} from 'node:test';import assert from 'node:assert/strict';
import {describirColorIndicador} from '../src/ui/indicator-description.ts';
import {crearDisolucion} from '../src/core/solution.ts';
import {colorIndicador} from '../src/core/acid-base.ts';
test('indicadores: texto equivalente al color químico sin alterar composición ni RGB',()=>{
 for(const [id,acido,base] of [['fenolftaleina','incoloro','rosa'],['naranja','rojo','amarillo'],['azul','amarillo','azul']]){
  for(const [soluto,texto] of [['HCl',acido],['NaOH',base]]){const rec=crearDisolucion(soluto,.1,50);rec.indicador=id;const before=structuredClone(rec),rgb=colorIndicador(rec);assert.ok(describirColorIndicador(rec).includes(texto));assert.deepEqual(rec,before);assert.deepEqual(colorIndicador(rec),rgb);}
 }
 const neutral=crearDisolucion('NaCl',.1,50);neutral.indicador='azul';assert.ok(describirColorIndicador(neutral).includes('verde'));delete neutral.indicador;assert.equal(describirColorIndicador(neutral),'Sin indicador añadido.');
 const unsupported=crearDisolucion('glucosa',.1,50);unsupported.indicador='azul';assert.ok(describirColorIndicador(unsupported).includes('no calculable'));
});