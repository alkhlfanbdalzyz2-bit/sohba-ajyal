const { getStore, connectLambda } = require('@netlify/blobs');
const { newVapid } = require('./push');
function store(event){ if (event) { try { connectLambda(event); } catch(_){} } return getStore('push'); }
async function vapid(s){
  let v = await s.get('vapid', { type: 'json' });
  if (!v){ v = newVapid(); await s.setJSON('vapid', v); }
  return v;
}
const keyOf = ep => require('crypto').createHash('sha256').update(ep).digest('hex').slice(0, 40);
module.exports = { store, vapid, keyOf };
