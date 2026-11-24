// إعدادات الموقع اللي يتحكم فيها بو عمر من لوحة التحكم بدون نشر
const { getStore, connectLambda } = require('@netlify/blobs');
exports.handler = async (event) => {
  try { connectLambda(event); } catch(_){}
  const c = (await getStore('push').get('site-cfg', { type: 'json' })) || {};
  return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }, body: JSON.stringify(c) };
};
