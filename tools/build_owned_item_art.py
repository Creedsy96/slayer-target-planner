"""Build an offline inventory atlas from a local pinned DPS-source checkout.

No network access. Pass the reviewed checkout at the pinned revision as --source.
"""
import argparse
import hashlib
import json
import math
import subprocess
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
COMMIT='3da927f4280c73154fa59e4e90eb374af5123d32'

def build(source):
 revision=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
 if revision!=COMMIT:raise ValueError('Use the pinned source revision')
 equipment=json.loads((ROOT/'vendor/osrs-dps/source/cdn/json/equipment.json').read_text(encoding='utf-8'))
 images=sorted({i['image'] for i in equipment if (source/'cdn/equipment'/i['image']).is_file()})
 columns,cell=64,40;rows=math.ceil(len(images)/columns)
 sheet=Image.new('RGBA',(columns*cell,rows*cell));frames={};sources={}
 for frame,name in enumerate(images):
  path=source/'cdn/equipment'/name;image=Image.open(path).convert('RGBA');image.thumbnail((36,36),Image.Resampling.LANCZOS)
  sheet.alpha_composite(image,(frame%columns*cell+(cell-image.width)//2,frame//columns*cell+(cell-image.height)//2))
  frames[name]=frame;sources[name]=dict(sha256=hashlib.sha256(path.read_bytes()).hexdigest(),frame=frame)
 entries={str(i['id']):dict(frame=frames[i['image']],name=i['name'],image=i['image']) for i in equipment if i['image'] in frames}
 sheet.save(ROOT/'assets/owned-items.png',optimize=True)
 (ROOT/'src/ui/owned-art.json').write_text(json.dumps(dict(source='https://github.com/weirdgloop/osrs-dps-calc',commit=COMMIT,columns=columns,rows=rows,cell=cell,entries=entries,images=sources),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
 print('Built owned-item artwork:',len(entries),'items,',len(images),'images; network requests: 0')

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',type=Path,required=True);args=parser.parse_args();build(args.source)
