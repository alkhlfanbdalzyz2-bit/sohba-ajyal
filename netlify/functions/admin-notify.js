// انتقلت للوحة التحكم الموحدة
exports.handler = async (event) => {
  const k = encodeURIComponent((event.queryStringParameters || {}).k || '');
  return { statusCode: 302, headers: { Location: '/.netlify/functions/admin?k=' + k, 'Cache-Control': 'no-store' }, body: '' };
};
