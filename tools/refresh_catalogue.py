"""Capture a candidate snapshot and report differences without changing live data."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,required=True,help='New candidate directory outside live data/sources')
parser.add_argument('--version',required=True)
args=parser.parse_args()
out=args.output.resolve()
if out.exists() or out==root/'data' or root/'data' in out.parents:
    raise SystemExit('Use a new candidate folder outside the active data directory.')
out.mkdir(parents=True)
subprocess.run([sys.executable,str(root/'tools/capture_wiki.py'),'--directory',str(out/'sources')],check=True)
subprocess.run([sys.executable,str(root/'tools/build_catalogue.py'),'--sources',str(out/'sources'),'--output',str(out/'catalogue.json'),'--version',args.version],check=True)
old=json.loads((root/'data/catalogue.json').read_text(encoding='utf8'))
new=json.loads((out/'catalogue.json').read_text(encoding='utf8'))
changes=[]
for key in ['masters','assignments','variants']:
    before={x['id']:x for x in old[key]};after={x['id']:x for x in new[key]}
    for ident in sorted(before.keys()|after.keys()):
        if before.get(ident)!=after.get(ident):changes.append({'kind':key,'id':ident,'before':before.get(ident),'after':after.get(ident)})
(out/'review-diff.json').write_text(json.dumps(changes,indent=2,ensure_ascii=False),encoding='utf8')
print(f'{len(changes)} changed records. Review review-diff.json, tests and source revisions before explicitly replacing data. Active snapshot is unchanged.')
