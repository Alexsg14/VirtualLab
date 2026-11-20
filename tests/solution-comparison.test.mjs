import {test} from 'node:test';import assert from 'node:assert/strict';
import {compararDisoluciones,generarCSVComparacion} from '../src/core/solution-comparison.ts';
import {crearDisolucion,actualizarVolumen,anadirReactivoPuro} from '../src/core/solution.ts';
const ficha=(nombre,rec)=>({nombre,rec:{...rec,tipo:'matraz',capacidadMax:250},fecha:'2026-11-20T10:00:00Z'});
test('comparación: distingue enrase y agua objetivo, conserva reservas y compara con precisión',()=>{
 const bien=crearDisolucion('NaCl',.5,250),mal=structuredClone(bien);mal.volH2OMl=250;actualizarVolumen(mal);const saved=[ficha('Enrasada',bien),ficha('Agua primero',mal)],before=structuredClone(saved),rows=compararDisoluciones(saved);
 assert.deepEqual(saved,before);assert.ok(Math.abs(rows[0].molaridad-.5)<1e-10);assert.ok(rows[1].volumenMl>250);assert.ok(rows[1].molaridad<.5);assert.equal(rows[0].molesN,rows[1].molesN);assert.ok(rows[0].masaAguaG<rows[1].masaAguaG);
 saved[0].nombre='Modificada';saved[0].rec.masaG=0;assert.equal(rows[0].nombre,'Enrasada');assert.ok(rows[0].masaG>7);
});
test('comparación: CSV español, unidades completas y nombres seguros para Excel',()=>{
 const rows=compararDisoluciones([ficha('=HYPERLINK("https://ejemplo.test")',crearDisolucion('NaCl',.5,250)),ficha('Nombre; con "comillas"',crearDisolucion('NaOH',.1,100))]);const csv=generarCSVComparacion(rows);
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=HYPERLINK(""https://ejemplo.test"")"'));assert.ok(csv.includes('"Nombre; con ""comillas"""'));assert.ok(csv.includes(';0,5;'));assert.ok(csv.includes('ppm_mg_kg_disolucion'));assert.ok(csv.includes('agua_presente_g'));assert.equal(csv.split('\r\n').length,4);
});
test('comparación: no atribuye concentración molar única a mezclas y conserva avisos',()=>{
 const rec=crearDisolucion('HCl',.1,100);anadirReactivoPuro(rec,'NaOH',.001,200);const rows=compararDisoluciones([ficha('Mezcla',rec),ficha('Otro soluto',crearDisolucion('glucosa',.1,100))]);
 assert.equal(rows[0].molaridad,null);assert.equal(rows[0].molesN,null);assert.equal(rows[0].molalidad,null);assert.ok(rows[0].avisos.some(x=>x.includes('Mezcla')));assert.equal(rows[1].modelo,'aproximado');assert.ok(rows[1].avisos.length>0);
 assert.throws(()=>compararDisoluciones([]),/al menos dos/);assert.throws(()=>compararDisoluciones([ficha('Inválida',{...rec,masaG:NaN}),ficha('Válida',rec)]),/datos válidos/);
});