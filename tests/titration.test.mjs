import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLUTOS} from '../src/data/catalog.ts';
import {crearDisolucion,aguaParaEnrasar,actualizarVolumen,anadirDisolucionPreparada,anadirReactivoPuro,agregarAgua,transferirAlicuota} from '../src/core/solution.ts';
import {medirAcidez,colorIndicador,opacidadIndicador} from '../src/core/acid-base.ts';
import {volumenesEquivalencia,volumenEquivalencia,muestraTrasAdicionar,puntosReferencia} from '../src/core/titration.ts';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,a+' ≠ '+b);
const empty=()=>({acidBase:true,soluteId:'NaCl',masaG:0,molesN:0,volH2OMl:0,volMl:0,volSolucionMl:0,temperaturaC:25});
function sample(id,c=0.1,ml=25){const r=crearDisolucion(id,c,ml);r.acidBase=true;r.componentes={[id]:{masaG:r.masaG,molesN:r.molesN}};return r;}
test('NaOH sin stock: cantidad de sólido y agua añadida progresivamente',()=>{const r=empty();anadirReactivoPuro(r,'NaOH',0.01,600);near(r.masaG,0.4);assert.equal(medirAcidez(r),null);agregarAgua(r,aguaParaEnrasar(r,100));near(r.volMl,100);near(medirAcidez(r).pH,13,0.001);});
test('añadir HCl equivalente conserva los reactivos que ya había',()=>{const r=sample('NaOH',0.1,100);anadirReactivoPuro(r,'HCl',0.01,600);near(r.componentes.NaOH.molesN,0.01);near(r.componentes.HCl.molesN,0.01);near(medirAcidez(r).pH,7,0.001);});
test('añadir reactivo fuera de capacidad o cantidad inválida no modifica la muestra',()=>{const r=sample('NaOH');const before=JSON.stringify(r);for(const n of [0,-1,NaN,Infinity])assert.throws(()=>anadirReactivoPuro(r,'HCl',n,600));assert.throws(()=>anadirReactivoPuro(r,'NaOH',100,30));assert.equal(JSON.stringify(r),before);});
test('fenolftaleína rosa a pH 10–14, palidece en el viraje e incolora a pH 7',()=>{for(const pH of [10,11,12,13,14]){const r=sample('NaOH',10**(pH-14));r.indicador='fenolftaleina';const c=colorIndicador(r);assert.ok(c[0]>230&&c[1]<40&&c[2]>100);assert.ok(opacidadIndicador(r)>0.6);}const neutral=sample('NaCl');neutral.indicador='fenolftaleina';assert.ok(opacidadIndicador(neutral)<0.15);const mid=sample('NaOH',10**(9.3-14));mid.indicador='fenolftaleina';assert.ok(colorIndicador(mid)[1]>40&&colorIndicador(mid)[1]<240);});
test('curvas fuerte–fuerte ascendentes y descendentes con equivalencia 1:1',()=>{for(const [a,b,up]of [['HCl','NaOH',true],['NaOH','HCl',false]]){const initial=sample(a),titrant=sample(b,0.1,50);near(volumenEquivalencia(initial,titrant),25);const before=medirAcidez(muestraTrasAdicionar(initial,titrant,10)).pH,eq=medirAcidez(muestraTrasAdicionar(initial,titrant,25)).pH,after=medirAcidez(muestraTrasAdicionar(initial,titrant,30)).pH;near(eq,7,0.001);assert.ok(up?before<eq&&eq<after:before>eq&&eq>after);}});
test('curva débil–fuerte: semiequivalencia y equivalencia no coinciden con pH 7',()=>{const a=sample('CH3COOH'),b=sample('NaOH',0.1,50);near(medirAcidez(muestraTrasAdicionar(a,b,12.5)).pH,-Math.log10(1.8e-5),0.01);near(medirAcidez(muestraTrasAdicionar(a,b,25)).pH,8.72,0.03);});
test('la referencia coincide con transferencias reales y no modifica las muestras',()=>{const a=sample('HCl'),initial=structuredClone(a),b=sample('NaOH',0.1,100),stock=structuredClone(b),before=JSON.stringify([initial,stock]);for(let i=1;i<=60;i++){transferirAlicuota(b,a,0.5);near(medirAcidez(a).pH,medirAcidez(muestraTrasAdicionar(initial,stock,i*0.5)).pH,1e-6);}const points=puntosReferencia(initial,stock,40);assert.ok(points.some(p=>Math.abs(p.volumenMl-25)<1e-9&&Math.abs(p.pH-7)<0.001));assert.equal(JSON.stringify([initial,stock]),before);});

test('dipróticos: dos etapas, cargas de equilibrio y curvas diferentes',()=>{
 const base=sample('NaOH',0.1,100),weak=sample('H2Mal'),strong=sample('H2SO4');
 for(const a of [weak,strong]){
   volumenesEquivalencia(a,base).forEach((v,i)=>near(v,[25,50][i]));near(volumenEquivalencia(a,base),50);
   const points=puntosReferencia(a,base,60);
   for(const v of [25,50])assert.ok(points.some(p=>Math.abs(p.volumenMl-v)<1e-8));
   for(let i=1;i<points.length;i++)assert.ok(points[i].pH>=points[i-1].pH-1e-8);
   const real=structuredClone(a),stock=structuredClone(base),before=JSON.stringify(a);
   transferirAlicuota(stock,real,37.5);
   near(medirAcidez(real).pH,medirAcidez(muestraTrasAdicionar(a,base,37.5)).pH);
   assert.equal(JSON.stringify(a),before);
 }
 near(medirAcidez(strong).pH,0.959,0.005);
 near(medirAcidez(muestraTrasAdicionar(weak,base,25)).pH,(2.83+5.69)/2,0.03);
 near(medirAcidez(muestraTrasAdicionar(weak,base,37.5)).pH,5.69,0.02);
 assert.ok(medirAcidez(muestraTrasAdicionar(weak,base,50)).pH>8.9);
 assert.ok(medirAcidez(weak).pH>medirAcidez(strong).pH+0.8);
 near(medirAcidez(muestraTrasAdicionar(weak,base,60)).pH,medirAcidez(muestraTrasAdicionar(strong,base,60)).pH,0.001);
 const partial=muestraTrasAdicionar(weak,base,12.5);near(volumenEquivalencia(partial,base),37.5);
 assert.equal(volumenEquivalencia(base,strong),null); // Solo valorantes fuertes monopróticos para las marcas.
});

test('reponer 40 mL de NaOH 0.5 M sin vaciar, conservando indicador y concentración',()=>{
 for(const ml of [160,200]){
 const r=sample('NaOH',0.5,200),out=empty();transferirAlicuota(r,out,160);near(r.volMl,40);
 r.indicador='fenolftaleina';anadirDisolucionPreparada(r,'NaOH',0.5,ml,500);
 near(r.volMl,40+ml);near(r.molesN/(r.volMl/1000),0.5);assert.equal(r.indicador,'fenolftaleina');
 }
 const r=sample('NaOH',0.5,40);anadirDisolucionPreparada(r,'NaOH',0.5,460,500);near(r.volMl,500);
});
test('reposición incompatible o fuera de capacidad no altera el contenido',()=>{
 const r=sample('NaOH',0.5,40),before=JSON.stringify(r);
 for(const [id,c,ml]of [['NaOH',0.1,160],['HCl',0.5,160],['NaOH',0.5,461],['NaOH',0.5,0]]){
 assert.throws(()=>anadirDisolucionPreparada(r,id,c,ml,500));assert.equal(JSON.stringify(r),before);
 }
 const mix=muestraTrasAdicionar(sample('HCl'),sample('NaOH'),10),saved=JSON.stringify(mix);
 assert.throws(()=>anadirDisolucionPreparada(mix,'HCl',0.1,10,500));assert.equal(JSON.stringify(mix),saved);
 const fresh=empty();anadirDisolucionPreparada(fresh,'NaOH',0.5,200,500);near(fresh.volMl,200);near(fresh.molesN,0.1);
});
