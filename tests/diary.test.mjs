import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generarDiarioLatex,escaparLatex} from '../src/core/lab-report.ts';
import {crearDisolucion,actualizarVolumen} from '../src/core/solution.ts';
test('diario: factores, unidades y datos reales, sin alterar el recipiente',()=>{
 const rec=crearDisolucion('NaCl',.5,200),before=structuredClone(rec);
 const tex=generarDiarioLatex({rec,mesa:1,historial:[],autor:'Ana & 50%',fecha:'2026-11-18T10:00:00Z'});
 for(const text of ['5{,}844','58{,}44','197{,}59295','0{,}5','mg/kg','mol/kg','Ana \\& 50\\%'])assert.ok(tex.includes(text),text);
 assert.deepEqual(rec,before);assert.ok(!tex.includes('NaN'));
});
test('diario: el volumen de agua no sustituye al volumen final',()=>{
 const rec=crearDisolucion('NaCl',.5,200);rec.volH2OMl=200;actualizarVolumen(rec);
 assert.ok(rec.volMl>201);const tex=generarDiarioLatex({rec,mesa:1,historial:[]});
 assert.ok(!tex.includes('Volumen final:} $200\\,'));assert.ok(tex.includes('0{,}495'));
});
test('diario: filtra recipientes, identifica registros antiguos y escapa texto',()=>{
 const tex=generarDiarioLatex({rec:crearDisolucion('NaCl',.5,200),mesa:1,historial:[{tipo:'soluto',mesa:1,cantidad:'visible'},{tipo:'soluto',mesa:2,cantidad:'OTRO_RECIPIENTE'},{tipo:'soluto',cantidad:'antiguo'}],observaciones:'\\input{secreto} 10%'});
 assert.ok(tex.includes('visible'));assert.ok(!tex.includes('OTRO'));assert.ok(tex.includes('sin recipiente identificado'));
 assert.ok(tex.includes('\\textbackslash{}input\\{secreto\\} 10\\%'));
 assert.equal(escaparLatex('H₂SO₄'),'H2SO4');
 assert.throws(()=>generarDiarioLatex({rec:crearDisolucion('NaCl',0,0),mesa:1,historial:[]}));
});