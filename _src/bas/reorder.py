import glob,os,re,subprocess,json
from datetime import datetime
import numpy as np
from PIL import Image, ImageOps
A='/mnt/user-data/attachments/6afa5792-2fee-5e66-b772-30d3184072c0'; U='/mnt/user-data/uploads'; M='/home/claude/club/deploy/media'
seq=open('seq.txt').read().split(',')
VL='5085 5232 1803 1805 5373 5531 5596 5627 5760 5766 5780 5783 5860 5861 5862 5863 5879 1976 0414 6164 6167 6170 6171 6174 6176 6179 6181 6185 6188 2131 2132 2133 5102 0480 0481 0482 0483 0496 0498 0523 0532 0533 0534 0535 0536 0537 0538 0539 0541 0542 0543 0544 0562 0564 0565 0566 0567 0569 0570 0571 0587 6596 6689 6704 6714 6760 6762 6765 6771 6773 6776 6779 6781 6782 6783 6803 6826 6834 6979 6992 6995 6996 7158 7324 7376 7391 7392 2408 7410 7411 7412 7413 7414 7415 7416 7418 7420 7421 7544 7546 7598 7665 7668 7669 7676 7678 7680 7681 7683 7686 7687 7688 7689 7692 7693 7697 7699 7701 7702 7707 7719 7720 7723 7724 7725 7726 7727 7728 7730 7736 7745 7748 7751 7755 7756 7757 7758 7761 7768 7769 7772 7776 7777 7795 7796 7800 7808 7813 7885 7886 X7930 7934 7935'.split()
assert len(VL)==sum(1 for x in seq if x[0]=='v'),len(VL)
def probe(f,k='format=duration'):
    return subprocess.run(['ffprobe','-v','error','-show_entries',k,'-of','csv=p=0',f],capture_output=True,text=True).stdout.strip()
# originals movs with duration + date + IMG num
movs={}
for f in glob.glob(A+'/*.mov')+glob.glob(A+'/*.MOV')+glob.glob(U+'/*.mov'):
    m=re.search(r'IMG_(\d+)',f)
    if not m: continue
    d=float(probe(f) or 0); t=probe(f,'format_tags=com.apple.quicktime.creationdate').split(',')[0] or probe(f,'format_tags=creation_time')
    movs.setdefault(m.group(1),(d,t,f))
# batches -> item info
items={}
bi=0
batches=sorted(glob.glob('b*'),key=lambda p:int(p[1:]))
pos=0
for b in batches:
    imgs=sorted(x for x in glob.glob(b+'/*') if x.lower().endswith(('.jpg','.png')))
    # count of items in this batch from seq: walk
    pass
# map images: seq image entries appear in batch order; collect all jpgs in batch order
allimgs=[x for b in batches for x in sorted(y for y in glob.glob(b+'/*') if y.lower().endswith(('.jpg','.png')))]
ii=0
info=[]
IMAP=dict(zip(sorted((x for x in seq if x[0]=='i'),key=lambda x:int(x[1:])),allimgs))
for x in seq:
    if x[0]=='i':
        f=IMAP[x]; ii+=1
        name=os.path.basename(f).split('_',1)[1].rsplit('.',1)[0]
        num=int(name) if name.isdigit() else None
        info.append(dict(id=x,kind='i',num=num,file=f,t=None))
    else:
        vn=int(x[1:]); num=VL[vn-1]
        XMAP={'X7930':A+'/787e1d4f-8d4fcdc3-4038-4b44-9860-de59a360b17f.mov'}
        cands=[XMAP[num]] if num in XMAP else glob.glob(A+f'/*IMG_{num}.mov')+glob.glob(U+f'/IMG_{num}.mov')
        d=float(probe(f'{M}/bv{vn}.mp4'))
        f=min(cands,key=lambda c:abs(float(probe(c))-d)); e=abs(float(probe(f))-d)
        t=probe(f,'format_tags=com.apple.quicktime.creationdate').split(',')[0] or probe(f,'format_tags=creation_time')
        info.append(dict(id=x,kind='v',num=int(num.lstrip('X')),t=t,err=e,file=f))
assert ii==len(allimgs),(ii,len(allimgs))
def ts(s): return datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
for o in info:
    if o['t']: o['T']=ts(o['t'])
bad=[o for o in info if o['kind']=='v' and o['err']>0.3]; print('vid match issues',[(o['id'],o['err']) for o in bad])
# phone families by IMG number: anchors = videos
fam=lambda n: None if n is None else (3 if n==5102 else 0 if 5000<=n<=7999 else 1 if n<1000 else 2)

for o in info:
    if o['kind']=='i' and o['num'] is not None:
        f=fam(o['num']); an=sorted((v['num'],v['T']) for v in info if v['kind']=='v' and fam(v['num'])==f)
        lo=[a for a in an if a[0]<=o['num']]; hi=[a for a in an if a[0]>=o['num']]
        if lo and hi:
            a,b=lo[-1],hi[0]
            o['T']=a[1] if a[0]==b[0] else a[1]+(b[1]-a[1])*(o['num']-a[0])/(b[0]-a[0])
            o['how']='interp'
        elif lo: o['T']=lo[-1][1]+ (o['num']-lo[-1][0])*30; o['how']='after'
        elif hi: o['T']=hi[0][1]- (hi[0][0]-o['num'])*30; o['how']='before'
# undated images (no number or no anchors): visual similarity to dated images
def feat(f):
    im=ImageOps.exif_transpose(Image.open(f)).convert('RGB').resize((32,32))
    a=np.asarray(im,float)/255; h=np.concatenate([np.histogram(a[...,c],16,(0,1))[0] for c in range(3)]).astype(float)
    return h/h.sum()
dated=[o for o in info if o['kind']=='i' and 'T' in o]
F={o['id']:feat(o['file']) for o in info if o['kind']=='i'}
for o in info:
    if 'T' not in o:
        best=min(dated,key=lambda d:np.abs(F[d['id']]-F[o['id']]).sum())
        o['T']=best['T']+1; o['how']='like '+best['id']+' '+os.path.basename(best['file'])
for o in info:
    if o.get('how') and not o['how'].startswith('interp'): print(o['id'],os.path.basename(o['file']),o['how'])
order=sorted(range(len(info)),key=lambda k:(info[k]['T'],k))
new=[info[k]['id'] for k in order]
json.dump([(info[k]['id'],os.path.basename(info[k]['file']),datetime.fromtimestamp(info[k]['T']).strftime('%m-%d %H:%M')) for k in order],open('order_dbg.json','w'),ensure_ascii=False)
open('seq_new.txt','w').write(','.join(new))
print(len(new), len(set(new))==len(seq))
