
export let labState = {
  modo: 'ESO',           // 'ESO' | 'Bachillerato'
  mesaActiva: 1,         // qué recipiente de mesa es el activo (1 o 2)
  recipiente: 'vaso',  // tipo de recipiente activo
  vista3D: true,         // true = 3D WebGL, false = 2D SVG
  autoGiro: false,

  // Recipiente 1
  r1: {
    tipo: 'vaso',
    capacidadMax: 600, // mL personalizable
    soluteId: 'NaCl',
    masaG: 0,
    molesN: 0,
    volH2OMl: 0,       // mL de agua destilada pura añadida
    volSolucionMl: 0,  // mL de disolución total resultante (V_H2O + deltaV)
    volMl: 0           // alias directo para motor 3D y renderizado
  },

  // Recipiente 2
  r2: {
    tipo: 'matraz',
    capacidadMax: 500, // mL personalizable
    soluteId: 'NaCl',
    masaG: 0,
    molesN: 0,
    volH2OMl: 0,
    volSolucionMl: 0,
    volMl: 0
  },

  reservas: [],
  instrumentos: {
    pipeta: {capacidadMax:25,soluteId:'NaCl',masaG:0,molesN:0,volH2OMl:0,volMl:0,volSolucionMl:0},
    bureta: {capacidadMax:50,soluteId:'NaCl',masaG:0,molesN:0,volH2OMl:0,volMl:0,volSolucionMl:0}
  },
  historial: [],
  snapshotAnterior: null,

  // Gamificación
  logros: {
    primerExp: false,
    precisionPerfecta: false,
    maestroDiluciones: false,
    analista: false
  },
  contadorExp: 0,
  usoDilucion: 0,

  // Desafío activo
  desafioActivo: null,
  desafioPrimerIntento: true
};

// ============================================================
// ESTADO DE FÍSICAS DE FLUIDOS (Sloshing / Ondas / Vórtex)
// ============================================================

export const fluidPhysics = {
  vol1: 0, targetVol1: 0,
  vol2: 0, targetVol2: 0,
  sloshAngleX1: 0, sloshVelX1: 0,
  sloshAngleZ1: 0, sloshVelZ1: 0,
  sloshAngleX2: 0, sloshVelX2: 0,
  sloshAngleZ2: 0, sloshVelZ2: 0,
  vortexIntensity1: 0,
  vortexIntensity2: 0,
  rippleAmp1: 0,
  rippleAmp2: 0,
  bubbles: []
};

// ============================================================
// INICIALIZACIÓN
// ============================================================
