/** Parámetros originales de Laliberté (2009), DOI 10.1021/je8008123.
 * Transcritos y contrastados con los anexos aportados je8008123_si_001.
 * c0..c4: hoja Salts, filas 5–9; T en °C; w es fracción másica, no molaridad.
 * Los extremos de T y w no garantizan solubilidad en todo su producto cartesiano.
 * Se conserva la forma anhidra del catálogo: no se inventan parámetros de hidratos.
 */
export interface DatosDensidad {
 c:number[];tMin:number;tMax:number;wMinDatos:number;wMax:number;aguasHidratacion:number;columnaResumen:string;archivo:string;
}
export const DENSIDADES:Record<string,DatosDensidad>={
  "CoCl2": {"c": [-7.783185117451826e-05, 0.00018889837191626442, 0.4699950445894204, 0.010295814489531799, 4151.260091257202], "tMin": 15.0, "tMax": 75.0, "wMinDatos": 0.0013083715213104811, "wMax": 0.3032192807720161, "aguasHidratacion": 0, "columnaResumen": "P", "archivo": "CoCl2.xls"},
  "CuSO4": {"c": [-1.1207829415028462e-06, 6.068505906121169e-07, -0.11886323246381438, 0.0037805007586055126, 4763.96073964247], "tMin": 10.0, "tMax": 60.0, "wMinDatos": 0.0016078754729871834, "wMax": 0.28440008647309356, "aguasHidratacion": 0, "columnaResumen": "V", "archivo": "CuSO4.xls"},
  "H2SO4": {"c": [70.83951523471217, 142.35269390924825, 0.6877945961879302, 0.00649299683206703, 1667.2386462952168], "tMin": -11.15, "tMax": 75.0, "wMinDatos": 0.005074156821599523, "wMax": 0.782, "aguasHidratacion": 0, "columnaResumen": "AB", "archivo": "H2SO4.xls"},
  "CH3COOH": {"c": [647.2892439719584, -1054.5822602958629, -1.7461076862687888, 0.0003655664327636411, -822.9995070105439], "tMin": 5.0, "tMax": 85.0, "wMinDatos": 0.0012738372689692459, "wMax": 1.0, "aguasHidratacion": 0, "columnaResumen": "AG", "archivo": "HCH3CO2.xls"},
  "HCl": {"c": [0.0002838722604829061, 0.003949469571698821, 2.850200476818069, -0.015774701256804625, -3766.2086866500604], "tMin": 5.0, "tMax": 98.82000000000005, "wMinDatos": 0.0003662988260039759, "wMax": 0.37569856771174637, "aguasHidratacion": 0, "columnaResumen": "AI", "archivo": "HCl.xls"},
  "KI": {"c": [278.9436401320309, 1407.6191289644828, 2.50114423686534, 0.013851163277222748, 1387.5410803663683], "tMin": 0.0, "tMax": 100.02, "wMinDatos": 0.00045722550311054586, "wMax": 0.6669, "aguasHidratacion": 0, "columnaResumen": "AY", "archivo": "KI.xls"},
  "NaCl": {"c": [-0.003241122236551491, 0.06363543359066155, 1.013713994673654, 0.014595101521015867, 3317.3485442653746], "tMin": 0.0, "tMax": 140.0, "wMinDatos": 0.003043933380207345, "wMax": 0.2658993042187703, "aguasHidratacion": 0, "columnaResumen": "CD", "archivo": "NaCl.xls"},
  "NaHCO3": {"c": [0.03773780606158983, 0.007100296524583663, 0.07357333885351162, 0.0016836976551122145, 3291.383822520247], "tMin": 0.0, "tMax": 125.0, "wMinDatos": 0.0002502871406643921, "wMax": 0.1264416435826408, "aguasHidratacion": 0, "columnaResumen": "CH", "archivo": "NaHCO3.xls"},
  "NaOH": {"c": [319.0205094698384, 528.5923584753147, -0.1021978966027242, 0.0003504207064155657, 765.9704702384378], "tMin": 4.0, "tMax": 120.0, "wMinDatos": 3.308632755765476e-05, "wMax": 0.502885546184013, "aguasHidratacion": 0, "columnaResumen": "CP", "archivo": "NaOH.xls"},
  "NH3": {"c": [0.06376317259245227, 0.0681799828976475, 1.2375995276739744, -0.005998524937214791, -3078.5776718950683], "tMin": 20.0, "tMax": 140.65, "wMinDatos": 0.003176358596858283, "wMax": 0.5218920562358733, "aguasHidratacion": 0, "columnaResumen": "CQ", "archivo": "NH3.xls"},
};
// TODO: glucosa, H2Mal, KMnO4 y AgNO3: completar con datos de literatura
// de densidad y sus rangos. Hasta entonces conservan un modelo aproximado explícito.
