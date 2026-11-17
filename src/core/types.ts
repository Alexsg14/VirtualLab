/** Cantidades en gramos, moles y mililitros; temperatura en grados Celsius. */
export interface Componente { masaG:number; molesN:number; }
export interface Disolucion {
  soluteId:string; masaG:number; molesN:number; volH2OMl:number; volSolucionMl:number; volMl:number;
  capacidadMax?:number; modeloVolumen?:import('./density.ts').VolumenCalculado;
  componentes?:Record<string,Componente>; acidBase?:boolean; temperaturaC?:number; indicador?:string; nombreReserva?:string; objetivoTemperatura?:number;
}
export interface Concentraciones {molaridad:number;masica:number;pMasa:number;ppm:number;molalidad:number;}
