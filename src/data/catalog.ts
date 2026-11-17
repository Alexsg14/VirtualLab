
export const SOLUTOS = [
  {id:'H2Mal',nombre:'Ácido malónico',formula:'C₃H₄O₄',M:104.06,colorBase:'rgba(170,220,255,',rgb:[170,220,255],solMax:763,densidad:1.62,volAparenteG:0.6},
  {id:'HCl',nombre:'Ácido clorhídrico',formula:'HCl',M:36.46,colorBase:'rgba(170,220,255,',rgb:[170,220,255],solMax:9999,densidad:1.19,volAparenteG:0.4},
  {id:'CH3COOH',nombre:'Ácido acético',formula:'CH₃COOH',M:60.05,colorBase:'rgba(170,220,255,',rgb:[170,220,255],solMax:9999,densidad:1.05,volAparenteG:0.9},
  {id:'NH3',nombre:'Amoniaco',formula:'NH₃',M:17.03,colorBase:'rgba(170,220,255,',rgb:[170,220,255],solMax:9999,densidad:0.9,volAparenteG:1.0},
  { id:'NaCl',    nombre:'Cloruro de sodio',          formula:'NaCl',      M:58.44,  colorBase:'rgba(200,220,255,', rgb:[200,220,255], solMax:360,  densidad:2.16, volAparenteG:0.35 },
  { id:'CuSO4',   nombre:'Sulfato de cobre(II)',       formula:'CuSO₄',     M:159.61, colorBase:'rgba(50,100,220,',  rgb:[50,100,220],  solMax:200,  densidad:3.6,  volAparenteG:0.28 },
  { id:'KMnO4',   nombre:'Permanganato de potasio',    formula:'KMnO₄',     M:158.03, colorBase:'rgba(140,0,180,',   rgb:[140,0,180],   solMax:64,   densidad:2.7,  volAparenteG:0.34 },
  { id:'glucosa', nombre:'Glucosa',                    formula:'C₆H₁₂O₆',  M:180.16, colorBase:'rgba(255,220,120,', rgb:[255,220,120], solMax:910,  densidad:1.54, volAparenteG:0.62 },
  { id:'KI',      nombre:'Yoduro de potasio',          formula:'KI',        M:166.00, colorBase:'rgba(220,220,180,', rgb:[220,220,180], solMax:1440, densidad:3.12, volAparenteG:0.27 },
  { id:'CoCl2',   nombre:'Cloruro de cobalto(II)',     formula:'CoCl₂',     M:129.84, colorBase:'rgba(220,60,100,',  rgb:[220,60,100],  solMax:767,  densidad:3.36, volAparenteG:0.32 },
  { id:'AgNO3',   nombre:'Nitrato de plata',           formula:'AgNO₃',     M:169.87, colorBase:'rgba(220,220,220,', rgb:[220,220,220], solMax:1220, densidad:4.35, volAparenteG:0.22 },
  { id:'NaOH',    nombre:'Hidróxido de sodio',         formula:'NaOH',      M:40.00,  colorBase:'rgba(180,220,180,', rgb:[180,220,180], solMax:1110, densidad:2.13, volAparenteG:0.25 },
  { id:'NaHCO3',  nombre:'Bicarbonato de sodio',       formula:'NaHCO₃',    M:84.01,  colorBase:'rgba(210,210,230,', rgb:[210,210,230], solMax:96,   densidad:2.2,  volAparenteG:0.38 },
  { id:'H2SO4',   nombre:'Ácido sulfúrico (diluido)',  formula:'H₂SO₄',     M:98.08,  colorBase:'rgba(255,255,200,', rgb:[255,255,200], solMax:9999, densidad:1.84, volAparenteG:0.54 }
];

// ============================================================
// RETOS PREDEFINIDOS
// ============================================================

export const RETOS_PREDEFINIDOS = [
  {soluto:'NaCl',volMl:250,concentracion:0.5,unidad:'mol/L'},
  {soluto:'CuSO4',volMl:100,concentracion:0.1,unidad:'mol/L'},
  {soluto:'NaCl',volMl:250,concentracion:10,unidad:'g/L'},
  {soluto:'CuSO4',volMl:100,concentracion:16,unidad:'g/L'},
  {soluto:'NaHCO3',volMl:300,concentracion:8,unidad:'g/L'},
  {soluto:'glucosa',volMl:250,concentracion:5,unidad:'% m/m'},
  {soluto:'NaCl',volMl:200,concentracion:2,unidad:'% m/m'},
  {soluto:'NaCl',volMl:500,concentracion:1000,unidad:'ppm'},
  {soluto:'KI',volMl:250,concentracion:500,unidad:'ppm'},
  {soluto:'NaCl',volMl:200,concentracion:0.5,unidad:'mol/kg'},
  {soluto:'glucosa',volMl:250,concentracion:0.25,unidad:'mol/kg'}
].map(r=>({...r,texto:`Prepara ${r.volMl} mL de ${formulaSoluto(r.soluto)} a ${r.concentracion} ${r.unidad}`}));

// ============================================================
// CAPACIDADES POR DEFECTO DE RECIPIENTES (mL)
// ============================================================

export const CAPACIDADES = {
  matraz:    500,
  vaso:      600,
  erlenmeyer:300,
  probeta:   100,
  bureta:    50,
  pipeta:    25
};

export const NOMBRES_RECIPIENTE = {
  matraz:    'Matraz Aforado',
  vaso:      'Vaso de Precipitados',
  erlenmeyer:'Erlenmeyer',
  probeta:   'Probeta',
  bureta:    'Bureta',
  pipeta:    'Pipeta'
};

// ============================================================
// ESTADO GLOBAL DEL LABORATORIO
// ============================================================

/** Display only: internal solute IDs remain unchanged for calculations/storage. */
export function formulaSoluto(id:string):string {
  return SOLUTOS.find(s=>s.id===id)?.formula ?? (id==='H2O'?'H₂O':id);
}
/** Format known chemical tokens; leave quantities, units and identifiers like R1 intact. */
export function formatearTextoQuimico(texto:string):string {
  return texto.replace(/[A-Za-z][A-Za-z0-9₀-₉]*/g,token=>{
    const ascii=token.replace(/[₀-₉]/g,c=>String(c.charCodeAt(0)-0x2080));
    const soluto=SOLUTOS.find(s=>s.id===ascii||s.formula.replace(/[₀-₉]/g,c=>String(c.charCodeAt(0)-0x2080))===ascii);
    return soluto?.formula ?? (ascii==='H2O'?'H₂O':token);
  });
}