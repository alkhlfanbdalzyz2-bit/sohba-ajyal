import json,re
p=json.load(open('src/parts/parts.json'))
p['INSTCSS']=p['INSTCSS'].split('/* ================= الهوية')[0]
t=open('src/tpl.html').read()
for k,v in p.items(): t=t.replace('%%'+k+'%%',v)
import os
t=t.replace('%%BASSEQ%%',open('bas/seq.txt').read().strip() if os.path.exists('bas/seq.txt') else '')
left=re.findall(r'%%\w+%%',t); assert not left,left
open('src/index.html','w').write(t)
