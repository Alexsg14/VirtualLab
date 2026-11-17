"""Lector de solo lectura CFB/BIFF8 para inspección de los anexos antiguos XLS.
No ejecuta VBA, no recalcula ni escribe los libros originales.
"""
from pathlib import Path
import struct, json, math, re
U32=lambda d,o=0:struct.unpack_from('<I',d,o)[0]
U16=lambda d,o=0:struct.unpack_from('<H',d,o)[0]
class CFB:
 def __init__(self,path):
  self.raw=Path(path).read_bytes();d=self.raw
  if d[:8]!=bytes.fromhex('D0CF11E0A1B11AE1'):raise ValueError('No es CFB')
  self.ss=1<<U16(d,30);self.ms=1<<U16(d,32);fatids=list(struct.unpack_from('<109I',d,76));cur=U32(d,68)
  for _ in range(U32(d,72)):
   b=self.sector(cur);fatids.extend(struct.unpack_from('<%dI'%(self.ss//4-1),b));cur=U32(b,self.ss-4)
  self.fat=[]
  for i in fatids:
   if i<0xFFFFFFFA:self.fat.extend(struct.unpack('<%dI'%(self.ss//4),self.sector(i)))
  directory=self.chain(U32(d,48));self.entries=[]
  for off in range(0,len(directory),128):
   e=directory[off:off+128]
   if len(e)<128:break
   self.entries.append({'name':e[:max(0,U16(e,64)-2)].decode('utf-16le',errors='replace'),'type':e[66],'left':U32(e,68),'right':U32(e,72),'child':U32(e,76),'start':U32(e,116),'size':struct.unpack_from('<Q',e,120)[0]})
  self.mini=self.chain(self.entries[0]['start'])[:self.entries[0]['size']];b=self.chain(U32(d,60));self.minifat=list(struct.unpack('<%dI'%(len(b)//4),b))
  self.paths={}
  def walk(i,parent=''):
   if i>=len(self.entries):return
   e=self.entries[i];walk(e['left'],parent);path=parent+e['name'];self.paths[path]=e
   if e['type']==1:walk(e['child'],path+'/')
   walk(e['right'],parent)
  walk(self.entries[0]['child'])
 def sector(self,i):return self.raw[(i+1)*self.ss:(i+2)*self.ss]
 def chain(self,i):
  chunks=[];seen=set()
  while i<0xFFFFFFFA and i<len(self.fat) and i not in seen:seen.add(i);chunks.append(self.sector(i));i=self.fat[i]
  return b''.join(chunks)
 def read(self,path):
  e=self.paths[path]
  if e['size']>=4096:return self.chain(e['start'])[:e['size']]
  i=e['start'];chunks=[];seen=set()
  while i<0xFFFFFFFA and i<len(self.minifat) and i not in seen:seen.add(i);chunks.append(self.mini[i*self.ms:(i+1)*self.ms]);i=self.minifat[i]
  return b''.join(chunks)[:e['size']]
class Segments:
 def __init__(self,chunks):self.chunks=chunks;self.i=0;self.pos=0
 def read(self,n):
  out=bytearray()
  while n:
   if self.pos==len(self.chunks[self.i]):self.i+=1;self.pos=0
   k=min(n,len(self.chunks[self.i])-self.pos);out.extend(self.chunks[self.i][self.pos:self.pos+k]);self.pos+=k;n-=k
  return bytes(out)
 def string(self):
  count=U16(self.read(2));flags=self.read(1)[0];rich=U16(self.read(2)) if flags&8 else 0;ext=U32(self.read(4)) if flags&4 else 0;wide=bool(flags&1);out=[]
  while count:
   if self.pos==len(self.chunks[self.i]):self.i+=1;self.pos=0;wide=bool(self.read(1)[0]&1)
   n=min(count,(len(self.chunks[self.i])-self.pos)//(2 if wide else 1));raw=self.read(n*(2 if wide else 1));out.append(raw.decode('utf-16le' if wide else 'latin1',errors='replace'));count-=n
  self.read(rich*4+ext);return ''.join(out)
def records(d,start=0):
 o=start
 while o+4<=len(d):
  code,length=struct.unpack_from('<HH',d,o);yield o,code,d[o+4:o+4+length];o+=4+length
  if code==0xA and start:break
def rk(x):
 if x&2:v=struct.unpack('<i',struct.pack('<I',x))[0]>>2
 else:v=struct.unpack('<d',struct.pack('<II',0,x&0xFFFFFFFC))[0]
 return v/100 if x&1 else v
def col(n):
 s='';n+=1
 while n:n,r=divmod(n-1,26);s=chr(65+r)+s
 return s
def xls(path):
 cfb=CFB(path);d=cfb.read('Workbook' if 'Workbook'in cfb.paths else 'Book');rr=list(records(d));strings=[];sheets=[]
 for i,(off,code,b)in enumerate(rr):
  if code==0x85:
   n=b[6];name=b[8:8+n*(2 if b[7]&1 else 1)].decode('utf-16le' if b[7]&1 else 'latin1');sheets.append((U32(b),name))
  if code==0xFC:
   chunks=[b];j=i+1
   while j<len(rr) and rr[j][1]==0x3C:chunks.append(rr[j][2]);j+=1
   seg=Segments(chunks);total=U32(seg.read(4));unique=U32(seg.read(4));strings=[seg.string()for _ in range(unique)]
 out={}
 for offset,name in sheets:
  cells={};formulas={};last_string=None
  def put(row,c,value):cells[f'{col(c)}{row+1}']=value
  for _,code,b in records(d,offset):
   if code==0xFD:put(U16(b),U16(b,2),strings[U32(b,6)])
   elif code==0x203:put(U16(b),U16(b,2),struct.unpack_from('<d',b,6)[0])
   elif code==0x27E:put(U16(b),U16(b,2),rk(U32(b,6)))
   elif code==0xBD:
    row,first=U16(b),U16(b,2)
    for k in range((len(b)-6)//6):put(row,first+k,rk(U32(b,6+k*6)))
   elif code==0x205:put(U16(b),U16(b,2),{'error':b[6]}if b[7]else bool(b[6]))
   elif code==0x6:
    row,c=U16(b),U16(b,2);a=f'{col(c)}{row+1}'
    if b[12:14]!=b'\xff\xff':value=struct.unpack_from('<d',b,6)[0]
    else:
     t=b[6];value=None if t in(0,3)else bool(b[8])if t==1 else {'error':b[8]}
     if t==0:last_string=a
    put(row,c,value);formulas[a]=b[22:22+U16(b,20)].hex()
   elif code==0x207 and last_string:cells[last_string]=Segments([b]).string();last_string=None
  out[name]={'cells':cells,'formula_tokens':formulas}
 return {'file':Path(path).name,'sheets':out,'streams':list(cfb.paths)}
if __name__=='__main__':
 import sys
 for p in sys.argv[1:]:
  data=xls(p);target=Path('.tools/density-audit')/(Path(p).stem+'.json');target.write_text(json.dumps(data,ensure_ascii=False,allow_nan=False),encoding='utf-8');print(data['file'],[(s,len(x['cells']),len(x['formula_tokens']))for s,x in data['sheets'].items()])
