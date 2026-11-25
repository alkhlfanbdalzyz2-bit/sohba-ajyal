// مفاتيح التذكيرات + القيمة الفعلية: اللي ما اختار بنفسه (ما عنده v:2) = كل التذكيرات مفعّلة تلقائياً
const KEYS = ['fajr', 'duha', 'sabah', 'masa', 'kahf', 'istijaba', 'siyam', 'nawm', 'witr'];
const eff = (x) => { const o = {}; KEYS.forEach(k => { if (!x || x.v !== 2 || x[k]) o[k] = 1; }); return o; };
module.exports = { KEYS, eff };
