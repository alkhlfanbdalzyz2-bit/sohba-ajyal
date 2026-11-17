# usage: python3 add.py <batchdir>  -> converts, appends to seq.txt
import sys,glob,os,subprocess,re
from PIL import Image, ImageOps
B=sys.argv[1]; G='/home/claude/club/deploy/gal'; M='/home/claude/club/deploy/media'; SQ='/home/claude/club/bas/seq.txt'
seq=open(SQ).read().split(',') if os.path.exists(SQ) and open(SQ).read().strip() else []
pn=max(int(re.match(r'p(\d+)\.jpg',f).group(1)) for f in os.listdir(G) if re.match(r'p\d+\.jpg',f))+1
vn=max([int(x[1:]) for x in seq if x[0]=='v']+[0])+1
added=[]
for f in sorted(glob.glob(B+'/*')):
    if f.lower().endswith(('.jpg','.jpeg','.png','.heic')):
        im=ImageOps.exif_transpose(Image.open(f)).convert('RGB')
        a=im.copy(); a.thumbnail((1400,1400),Image.LANCZOS); a.save(f'{G}/p{pn}.jpg',quality=82,optimize=True,progressive=True)
        b=im.copy(); b.thumbnail((640,640),Image.LANCZOS); b.save(f'{G}/t{pn}.webp',quality=75)
        added.append(f'i{pn}'); pn+=1
    else:
        o=f'{M}/bv{vn}.mp4'
        subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',f,'-vf',"scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)'",'-c:v','libx264','-preset','veryfast','-crf','26','-maxrate','1600k','-bufsize','3200k','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',o],check=True)
        # sharpest frame as poster
        import cv2
        cap=cv2.VideoCapture(o); best=None; n=int(cap.get(7)); 
        for k in range(1,9):
            cap.set(1,int(n*k/9)); ok,fr=cap.read()
            if ok:
                s=cv2.Laplacian(cv2.cvtColor(fr,cv2.COLOR_BGR2GRAY),cv2.CV_64F).var()
                if not best or s>best[0]: best=(s,fr)
        h,w=best[1].shape[:2]; sc=360/min(h,w); fr=cv2.resize(best[1],(int(w*sc),int(h*sc)))
        cv2.imwrite(f'{M}/bv{vn}.webp',fr,[cv2.IMWRITE_WEBP_QUALITY,75])
        added.append(f'v{vn}'); vn+=1
seq+=added; open(SQ,'w').write(','.join(seq)); print(','.join(added)); print('total',len(seq))
