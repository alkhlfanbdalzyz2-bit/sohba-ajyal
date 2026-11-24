// لوحة التحكم انتقلت لموقع منفصل
exports.handler = async () => ({ statusCode: 302, headers: { Location: 'https://sohba-admin.netlify.app/', 'Cache-Control': 'no-store' }, body: '' });
