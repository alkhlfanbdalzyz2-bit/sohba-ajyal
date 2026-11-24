// إرسال إشعارات Web Push بدون مكتبات خارجية (VAPID + aes128gcm)
const crypto = require('crypto');
const https = require('https');
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const ub64 = s => Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'), 'base64');

function newVapid(){
  const k = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pub = k.publicKey.export({ format: 'jwk' }), prv = k.privateKey.export({ format: 'jwk' });
  return { publicKey: b64u(Buffer.concat([Buffer.from([4]), ub64(pub.x), ub64(pub.y)])), jwk: prv };
}
function vapidHeader(endpoint, v, subject){
  const aud = new URL(endpoint).origin;
  const h = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const p = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now()/1000) + 12*3600, sub: subject }));
  const key = crypto.createPrivateKey({ key: v.jwk, format: 'jwk' });
  const sig = crypto.sign('sha256', Buffer.from(h + '.' + p), { key, dsaEncoding: 'ieee-p1363' });
  return 'vapid t=' + h + '.' + p + '.' + b64u(sig) + ', k=' + v.publicKey;
}
function hkdf(salt, ikm, info, len){ return Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, len)); }
function encrypt(sub, payload){
  const uaPub = ub64(sub.keys.p256dh), auth = ub64(sub.keys.auth);
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const asPub = ecdh.getPublicKey(), secret = ecdh.computeSecret(uaPub);
  const ikm = hkdf(auth, secret, Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub]), 32);
  const salt = crypto.randomBytes(16);
  const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const head = Buffer.alloc(21); salt.copy(head, 0); head.writeUInt32BE(4096, 16); head.writeUInt8(65, 20);
  return Buffer.concat([head, asPub, body]);
}
function send(sub, payload, v, subject){
  const body = encrypt(sub, payload), u = new URL(sub.endpoint);
  const mod = u.protocol === 'http:' ? require('http') : https;
  return new Promise(res => {
    const r = mod.request(u, { method: 'POST', headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', 'Content-Length': body.length, TTL: '86400', Urgency: 'normal', Authorization: vapidHeader(sub.endpoint, v, subject) } },
      x => { x.resume(); x.on('end', () => res(x.statusCode)); });
    r.on('error', () => res(0)); r.setTimeout(15000, () => { r.destroy(); res(0); }); r.end(body);
  });
}
module.exports = { newVapid, send, encrypt, vapidHeader, b64u, ub64 };
