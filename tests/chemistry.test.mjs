import test from 'node:test';
import assert from 'node:assert/strict';
import {aguaParaEnrasar,agregarAgua,actualizarVolumen,transferirAlicuota,calcularConcentraciones} from '../src/core/solution.ts';
import {RHO_AGUA_25} from '../src/core/density.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' ≠ '+b);
function disolucion(masaG=0,volH2OMl=0,soluteId='NaCl') {const r={soluteId,masaG,molesN:masaG/58.44,volH2OMl,volSolucionMl:0,volMl:0};actualizarVolumen(r);return r;}
test('100 mL de agua y 100 mL de disolución dan concentraciones distintas',()=>{
 const aguaPrimero=disolucion(20,100),enrase=disolucion(20,0);agregarAgua(enrase,aguaParaEnrasar(enrase,100));
 near(aguaPrimero.volMl,106.89489983458267);near(enrase.volMl,100);
 near(calcularConcentraciones(aguaPrimero).masica,20/(aguaPrimero.volMl/1000));
 near(calcularConcentraciones(enrase).masica,200);
 assert.notEqual(calcularConcentraciones(aguaPrimero).molaridad,calcularConcentraciones(enrase).molaridad);
});
test('masa porcentual y molalidad usan la masa del agua, no el volumen final',()=>{
 const c=calcularConcentraciones(disolucion(20,100));near(c.pMasa,20/(20+100*RHO_AGUA_25)*100);near(c.ppm,20/(20+100*RHO_AGUA_25)*1e6);near(c.molalidad,(20/58.44)/(0.1*RHO_AGUA_25));
});
test('cada gota conserva masa, moles y agua y mantiene la concentración',()=>{
 const a=disolucion(20,0),b=disolucion();agregarAgua(a,aguaParaEnrasar(a,100));const agua=a.volH2OMl;
 for(let i=0;i<100;i++)transferirAlicuota(a,b,0.05);
 near(a.volMl,95);near(b.volMl,5);
 for(const [key,total] of [['masaG',20],['molesN',20/58.44],['volH2OMl',agua]])near(a[key]+b[key],total);
 near(calcularConcentraciones(a).masica,calcularConcentraciones(b).masica);
});
test('transferir todo vacía el origen sin residuos numéricos',()=>{
 const a=disolucion(2,9.3),b=disolucion(),vol=a.volMl;transferirAlicuota(a,b,a.volMl);near(a.volMl,0);near(b.masaG,2);near(b.volMl,vol);
});
test('una transferencia inválida no modifica los recipientes',()=>{
 const a=disolucion(2,9.3),b=disolucion();const antes=JSON.stringify([a,b]);
 for(const cantidad of [0,-1,NaN,Infinity,11])assert.throws(()=>transferirAlicuota(a,b,cantidad));
 assert.equal(JSON.stringify([a,b]),antes);assert.throws(()=>transferirAlicuota(a,a,1));
});
test('el modelo rechaza combinar dos solutos distintos sin perder contenido',()=>{
 const a=disolucion(2,9.3),b=disolucion(1,10,'NaOH');const antes=JSON.stringify([a,b]);assert.throws(()=>transferirAlicuota(a,b,1));assert.equal(JSON.stringify([a,b]),antes);
});
test('agua pura y recipiente vacío no producen NaN',()=>{
 for(const r of [disolucion(),disolucion(0,100)])for(const value of Object.values(calcularConcentraciones(r)))assert.ok(Number.isFinite(value));
});
