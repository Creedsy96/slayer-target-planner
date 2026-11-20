"""Extract skill requirements and noted/placeholder IDs from a pinned local DB.

No network calls. Obtain the pinned OSRSBox items-complete.json separately and
pass its path with --source. Unknown/new requirements stay explicitly unknown.
"""
import argparse
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA256='6dff51177a74dfe7fc37dbd78fa3243975c40cc69d794d1830ac0f95887e766e'

def build(source):
 content=source.read_bytes()
 if hashlib.sha256(content).hexdigest()!=SOURCE_SHA256:raise ValueError('Use the reviewed OSRSBox source snapshot')
 old=json.loads(content)
 equipment=json.loads((ROOT/'vendor/osrs-dps/source/cdn/json/equipment.json').read_text(encoding='utf-8'))
 requirements={str(item['id']):(old[str(item['id'])]['equipment'].get('requirements') or {}) for item in equipment if str(item['id']) in old and old[str(item['id'])].get('equipment') is not None}
 noted={id:str(row['linked_id_item']) for id,row in old.items() if row.get('noted') and row.get('linked_id_item')}
 placeholders=[int(id) for id,row in old.items() if row.get('placeholder')]
 output=dict(source='https://github.com/osrsbox/osrsbox-db',commit='dae12e3400add0c71465f07a334f9d8f86bebce8',sourceSha256=SOURCE_SHA256,requirements=requirements,noted=noted,placeholders=placeholders)
 (ROOT/'data/equipment-requirements.json').write_text(json.dumps(output,separators=(',',':'))+'\n',encoding='utf-8')
 print('Known requirements:',len(requirements),'noted aliases:',len(noted),'placeholder IDs:',len(placeholders))

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',type=Path,required=True);args=parser.parse_args();build(args.source)
