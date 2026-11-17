// Perfil del aforado: pie plano, cuerpo de pera y cuello largo.
export const FONDO_MATRAZ=0.04,CUELLO_MATRAZ=1.65,BOCA_MATRAZ=3.39,AFORO_MATRAZ=2.954,RADIO_CUELLO=0.14;
const nodos=[[0.04,0.50,2],[0.16,0.69,1.0],[0.40,0.78,0],[0.75,0.67,-0.55],[1.15,0.42,-0.65],[1.65,0.14,0]];
export function radioMatraz(y){
 if(y<=FONDO_MATRAZ)return nodos[0][1];if(y>=CUELLO_MATRAZ)return RADIO_CUELLO;
 for(let i=1;i<nodos.length;i++)if(y<=nodos[i][0]){
  const [a,ra,ma]=nodos[i-1],[b,rb,mb]=nodos[i],d=b-a,t=(y-a)/d;
  return (2*t**3-3*t**2+1)*ra+(t**3-2*t**2+t)*d*ma+(-2*t**3+3*t**2)*rb+(t**3-t**2)*d*mb;
 }
 return RADIO_CUELLO;
}
