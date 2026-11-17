import test from 'node:test';
import assert from 'node:assert/strict';
import {medirAcidez,pKwAgua,colorIndicador} from '../src/core/acid-base.ts';
import {crearDisolucion,actualizarVolumen,transferirAlicuota,agregarAgua} from '../src/core/solution.ts';
import {SOLUTOS} from '../src/data/catalog.ts';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,a+' ≠ '+b);
function sample(id,c=0.1,ml=100){const r=crearDisolucion(id,c,ml);r.acidBase=true;r.componentes={[id]:{masaG:r.masaG,molesN:r.molesN}};return r;}
test('ácido y base fuertes; ácido y base débiles',()=>{near(medirAcidez(sample('HCl')).pH,1,0.001);near(medirAcidez(sample('NaOH')).pH,13,0.001);near(medirAcidez(sample('CH3COOH')).pH,2.875,0.01);near(medirAcidez(sample('NH3')).pH,11.125,0.01);});
test('neutralización conserva componentes, masa y agua y da pH neutro',()=>{const a=sample('HCl'),b=sample('NaOH'),masa=a.masaG+b.masaG,agua=a.volH2OMl+b.volH2OMl;transferirAlicuota(b,a,100);assert.equal(a.modeloVolumen.modelo,"aproximado");near(a.masaG,masa);near(a.volH2OMl,agua);near(b.volMl,0);near(medirAcidez(a).pH,7,0.001);});
test('el tampón de ácido acético a semiequivalencia tiene pH próximo al pKa',()=>{const a=sample('CH3COOH'),b=sample('NaOH');transferirAlicuota(b,a,50);near(medirAcidez(a).pH,-Math.log10(1.8e-5),0.01);});
test('el pH neutro depende de la temperatura, no siempre es 7',()=>{const r=sample('NaCl');near(medirAcidez(r).pH,7);r.temperaturaC=50;near(medirAcidez(r).pH,6.63);assert.equal(medirAcidez(r).caracter,'Neutra');near(pKwAgua(50),13.26);});
test('el indicador cambia de color con la neutralización',()=>{const a=sample('HCl'),b=sample('NaOH',0.1,200);a.indicador='azul';const before=colorIndicador(a);transferirAlicuota(b,a,100);const neutral=colorIndicador(a);transferirAlicuota(b,a,10);const after=colorIndicador(a);assert.ok(before[0]>200);assert.ok(neutral[1]>neutral[0]);assert.ok(after[2]>after[0]);});
test('agua y alícuotas mezclan temperatura y conservan composición',()=>{const a=sample('HCl'),b=sample('NaOH');a.temperaturaC=75;b.temperaturaC=25;transferirAlicuota(a,b,50);assert.ok(b.temperaturaC>25&&b.temperaturaC<75);const masa=b.masaG;agregarAgua(b,100);near(b.masaG,masa);assert.ok(b.temperaturaC>25&&b.temperaturaC<50);});
test('un reactivo no soportado no se presenta como neutro',()=>{assert.equal(medirAcidez(sample('CuSO4')),null);});
