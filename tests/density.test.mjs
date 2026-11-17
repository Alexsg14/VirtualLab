import {evaluarPreparacion,parsearReto} from '../src/core/challenge.ts';
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
test('retos: g/L, porcentaje y molalidad usan denominadores distintos',()=>{
 const r=crearDisolucion('NaCl',.1,100);r.masaG=2.922;r.molesN=.05;r.volH2OMl=100/RHO_AGUA_25;actualizarVolumen(r);
 const casos=[['mol/kg',.5],['% m/m',2.922/102.922*100],['ppm',2.922/102.922*1e6],['g/L',2.922/(r.volMl/1000)],['mol/L',.05/(r.volMl/1000)]];
 for(const [unidad,concentracion] of casos){
  const reto={soluto:'NaCl',volMl:r.volMl,unidad,concentracion};assert.equal(evaluarPreparacion(r,reto).correcto,true,unidad);
  assert.equal(evaluarPreparacion(r,{...reto,concentracion:concentracion*1.01}).correcto,false,unidad);
  assert.equal(evaluarPreparacion(r,{...reto,volMl:r.volMl+1}).correcto,false,unidad);
 }
 assert.equal(evaluarPreparacion(r,{soluto:'NaCl',volMl:r.volMl,unidad:'mol/kg',concentracion:.05/.102922}).correcto,false,'molalidad no usa masa total');
});
test('ppm son mg/kg de disolucion, no mg/L',()=>{
 const r=crearDisolucion('NaCl',.1,100);r.masaG=1;r.molesN=1/58.44;r.volH2OMl=999/RHO_AGUA_25;actualizarVolumen(r);
 const reto={soluto:'NaCl',volMl:r.volMl,unidad:'ppm',concentracion:1000};assert.equal(evaluarPreparacion(r,reto).correcto,true);
 near(evaluarPreparacion(r,reto).concentracion,1000);
 assert.ok(Math.abs(1000/(r.volMl/1000)-1000)>2);
});
test('retos personalizados: unidades completas, alias y decimales con coma',()=>{
 for(const [texto,unidad,valor]of [['250 mL NaCl 0,5 M','mol/L',.5],['250 mL NaCl 10 g/L','g/L',10],['200 mL NaCl 2 % m/m','% m/m',2],['500 mL NaCl 1000 ppm','ppm',1000],['200 mL NaCl 0.5 m','mol/kg',.5],['200 mL NaCl 0.5 mol/kg','mol/kg',.5]]){
  const r=parsearReto(texto);assert.equal(r.unidad,unidad);assert.equal(r.concentracion,valor);
 }
 for(const texto of ['250 mL NaCl 10 mg/L','250 mL NaCl 0 M','0 mL NaCl 1 M','250 mL NaCl 100 % m/m','250 mL NaCl 1 M basura','250 mL X 1 M'])assert.throws(()=>parsearReto(texto));
});