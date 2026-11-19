import {test} from 'node:test';import assert from 'node:assert/strict';
import {calcularAporteComercial,anadirDesdeBote,calcularPreparacionComercial} from '../src/core/commercial-reagents.ts';
import {actualizarVolumen,agregarAgua,aguaParaEnrasar,crearDisolucion,calcularConcentraciones,transferirAlicuota} from '../src/core/solution.ts';
import {masaAguaLibre} from '../src/core/density.ts';
import {generarDiarioLatex} from '../src/core/lab-report.ts';
const empty=()=>({soluteId:'NaCl',masaG:0,molesN:0,volH2OMl:0,volMl:0,volSolucionMl:0,temperaturaC:25,capacidadMax:200});
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('bote HCl 36%: cada mL aporta masa de HCl y agua, sin usar volumen como masa',()=>{
 const a=calcularAporteComercial('hcl-36',10);near(a.masaProductoG,11.8);near(a.masaSolutoG,4.248);near(a.masaAguaG,7.552);near(a.moles,4.248/36.46);
 const rec=empty();anadirDesdeBote(rec,'hcl-36',10,200);near(rec.masaG,4.248);near(masaAguaLibre(rec),7.552);near(rec.temperaturaC,20);near(rec.modeloVolumen.densidadGmL*rec.volMl,11.8);
 assert.equal(rec.componentes,undefined);
});
test('preparar HCl 0.5 M y 200 mL desde 36% conserva agua, moles y enrase',()=>{
 const q=calcularPreparacionComercial('hcl-36',.5,200);near(q.moles,.1);near(q.cantidad,3.646/(.36*1.18));
 const rec=empty();anadirDesdeBote(rec,'hcl-36',q.cantidad,200);const agua=aguaParaEnrasar(rec,200);agregarAgua(rec,agua);near(rec.volMl,200);near(calcularConcentraciones(rec).molaridad,.5);
 const before=rec.masaG+masaAguaLibre(rec),dest=empty();transferirAlicuota(rec,dest,25);near(rec.masaG+masaAguaLibre(rec)+dest.masaG+masaAguaLibre(dest),before);near(calcularConcentraciones(dest).molaridad,.5);
});
test('fallos de capacidad, compatibilidad y valores no alteran el contenido',()=>{
 const rec=crearDisolucion('NaCl',.5,100),before=structuredClone(rec);
 assert.throws(()=>anadirDesdeBote(rec,'hcl-36',1,200),/solo se admite/);assert.deepEqual(rec,before);
 assert.throws(()=>anadirDesdeBote(rec,'nacl-solid',1000,100));assert.deepEqual(rec,before);
 for(const x of [0,-1,NaN,Infinity])assert.throws(()=>calcularAporteComercial('hcl-36',x));
 assert.throws(()=>calcularPreparacionComercial('hcl-36',20,200),/supera la del bote/);
});
test('sólidos: idealización explícita, sin inventar agua a partir de pureza mínima',()=>{
 for(const [id,g,n] of [['naoh-pellets',4,.1],['nacl-solid',5.844,.1]]){const rec=empty(),a=anadirDesdeBote(rec,id,g,200);near(rec.molesN,n);near(masaAguaLibre(rec),0);assert.equal(a.idealizado,true);near(a.fraccionMasica,1);}
 const rec=empty();anadirDesdeBote(rec,'nacl-solid',1,200);rec.masaG+=1;rec.molesN+=1/58.44;actualizarVolumen(rec);near(rec.masaG,2);
});
test('botes en ácido-base conservan ambos reactivos; diario incluye factores del producto',()=>{
 const rec=crearDisolucion('NaOH',.1,25);anadirDesdeBote(rec,'hcl-36',1,200,true);assert.ok(rec.componentes.HCl&&rec.componentes.NaOH);
 const r=empty(),a=anadirDesdeBote(r,'hcl-36',1,200);const tex=generarDiarioLatex({rec:r,mesa:1,historial:[{mesa:1,tipo:'instrumento',reactivoComercial:a}]});
 for(const part of ['REACTIVOS COMERCIALES','1{,}18','0{,}36','0{,}7552','36{,}46'])assert.ok(tex.includes(part),part);
});
test('bote H2SO4 98%: ácido, agua, preparación enrasada y factores del diario',()=>{
 const a=calcularAporteComercial('h2so4-98',1);near(a.masaProductoG,1.84);near(a.masaSolutoG,1.8032);near(a.masaAguaG,.0368);near(a.moles,1.8032/98.08);
 const q=calcularPreparacionComercial('h2so4-98',.5,200);near(q.moles,.1);near(q.masaSolutoG,9.808);near(q.cantidad,9.808/(.98*1.84));
 const rec=empty(),aporte=anadirDesdeBote(rec,'h2so4-98',q.cantidad,200);near(rec.molesN,.1);near(masaAguaLibre(rec),q.masaProductoG*.02);agregarAgua(rec,aguaParaEnrasar(rec,200));near(rec.volMl,200);near(calcularConcentraciones(rec).molaridad,.5);
 const tex=generarDiarioLatex({rec,mesa:1,historial:[{mesa:1,tipo:'instrumento',reactivoComercial:aporte}]});for(const part of ['1{,}84','0{,}98','98{,}08','193400'])assert.ok(tex.includes(part),part);
 assert.throws(()=>calcularPreparacionComercial('h2so4-98',20,100),/supera la del bote/);
});