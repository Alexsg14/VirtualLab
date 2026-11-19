import type {Disolucion} from './types.ts';
import {actualizarVolumen,calcularConcentraciones,componentesDe} from './solution.ts';
import {RHO_AGUA_25} from './density.ts';
import {SOLUTOS,NOMBRES_RECIPIENTE} from '../data/catalog.ts';
interface Entrada {timestamp?:string;fechaISO?:string;tipo:string;soluto?:string;cantidad?:string;mesa?:number;estado?:Disolucion;}
export interface Diario {rec:Disolucion&{tipo?:string};mesa:number;historial:Entrada[];titulo?:string;autor?:string;observaciones?:string;fecha?:string;}
export function escaparLatex(s:unknown):string{
 const map:Record<string,string>={'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','$':'\\$','&':'\\&','#':'\\#','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'};
 return String(s??'').normalize('NFKC').replace(/[–—]/g,'-').replace(/→/g,' -> ').replace(/[^\x20-\x7e\u00a0-\u00ff\n]/g,'').replace(/[\\{}%$&#_^~]/g,c=>map[c]).slice(0,6000);
}
export function generarDiarioLatex(data:Diario):string{
 const r=structuredClone(data.rec);
 if(!r||![r.masaG,r.molesN,r.volH2OMl,r.volMl,r.temperaturaC??25].every(Number.isFinite)||r.masaG<=0||r.volH2OMl<=0)throw Error('Añade soluto y agua para generar el diario de una disolución.');
 actualizarVolumen(r);const ids=Object.keys(componentesDe(r)).filter(id=>componentesDe(r)[id].masaG>0);
 if(ids.length!==1)throw Error('Esta primera versión del diario admite disoluciones de un único soluto.');
 const sol=SOLUTOS.find(s=>s.id===ids[0]);if(!sol)throw Error('Soluto no reconocido.');
 const c=calcularConcentraciones(r),agua=r.modeloVolumen!.masaAguaG,total=r.masaG+r.modeloVolumen!.aguaLibreG;
 const n=(x:number,d=6)=>x.toFixed(d).replace(/\.?0+$/,'').replace('.', '{,}')||'0';
 const text=(x:unknown)=>escaparLatex(x),formula=sol.formula.normalize('NFKC').replace(/(\d+)/g,'_{$1}');
 const history=(data.historial??[]).filter(e=>e.mesa===data.mesa||e.mesa==null).slice(-120);
 const acciones:Record<string,string>={soluto:'Adición de soluto',disolvente:'Adición de agua',enrase:'Enrase registrado',vaciar:'Vaciado',vertido:'Transferencia',instrumento:'Instrumento',cambio_recipiente:'Cambio de recipiente',agitacion:'Agitación'};
 const rows=history.map(e=>`${text(e.timestamp)} & ${text(acciones[e.tipo]??e.tipo)}: ${text(e.soluto??'')} ${text(e.cantidad??'')} ${e.mesa==null?'(registro anterior sin recipiente identificado)':''} \\\\`).join('\n');
 const date=new Date(data.fecha??Date.now());if(Number.isNaN(date.getTime()))throw Error('Fecha no válida.');
 const warnings=r.modeloVolumen!.avisos.map(text).join(' ');
 return String.raw`\documentclass[11pt,a4paper]{article}
\usepackage{lmodern}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[margin=22mm]{geometry}
\usepackage{amsmath,xcolor,longtable,array,booktabs}
\definecolor{acento}{HTML}{087D89}
\definecolor{fondo}{HTML}{EDF6F7}
\renewcommand{\familydefault}{\sfdefault}
\setlength{\parindent}{0pt}\setlength{\parskip}{6pt}
\setlength{\emergencystretch}{3em}
\newcommand{\bloque}[1]{\par\vspace{8pt}{\large\bfseries\color{acento}#1}\par\vspace{3pt}}
\begin{document}
{\small\bfseries\color{acento}VIRTUAL LAB / CUADERNO DE LABORATORIO}\par
\vspace{9pt}{\fontsize{25}{29}\selectfont\bfseries ${text(data.titulo||'Preparación de una disolución')}}\par
${text(sol.nombre)} / $\mathrm{${formula}}$\par
\vspace{5pt}\hrule\vspace{8pt}
\textbf{Fecha:} ${text(date.toLocaleString('es-ES'))}\hfill\textbf{Recipiente:} R${data.mesa===2?'2':'1'}\par
\textbf{Autor:} ${text(data.autor||'No indicado')}\par
\bloque{1. Estado final registrado}
\fcolorbox{acento}{fondo}{\parbox{.94\linewidth}{\textbf{Volumen final:} $${n(r.volMl,3)}\,\mathrm{mL}$\hfill\textbf{Molaridad:} $${n(c.molaridad,5)}\,\mathrm{mol/L}$}}
\vspace{9pt}
\begin{tabular}{@{}p{.48\linewidth}p{.47\linewidth}@{}}
\textbf{Material} & ${text(NOMBRES_RECIPIENTE[(r.tipo??'vaso') as keyof typeof NOMBRES_RECIPIENTE]||r.tipo||'Recipiente')} \\
\textbf{Masa de soluto} & $${n(r.masaG,5)}\,\mathrm{g}$ \\
\textbf{Masa molar} & $${n(sol.M,3)}\,\mathrm{g/mol}$ \\
\textbf{Masa de agua calculada} & $${n(agua,5)}\,\mathrm{g}$ \\
\textbf{Temperatura} & $${n(r.temperaturaC??25,2)}\,{}^\circ\mathrm{C}$ \\
\textbf{Densidad calculada} & $${n(r.modeloVolumen!.densidadGmL!,6)}\,\mathrm{g/mL}$ \\
\end{tabular}
\bloque{2. Operaciones del diario}
Se documentan las operaciones registradas; no se presupone que se haya enrasado ni que exista un objetivo de concentración.
\begin{longtable}{@{}p{.16\linewidth}p{.80\linewidth}@{}}
\toprule\textbf{Hora} & \textbf{Operación}\\\midrule\endhead
${rows||String.raw`--- & No hay operaciones registradas para este recipiente. \\`}
\bottomrule\end{longtable}
\textbf{Trazabilidad.} Las cantidades del estado final se utilizan en los cálculos de la página siguiente. Los registros antiguos sin recipiente identificado se incluyen como contexto de sesión y no se atribuyen a R${data.mesa===2?'2':'1'}.
${data.observaciones?String.raw`\bloque{Observaciones}\textit{${text(data.observaciones)}}`:''}
\newpage
{\small\bfseries\color{acento}VIRTUAL LAB / DESARROLLO DE CÁLCULOS}\par
{\fontsize{23}{27}\selectfont\bfseries De la preparación al resultado}\par
Los factores conservan sus unidades para mostrar cómo se obtiene cada magnitud. Los resultados son cálculos del simulador, no medidas experimentales independientes.
\bloque{1. De gramos a moles}
\[n=${n(r.masaG,5)}\,\mathrm{g}\times\frac{1\,\mathrm{mol}}{${n(sol.M,3)}\,\mathrm{g}}=${n(r.molesN,7)}\,\mathrm{mol}\]
\bloque{2. Volumen final y molaridad}
\[V=${n(r.volMl,3)}\,\mathrm{mL}\times\frac{1\,\mathrm{L}}{1000\,\mathrm{mL}}=${n(r.volMl/1000,7)}\,\mathrm{L}\]
\[C=\frac{n}{V}=\frac{${n(r.molesN,7)}\,\mathrm{mol}}{${n(r.volMl/1000,7)}\,\mathrm{L}}=${n(c.molaridad,6)}\,\mathrm{mol/L}\]
\bloque{3. Concentración másica}
\[C_m=\frac{${n(r.masaG,5)}\,\mathrm{g}}{${n(r.volMl/1000,7)}\,\mathrm{L}}=${n(c.masica,5)}\,\mathrm{g/L}\]
\bloque{4. Porcentaje en masa y partes por millón}
\[m_{\mathrm{disolucion}}=${n(r.masaG,5)}+${n(r.modeloVolumen!.aguaLibreG,5)}=${n(total,5)}\,\mathrm{g}\]
\[\%\,(m/m)=\frac{${n(r.masaG,5)}}{${n(total,5)}}\times100=${n(c.pMasa,5)}\,\%\]
\[\mathrm{ppm}=\frac{${n(r.masaG,5)}\,\mathrm{g}\times\frac{1000\,\mathrm{mg}}{1\,\mathrm{g}}}{${n(total,5)}\,\mathrm{g}\times\frac{1\,\mathrm{kg}}{1000\,\mathrm{g}}}=${n(c.ppm,3)}\,\mathrm{mg/kg}\]
\bloque{5. Molalidad: masa del disolvente}
\[m=\frac{${n(r.molesN,7)}\,\mathrm{mol}}{${n(agua,5)}\,\mathrm{g}\times\frac{1\,\mathrm{kg}}{1000\,\mathrm{g}}}=${n(c.molalidad,6)}\,\mathrm{mol/kg}\]
\bloque{Modelo de volumen}
El agua se conserva como masa: su volumen equivalente a $25\,{}^\circ\mathrm{C}$ es $${n(r.volH2OMl,4)}\,\mathrm{mL}$, con $\rho_{25}=${n(RHO_AGUA_25,7)}\,\mathrm{g/mL}$. No es el volumen parcial del agua en la disolución.
${r.modeloVolumen!.modelo==='laliberte'?'Se utiliza la correlación de densidad de Laliberté (2009), DOI 10.1021/je8008123. El volumen final se obtiene mediante masa total dividida por densidad.':'El volumen utiliza una aproximación didáctica para este soluto.'}
${warnings?String.raw`\textbf{Avisos:} ${warnings}`:''}
\end{document}`;
}