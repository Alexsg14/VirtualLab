"""Extrae texto VBA comprimido y texto del DOC sin ejecutar macros."""
from pathlib import Path
import struct,math,sys,re
sys.path.insert(0,str(Path(__file__).parent));from read_xls import CFB,U16,U32

def decompress(d):
 if not d or d[0]!=1:raise ValueError('Cabecera OVBA')
 out=bytearray();pos=1
 while pos+2<=len(d):
  begin=pos;header=U16(d,pos);pos+=2
  if (header>>12)&7 !=3:raise ValueError('Firma chunk')
  end=min(len(d),begin+(header&4095)+3);base=len(out)
  if not(header&0x8000):out.extend(d[pos:end]);pos=end;continue
  while pos<end:
   flags=d[pos];pos+=1
   for bit in range(8):
    if pos>=end:break
    if flags&(1<<bit):
     token=U16(d,pos);pos+=2;bits=max(4,(len(out)-base-1).bit_length());mask=0xFFFF>>bits;length=(token&mask)+3;offset=(token>>(16-bits))+1
     if offset>len(out)-base:raise ValueError('Offset inválido')
     for _ in range(length):out.append(out[-offset])
    else:out.append(d[pos]);pos+=1
  pos=end
 return bytes(out)
if __name__=='__main__':
 root=Path('je8008123_si_001');c=CFB(root/'_PropertiesAqueousSolution.xls')
 for path in c.paths:
  if '/VBA/'not in path or path.endswith('/dir') or '/__'in path or path.endswith('_VBA_PROJECT'):continue
  data=c.read(path)
  for offset in range(len(data)-3):
   if data[offset]!=1 or ((U16(data,offset+1)>>12)&7)!=3:continue
   try:text=decompress(data[offset:]).decode('cp1252')
   except Exception:continue
   if 'Attribute VB_Name'in text:
    (Path('.tools/density-audit')/(path.rsplit('/',1)[1]+'.bas.txt')).write_text(text,encoding='utf-8');print('VBA leído:',path,'offset',offset,'caracteres',len(text));break
 # FIB Word 97: CLX (piece table), 34.º par fc/lcb.
 c=CFB(root/'_Read_me_first.doc');w=c.read('WordDocument');table=c.read('1Table'if U16(w,10)&0x200 else '0Table')
 pos=32;pos+=2+U16(w,pos)*2;pos+=2+U16(w,pos)*4;pos+=2
 fc,lcb=struct.unpack_from('<II',w,pos+33*8);clx=table[fc:fc+lcb];off=0
 while clx[off]==1:off+=3+U16(clx,off+1)
 if clx[off]!=2:raise ValueError('Sin piece table')
 size=U32(clx,off+1);plc=clx[off+5:off+5+size];n=(size-4)//12;cps=struct.unpack_from('<%dI'%(n+1),plc);texts=[]
 for i in range(n):
  start=U32(plc,4*(n+1)+i*8+2);compressed=bool(start&0x40000000);start&=0x3FFFFFFF;count=cps[i+1]-cps[i]
  if compressed:start//=2
  texts.append(w[start:start+count*(1 if compressed else 2)].decode('cp1252'if compressed else 'utf-16le',errors='replace'))
 text=''.join(texts).replace('\r','\n');Path('.tools/density-audit/instrucciones.txt').write_text(text,encoding='utf-8');print('DOC leído:',len(text),'caracteres')
