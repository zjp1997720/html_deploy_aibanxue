const request = require('supertest');
const app = require('../../app');

describe('API Health Check', () => {
  test('GET /version should return version info', async () => {
    const response = await request(app)
      .get('/version')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.commit).toBeDefined();
    expect(response.body.data.buildTime).toBeDefined();
  });

  test('GET / should return HTML', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.headers['content-type']).toContain('text/html');
  });

  test('POST /api/pages should respect rate limit', async () => {
    // 快速发送多个请求
    const requests = Array(25).fill().map(() => 
      request(app)
        .post('/api/pages')
        .send({ html_content: '<h1>Test</h1>' })
    );
    
    const responses = await Promise.all(requests);
    
    // 应该有一些请求被限流
    const rateLimited = responses.some(res => res.status === 429);
    expect(rateLimited).toBe(true);
  });
});

describe('Authentication', () => {
  test('should require authentication for protected routes', async () => {
    const response = await request(app)
      .get('/admin')
      .expect(302); // 应该重定向到登录页面
  });
});