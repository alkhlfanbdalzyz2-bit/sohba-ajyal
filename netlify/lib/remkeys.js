// مفاتيح التذكيرات + القيمة الفعلية: اللي ما اختار بنفسه (ما عنده v:2) = كل التذكيرات مفعّلة تلقائياً
// وأي تذكير جديد ينضاف بعد ما الشخص حفظ اختياره يكون مفعّل له تلقائياً (k = المفاتيح اللي كانت موجودة وقت الحفظ)
const KEYS = ['fajr', 'duha', 'sabah', 'masa', 'kahf', 'istijaba', 'siyam', 'nawm', 'witr', 'salawat', 'zad'];
const OLD = ['fajr', 'duha', 'sabah', 'masa', 'kahf', 'istijaba', 'siyam', 'nawm', 'witr'];
const on = (x, k) => !x || x.v !== 2 || !!x[k] || (x.k || OLD).indexOf(k) < 0;
const eff = (x) => { const o = {}; KEYS.forEach(k => { if (on(x, k)) o[k] = 1; }); return o; };
module.exports = { KEYS, eff, on };
