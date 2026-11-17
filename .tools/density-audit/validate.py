"""Auditoría numérica independiente de los anexos, sin ejecutar VBA ni tocar XLS."""
from pathlib import Path
import json,re,math,statistics,hashlib
from read_xls import xls
ROOT=Path('je8008123_si_001');OUT=Path('.tools/density-audit')
SUMMARY=json.loads((OUT/'_PropertiesAqueousSolution.json').read_text(encoding='utf-8'))['sheets']['Salts']['cells']
TARGETS=['NaCl','NaOH','HCl','H2SO4','NH3','HCH3CO2','CuSO4','CoCl2','KI','NaHCO3','KCl','Sucrose']
def number(x):return isinstance(x,(int,float))and not isinstance(x,bool)and math.isfinite(x)
def water(t):return (((((-2.8054253e-10*t+1.0556302e-7)*t-4.6170461e-5)*t-.0079870401)*t+16.945176)*t+999.83952)/(1+.01687985*t)
def density(t,w,c):
 c0,c1,c2,c3,c4=c
 # Volumen específico aparente; admite expansión o electrostricción.
 vapp=(w+c2+c3*t)/((c0*w+c1)*math.exp(1e-6*(t+c4)**2))
 return 1/((1-w)/water(t)+w*vapp)
def refcell(col,row):return col+str(row)
files={p.stem.casefold():p for p in ROOT.glob('*')if p.suffix.lower()=='.xls'}
all_results=[];source_hashes={}
for cell,name in SUMMARY.items():
 if not re.fullmatch('[A-Z]+2',cell)or name.casefold()not in files:continue
 col=cell[:-1];c=[SUMMARY.get(refcell(col,r))for r in range(5,10)]
 if not all(number(v)for v in c):continue
 path=files[name.casefold()];source_hashes[str(path)]=hashlib.sha256(path.read_bytes()).hexdigest()
 data=xls(path)
 if 'Density'not in data['sheets']:continue
 sheet=data['sheets']['Density'];cells=sheet['cells'];formulas=sheet['formula_tokens']
 found={}
 for a,label in cells.items():
  if label in ['c0','c1','c2','c3','c4','Min T','Max T','Max w','No of points in corr']:
   row=int(re.search(r'\d+',a)[0]);v=cells.get('C'+str(row))
   if number(v):found[label]={'cell':'C'+str(row),'value':v}
 param_match=all(k in found and abs(found[k]['value']-c[i])<1e-12*max(1,abs(c[i]))for i,k in enumerate(['c0','c1','c2','c3','c4']))
 headers=[int(re.search(r'\d+',a)[0])for a,v in cells.items()if isinstance(v,str)and v.startswith('Density exp')and a.startswith('E')]
 start=min(headers)if headers else 0
 diffs=[];residuals=[];used_residuals=[];rows_25=[];mismatches=[];bad=[];primary=[]
 fit_end=min([int(re.search(r'\d+',a)[0])for a,v in cells.items()if isinstance(v,str)and v.strip()=='Average Res'],default=found.get('c0',{}).get('cell','C999999')[1:])
 fit_end=int(fit_end)
 for a,calc in cells.items():
  if not re.fullmatch('I[0-9]+',a)or not number(calc):continue
  row=int(a[1:]);t=cells.get('C'+str(row));w=cells.get('D'+str(row));exp=cells.get('E'+str(row));ref=cells.get('F'+str(row))
  if row<=start or not all(number(v)for v in [t,w,exp,ref])or not(0<w<=1)or exp<=0:continue
  try:ind=density(t,w,c)
  except Exception as e:bad.append({'row':row,'error':str(e)});continue
  diff=abs(ind-calc);diffs.append(diff);residuals.append(ind-exp)
  if row<fit_end:primary.append({'row':row,'w':w,'t':t,'residual':exp-ind,'observed':exp})
  if diff>1e-7:mismatches.append({'row':row,'difference':diff,'independent':ind,'cached':calc})
  marker=cells.get('M'+str(row));
  if not isinstance(marker,str)or '!'not in marker:used_residuals.append(ind-exp)
  if abs(t-25)<1e-7:rows_25.append({'row':row,'w':w,'observed':exp,'predicted':ind,'excluded':isinstance(marker,str)and '!'in marker})
 checks=[]
 for rr,t,w in [(60,25,.1),(61,100,.2)]:
  cached=SUMMARY.get(col+str(rr));prediction=density(t,w,c)
  if number(cached):checks.append({'cell':col+str(rr),'cached':cached,'predicted':prediction,'difference':abs(cached-prediction),'within_domain':SUMMARY[col+'10']<=t<=SUMMARY[col+'11']and w<=SUMMARY[col+'12']})
 result={'primary_count':len(primary),'primary_average_residual':statistics.mean([p['residual']for p in primary])if primary else None,'primary_std_residual':statistics.stdev([p['residual']for p in primary])if len(primary)>1 else None,'primary_min_w':min([p['w']for p in primary],default=None),'solute':name,'summary_column':col,'M':SUMMARY[col+'3'],'coefficients':c,'temperature_C':[SUMMARY[col+'10'],SUMMARY[col+'11']],'max_mass_fraction':SUMMARY[col+'12'],'summary_point_count':SUMMARY[col+'18'],'coefficients_match':param_match,'individual_parameter_cells':found,'tested_density_rows':len(diffs),'maximum_difference_cached_kg_m3':max(diffs,default=0),'mismatches':mismatches[:5],'bad':bad,'included_count':len(used_residuals),'rmse_included_kg_m3':math.sqrt(statistics.mean([r*r for r in used_residuals]))if used_residuals else None,'observations_25C':len(rows_25),'independent_summary_checks':checks,'notes':[{ 'cell':a,'text':v}for a,v in cells.items()if isinstance(v,str)and ('note'in v.lower()or 'not used'in v.lower()or 'supersatur'in v.lower()or 'correct'in v.lower())and len(v)>25]}
 all_results.append(result)
 if name in TARGETS:
  (OUT/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,allow_nan=False),encoding='utf-8')
  print(name,'params',param_match,'rows',len(diffs),'maxdiff',f'{max(diffs,default=0):.3g}','T',result['temperature_C'],'wmax',round(result['max_mass_fraction'],5),'25C',len(rows_25))
OUT.joinpath('validation.json').write_text(json.dumps({'source_hashes':source_hashes,'solutes':all_results},ensure_ascii=False,indent=2),encoding='utf-8')
print('TOTAL',len(all_results),'filas',sum(r['tested_density_rows']for r in all_results),'discrepancias',sum(len(r['mismatches'])for r in all_results),'errores',sum(len(r['bad'])for r in all_results))
# Preparaciones de referencia a 25 °C, usando los coeficientes del anexo.
for id,M in [('NaCl',58.44),('NaOH',40.00)]:
 c=next(r['coefficients']for r in all_results if r['solute']==id);mass=.1*M;water_mass=200*water(25)/1000
 def volume(water_mass):return (water_mass+mass)/(density(25,mass/(water_mass+mass),c)/1000)
 lo,hi=0.,250.
 for _ in range(100):
  mid=(lo+hi)/2
  if volume(mid)<200:lo=mid
  else:hi=mid
 print('REFERENCIA',id,'agua_enrasar_g',(lo+hi)/2,'sin_enrasar_V_mL',volume(water_mass),'M_real',.1/(volume(water_mass)/1000))
