import type {Disolucion} from './types.ts';

export const REACTIVOS_AB = ['HCl','NaOH','CH3COOH','NH3','NaCl','H2SO4','H2Mal'];
// Constantes de referencia a 25 °C; H2SO4: primera disociación completa.
export const DIPROTICOS = {
  H2SO4:{ka1:Infinity,ka2:0.012},
  H2Mal:{ka1:10**(-2.83),ka2:10**(-5.69)}
};
export function cargaDiprotico(h:number,ka1:number,ka2:number):number {
  if(ka1===Infinity)return 1+ka2/(h+ka2);
  return (ka1*h+2*ka1*ka2)/(h*h+ka1*h+ka1*ka2);
}
export const INDICADORES = {
  fenolftaleina:{nombre:'Fenolftaleína',desde:8.3,hasta:10,bajo:[240,247,252],alto:[245,20,145]},
  naranja:{nombre:'Naranja de metilo',desde:3.2,hasta:4.4,bajo:[225,45,40],alto:[250,195,35]},
  azul:{nombre:'Azul de bromotimol',desde:6,hasta:7.6,bajo:[245,215,35],alto:[40,95,225]},
};
/** Aproximación por interpolación; pKw convencional a 25 °C = 14. */
export function pKwAgua(temperatura=25):number {
  const puntos=[[0,14.95],[25,14],[50,13.26],[75,12.70],[100,12.25]];
  const t=Math.max(0,Math.min(100,temperatura));
  for(let i=1;i<puntos.length;i++)if(t<=puntos[i][0]) {
    const [a,pa]=puntos[i-1], [b,pb]=puntos[i];return pa+(pb-pa)*(t-a)/(b-a);
  }
  return 12.25;
}
export function medirAcidez(rec:Disolucion) {
  if(rec.volMl<=0 || rec.volH2OMl<=0)return null;
  const componentes=rec.componentes || (rec.masaG>0?{[rec.soluteId]:{masaG:rec.masaG,molesN:rec.molesN}}:{});
  if(Object.keys(componentes).some(id=>!REACTIVOS_AB.includes(id)))return null;
  const litros=rec.volMl/1000, conc=(id:string)=>(componentes[id]?.molesN||0)/litros;
  const pKw=pKwAgua(rec.temperaturaC??25), kw=10**(-pKw);
  // Constantes aproximadas a 25 °C. Balance de carga: incluye neutralización y tampones.
  const kaAcetico=1.8e-5, kaAmonio=1e-14/1.8e-5;
  const balance=(pH:number)=>{
    const h=10**(-pH);
    return h+conc('NaOH')+conc('NH3')*h/(h+kaAmonio)-kw/h-conc('HCl')-conc('CH3COOH')*kaAcetico/(kaAcetico+h)-Object.entries(DIPROTICOS).reduce((sum,[id,k])=>sum+conc(id)*cargaDiprotico(h,k.ka1,k.ka2),0);
  };
  let lo=-2,hi=16;
  for(let i=0;i<100;i++){const mid=(lo+hi)/2;if(balance(mid)>0)lo=mid;else hi=mid;}
  const pH=(lo+hi)/2, neutro=pKw/2;
  return {pH,pOH:pKw-pH,neutro,h:10**(-pH),oh:10**(pH-pKw),caracter:Math.abs(pH-neutro)<0.05?'Neutra':pH<neutro?'Ácida':'Básica'};
}
export function colorIndicador(rec:Disolucion):number[]|null {
  const indicador=INDICADORES[rec.indicador as keyof typeof INDICADORES];
  if(!indicador)return null;
  const medida=medirAcidez(rec);if(!medida)return null;
  let f=Math.max(0,Math.min(1,(medida.pH-indicador.desde)/(indicador.hasta-indicador.desde)));
  if(rec.indicador==='fenolftaleina') {
    // Viraje de equilibrio. No se simula la cinética de decoloración en álcali extremo.
    const fraccion=(pH:number)=>1/(1+10**(9.3-pH));
    f=Math.max(0,Math.min(1,(fraccion(medida.pH)-fraccion(8.3))/(fraccion(10)-fraccion(8.3))));
  }
  if(rec.indicador==='azul') {
    if(f<0.5)return [245+(45-245)*f*2,215+(180-215)*f*2,35+(100-35)*f*2];
    return [45+(40-45)*(f-0.5)*2,180+(95-180)*(f-0.5)*2,100+(225-100)*(f-0.5)*2];
  }
  return indicador.bajo.map((c,i)=>c+(indicador.alto[i]-c)*f);
}

export function opacidadIndicador(rec:Disolucion):number {
  if(rec.indicador!=='fenolftaleina')return rec.indicador?0.65:0.3;
  const c=colorIndicador(rec);if(!c)return 0.15;
  const intensidad=Math.max(0,Math.min(1,(247-c[1])/(247-20)));
  return 0.12+0.53*intensidad;
}
