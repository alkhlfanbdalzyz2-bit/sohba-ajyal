# مصدر موقع صحبة أجيال

الموقع المنشور = ملفات جذر المستودع (index.html + assets + media + gal).
هذا المجلد فيه المصدر اللي يُبنى منه index.html:

- src/tpl.html  ← القالب الرئيسي (البيانات + التصميم + الكود)
- src/parts/    ← العارض والمشغل (تُدمج داخل القالب)
- data/         ← بيانات الحلقات والنقاط
- assemble.py + build.py ← البناء

## إعادة البناء
    mkdir work && cp -r _src/* work/ && ln -s "$PWD" work/deploy
    cd work && python3 assemble.py && python3 build.py
ثم ادفع التغييرات إلى main فيُحدِّث نتلفاي تلقائياً.
