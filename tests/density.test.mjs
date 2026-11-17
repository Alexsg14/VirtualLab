import {evaluarPreparacion} from '../src/core/challenge.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {crearDisolucion,actualizarVolumen,aguaParaEnrasar,agregarAgua,transferirAlicuota,maximoTransferible} from '../src/core/solution.ts';
import {RHO_AGUA_25} from '../src/core/density.ts';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('NaCl: densidad y enrase',()=>{
 const r=crearDisolucion('NaCl',.5,200);near(r.masaG,5.844);near(r.volMl,200);near(r.volH2OMl*RHO_AGUA_25,197.59295018573232);
 r.volH2OMl=200;actualizarVolumen(r);near(r.volMl,201.82105880062238);near(r.molesN/(r.volMl/1000),.4954884321501322);
});
test('NaOH: contraccion y enrase',()=>{
 const r=crearDisolucion('NaOH',.5,200);r.volH2OMl=200;actualizarVolumen(r);near(r.volMl,199.70487874475975);assert.ok(r.volMl<200);
 agregarAgua(r,aguaParaEnrasar(r,200));near(r.volMl,200);near(r.molesN/(r.volMl/1000),.5);
});
test('avisos de extrapolacion y ausencia de parametros',()=>{
 const r=crearDisolucion('NaCl',.5,200);r.temperaturaC=150;actualizarVolumen(r);assert.ok(r.modeloVolumen.avisos.some(x=>x.includes('Temperatura')));
 const g=crearDisolucion('glucosa',.1,100);assert.equal(g.modeloVolumen.modelo,'aproximado');assert.ok(g.modeloVolumen.avisos.length);
});
test('capacidad: transferencia atomica y conservacion',()=>{
 const a=crearDisolucion('NaCl',1,100),b=crearDisolucion('NaCl',.1,95);b.capacidadMax=100;
 const before=JSON.stringify([a,b]);assert.throws(()=>transferirAlicuota(a,b,10));assert.equal(JSON.stringify([a,b]),before);
 const masa=a.masaG+b.masaG,agua=a.volH2OMl+b.volH2OMl;
 const ml=maximoTransferible(a,b,10);assert.ok(ml>0&&ml<10);transferirAlicuota(a,b,ml);near(b.volMl,100);near(a.masaG+b.masaG,masa);near(a.volH2OMl+b.volH2OMl,agua);
});
test('desafio NaCl: acepta pesada redondeada enrasada y rechaza 250 mL de agua mas soluto',()=>{
 const reto={soluto:'NaCl',volMl:250,molL:.5};
 for(const masa of [7.3,7.305,7.3125]){
  const r=crearDisolucion('NaCl',masa/58.44/.25,250);
  assert.equal(evaluarPreparacion(r,reto).correcto,true);
  r.volH2OMl=250;actualizarVolumen(r);
  const resultado=evaluarPreparacion(r,reto);
  assert.equal(resultado.correcto,false);assert.equal(resultado.volumenOk,false);assert.ok(resultado.volumenMl>252);
 }
});
test('desafio NaOH: una contraccion tambien invalida el volumen final incorrecto',()=>{
 const reto={soluto:'NaOH',volMl:250,molL:.5},r=crearDisolucion('NaOH',.5,250);
 assert.equal(evaluarPreparacion(r,reto).correcto,true);
 r.volH2OMl=250;actualizarVolumen(r);
 const resultado=evaluarPreparacion(r,reto);
 assert.ok(resultado.volumenMl<250);assert.equal(resultado.molaridadOk,true);assert.equal(resultado.volumenOk,false);assert.equal(resultado.correcto,false);
});