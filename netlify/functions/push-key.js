const { store, vapid } = require('../lib/store');
exports.handler = async (event) => {
  const v = await vapid(store(event));
  return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ key: v.publicKey }) };
};
