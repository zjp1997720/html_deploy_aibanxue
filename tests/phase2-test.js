/**
 * Phase 2 功能测试脚本
 * 测试页面管理、API Key管理和统计监控功能
 */

const fetch = require('node-fetch');

// 测试配置
const config = {
  baseUrl: 'http://localhost:5678',
  testApiKey: null, // 将在测试中生成
  adminSession: null
};

class Phase2Tester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      details: []
    };
  }

  async test(name, testFn) {
    try {
      console.log(`🧪 测试: ${name}`);
      await testFn();
      this.testResults.passed++;
      this.testResults.details.push({ name, status: 'PASS' });
      console.log(`✅ ${name} - 通过`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({ name, status: 'FAIL', error: error.message });
      console.log(`❌ ${name} - 失败: ${error.message}`);
    }
  }

  async makeRequest(path, options = {}) {
    const url = `${config.baseUrl}${path}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { status: response.status, data };
  }

  async login() {
    console.log('🔑 管理员登录...');
    const response = await this.makeRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'admin123' }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (response.status !== 200) {
      throw new Error('管理员登录失败');
    }
    console.log('✅ 管理员登录成功');
  }

  async runTests() {
    console.log('🚀 开始Phase 2功能测试');
    console.log('=====================================');

    try {
      // 1. 健康检查
      await this.test('健康检查API', async () => {
        const { status, data } = await this.makeRequest('/api/v2/health');
        if (status !== 200 || !data.success) {
          throw new Error('健康检查失败');
        }
        if (data.data.status !== 'ok') {
          throw new Error('系统状态异常');
        }
      });

      // 2. 创建测试API Key
      await this.test('创建测试API Key', async () => {
        // 先登录管理员
        await this.login();
        
        const { status, data } = await this.makeRequest('/api/admin/apikeys', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Phase2测试Key',
            description: '用于Phase 2功能测试',
            permissions: ['read', 'write'],
            maxRequestsPerHour: 1000,
            maxRequestsPerDay: 10000
          })
        });
        
        if (status !== 200 || !data.success) {
          throw new Error(`创建API Key失败: ${data.error}`);
        }
        
        config.testApiKey = data.apiKey;
        console.log(`📝 测试API Key: ${config.testApiKey.substring(0, 20)}...`);
      });

      // 3. 测试新版API创建页面
      await this.test('新版API创建页面', async () => {
        const { status, data } = await this.makeRequest('/api/v2/pages/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.testApiKey}`
          },
          body: JSON.stringify({
            htmlContent: '<h1>Phase 2 测试页面</h1><p>这是一个测试页面</p>',
            name: 'Phase2测试页面',
            codeType: 'html',
            isProtected: false
          })
        });
        
        if (status !== 200 || !data.success) {
          throw new Error(`创建页面失败: ${data.error}`);
        }
        
        if (!data.data.id || !data.data.url) {
          throw new Error('返回数据格式不正确');
        }
        
        config.testPageId = data.data.id;
        console.log(`📄 测试页面ID: ${config.testPageId}`);
      });

      // 4. 测试新版API获取页面信息
      await this.test('新版API获取页面信息', async () => {
        const { status, data } = await this.makeRequest(`/api/v2/pages/${config.testPageId}`, {
          headers: {
            'Authorization': `Bearer ${config.testApiKey}`
          }
        });
        
        if (status !== 200 || !data.success) {
          throw new Error(`获取页面信息失败: ${data.error}`);
        }
        
        if (data.data.name !== 'Phase2测试页面') {
          throw new Error('页面信息不匹配');
        }
      });

      // 5. 测试新版API页面列表
      await this.test('新版API页面列表', async () => {
        const { status, data } = await this.makeRequest('/api/v2/pages?limit=5', {
          headers: {
            'Authorization': `Bearer ${config.testApiKey}`
          }
        });
        
        if (status !== 200 || !data.success) {
          throw new Error(`获取页面列表失败: ${data.error}`);
        }
        
        if (!Array.isArray(data.data.pages)) {
          throw new Error('页面列表格式不正确');
        }
      });

      // 6. 测试权限检查
      await this.test('API权限检查', async () => {
        // 创建一个只有读权限的API Key
        const { status: createStatus, data: createData } = await this.makeRequest('/api/admin/apikeys', {
          method: 'POST',
          body: JSON.stringify({
            name: '只读测试Key',
            permissions: ['read'],
            maxRequestsPerHour: 100,
            maxRequestsPerDay: 1000
          })
        });
        
        if (createStatus !== 200 || !createData.success) {
          throw new Error('创建只读API Key失败');
        }
        
        const readOnlyKey = createData.apiKey;
        
        // 尝试用只读Key创建页面（应该失败）
        const { status, data } = await this.makeRequest('/api/v2/pages/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${readOnlyKey}`
          },
          body: JSON.stringify({
            htmlContent: '<h1>测试</h1>',
            name: '测试页面'
          })
        });
        
        if (status !== 403) {
          throw new Error('权限检查失败，应该返回403');
        }
        
        if (data.code !== 'INSUFFICIENT_PERMISSIONS') {
          throw new Error('错误代码不正确');
        }
      });

      // 7. 测试使用限制
      await this.test('API使用限制', async () => {
        // 创建一个使用限制很低的API Key
        const { status: createStatus, data: createData } = await this.makeRequest('/api/admin/apikeys', {
          method: 'POST',
          body: JSON.stringify({
            name: '限制测试Key',
            permissions: ['read'],
            maxRequestsPerHour: 2,
            maxRequestsPerDay: 5
          })
        });
        
        if (createStatus !== 200 || !createData.success) {
          throw new Error('创建限制API Key失败');
        }
        
        const limitedKey = createData.apiKey;
        
        // 连续调用3次，第3次应该被限制
        for (let i = 0; i < 3; i++) {
          const { status } = await this.makeRequest('/api/v2/pages', {
            headers: {
              'Authorization': `Bearer ${limitedKey}`
            }
          });
          
          if (i < 2 && status !== 200) {
            throw new Error(`第${i+1}次调用失败`);
          }
          
          if (i === 2 && status !== 429) {
            throw new Error('使用限制检查失败，应该返回429');
          }
        }
      });

      // 8. 测试管理后台页面管理API
      await this.test('管理后台页面列表API', async () => {
        const { status, data } = await this.makeRequest('/api/admin/pages?limit=10');
        
        if (status !== 200 || !data.success) {
          throw new Error(`获取管理后台页面列表失败: ${data.error}`);
        }
        
        if (!data.pages || !data.pagination) {
          throw new Error('返回数据格式不正确');
        }
      });

      // 9. 测试页面统计API
      await this.test('页面统计API', async () => {
        const { status, data } = await this.makeRequest('/api/admin/pages/stats');
        
        if (status !== 200 || !data.success) {
          throw new Error(`获取页面统计失败: ${data.error}`);
        }
        
        if (typeof data.stats.total !== 'number') {
          throw new Error('统计数据格式不正确');
        }
      });

      // 10. 测试API Key统计
      await this.test('API Key使用统计', async () => {
        // 先获取测试Key的ID
        const { status: listStatus, data: listData } = await this.makeRequest('/api/admin/apikeys');
        
        if (listStatus !== 200 || !listData.success) {
          throw new Error('获取API Key列表失败');
        }
        
        const testKey = listData.keys.find(k => k.name === 'Phase2测试Key');
        if (!testKey) {
          throw new Error('找不到测试API Key');
        }
        
        const { status, data } = await this.makeRequest(`/api/admin/apikeys/${testKey.key_id}/stats`);
        
        if (status !== 200 || !data.success) {
          throw new Error('获取API Key统计失败');
        }
        
        if (typeof data.stats.totalCalls !== 'number') {
          throw new Error('统计数据格式不正确');
        }
      });

      // 11. 测试系统总体统计
      await this.test('系统总体统计API', async () => {
        const { status, data } = await this.makeRequest('/api/v2/stats/system', {
          headers: {
            'Authorization': `Bearer ${config.testApiKey}`
          }
        });
        
        if (status !== 200 || !data.success) {
          throw new Error(`获取系统统计失败: ${data.error}`);
        }
        
        if (!data.data.pages || !data.data.system) {
          throw new Error('系统统计数据格式不正确');
        }
      });

      // 12. 测试页面搜索功能
      await this.test('页面搜索功能', async () => {
        const { status, data } = await this.makeRequest('/api/admin/pages?search=Phase2&limit=5');
        
        if (status !== 200 || !data.success) {
          throw new Error('页面搜索失败');
        }
        
        // 应该能找到我们创建的测试页面
        const foundPage = data.pages.find(p => p.name === 'Phase2测试页面');
        if (!foundPage) {
          throw new Error('搜索结果不正确');
        }
      });

      // 13. 测试页面筛选功能
      await this.test('页面筛选功能', async () => {
        const { status, data } = await this.makeRequest('/api/admin/pages?codeType=html&isProtected=false');
        
        if (status !== 200 || !data.success) {
          throw new Error('页面筛选失败');
        }
        
        // 检查筛选结果
        if (data.pages.length > 0) {
          const page = data.pages[0];
          if (page.code_type !== 'html') {
            throw new Error('筛选结果不正确');
          }
        }
      });

      // 14. 测试清理：删除测试页面
      await this.test('删除测试页面', async () => {
        const { status, data } = await this.makeRequest(`/api/admin/pages/${config.testPageId}`, {
          method: 'DELETE'
        });
        
        if (status !== 200 || !data.success) {
          throw new Error('删除测试页面失败');
        }
      });

    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error.message);
    }

    // 输出测试结果
    console.log('\n=====================================');
    console.log('📊 测试结果汇总');
    console.log(`✅ 通过: ${this.testResults.passed}`);
    console.log(`❌ 失败: ${this.testResults.failed}`);
    console.log(`📈 成功率: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n失败的测试:');
      this.testResults.details
        .filter(t => t.status === 'FAIL')
        .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    }
    
    console.log('\n🎉 Phase 2功能测试完成!');
    
    return this.testResults.failed === 0;
  }
}

// 运行测试
if (require.main === module) {
  const tester = new Phase2Tester();
  tester.runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = Phase2Tester; 