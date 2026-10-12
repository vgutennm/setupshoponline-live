from pathlib import Path
import json
from fontTools.ttLib import TTFont
from fontTools import subset
out=Path('cpanel/server/fonts');out.mkdir(exist_ok=True)
meta={}
for kind in ['regular','bold']:
 f=TTFont('worker/assets/report-'+kind+'.ttf');chars=[]
 for i in range(32,256):
  try:chars.append(ord(bytes([i]).decode('cp1252')))
  except UnicodeDecodeError:pass
 s=subset.Subsetter();s.populate(unicodes=chars);s.subset(f);f.save(out/(kind+'.ttf'))
 scale=1000/f['head'].unitsPerEm;cmap=f.getBestCmap();widths=[]
 for i in range(32,256):
  try:name=cmap.get(ord(bytes([i]).decode('cp1252')),'.notdef')
  except UnicodeDecodeError:name='.notdef'
  widths.append(round(f['hmtx'][name][0]*scale))
 meta[kind]={'name':f['name'].getDebugName(6),'widths':widths,'bbox':[round(getattr(f['head'],k)*scale) for k in ['xMin','yMin','xMax','yMax']],'ascent':round(f['hhea'].ascent*scale),'descent':round(f['hhea'].descent*scale)}
(out/'metrics.json').write_text(json.dumps(meta))
