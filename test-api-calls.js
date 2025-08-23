/**
 * API调用测试脚本
 * 测试使用API Key调用实际API的功能
 */

const fetch = require('node-fetch');
const { getAllApiKeys } = require('./models/apiKeys');

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5678', // 开发服务器地址
  testContent: {
    htmlContent: '<h1>API Key测试页面</h1><p>这是通过API Key创建的测试页面。</p>',
    name: 'API Key测试页面',
    codeType: 'html',
    isProtected: false
  }
};

async function testApiCalls() {
  console.log('🚀 开始测试API调用功能...\n');

  try {
    // 获取可用的API Key
    console.log('🔑 获取可用的API Key...');
    const allKeys = await getAllApiKeys();
    const activeKeys = allKeys.filter(key => key.is_active === 1);
    
    if (activeKeys.length === 0) {
      console.log('❌ 没有可用的API Key进行测试');
      return;
    }
    
    const testKey = activeKeys[0];
    console.log(`✅ 使用API Key: ${testKey.name} (${testKey.key_id})\n`);

    // 模拟获取完整的API Key (在实际场景中，我们从数据库获取hash对比)
    // 这里我们使用演示API Key
    const demoApiKey = 'hg_646ef92d55935796a2a084dcf2bf0b458715f22cbb5acc5738464eb7f188a7eb';

    // 测试1: 使用API Key创建页面
    console.log('📝 测试1: 使用API Key创建页面');
    const createResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/pages/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${demoApiKey}`
      },
      body: JSON.stringify(TEST_CONFIG.testContent)
    });

    if (createResponse.ok) {
      const createResult = await createResponse.json();
      console.log('✅ 页面创建成功:');
      console.log(`   URL: ${createResult.url}`);
      console.log(`   密码: ${createResult.password}`);
      console.log(`   保护状态: ${createResult.isProtected ? '已保护' : '公开'}\n`);

      // 提取页面ID用于后续测试
      const pageId = createResult.url.split('/').pop();

      // 测试2: 获取页面信息
      console.log('📋 测试2: 获取页面信息');
      const getResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/pages/${pageId}`, {
        headers: {
          'Authorization': `Bearer ${demoApiKey}`
        }
      });

      if (getResponse.ok) {
        const getResult = await getResponse.json();
        console.log('✅ 页面信息获取成功:');
        console.log(`   页面ID: ${getResult.page.id}`);
        console.log(`   创建时间: ${new Date(getResult.page.createdAt).toLocaleString('zh-CN')}\n`);
      } else {
        console.log('❌ 页面信息获取失败:', await getResponse.text());
      }

      // 测试3: 获取最近页面列表
      console.log('📋 测试3: 获取最近页面列表');
      const listResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/pages/list/recent?limit=5`, {
        headers: {
          'Authorization': `Bearer ${demoApiKey}`
        }
      });

      if (listResponse.ok) {
        const listResult = await listResponse.json();
        console.log('✅ 页面列表获取成功:');
        console.log(`   获取到${listResult.pages.length}个页面`);
        listResult.pages.forEach((page, index) => {
          console.log(`   ${index + 1}. ${page.id} (${new Date(page.created_at).toLocaleString('zh-CN')})`);
        });
        console.log('');
      } else {
        console.log('❌ 页面列表获取失败:', await listResponse.text());
      }

    } else {
      const errorText = await createResponse.text();
      console.log('❌ 页面创建失败:', errorText);
    }

    // 测试4: 测试无效API Key
    console.log('🚫 测试4: 测试无效API Key');
    const invalidResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/pages/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer hg_invalid_key_123456789'
      },
      body: JSON.stringify(TEST_CONFIG.testContent)
    });

    if (invalidResponse.status === 401) {
      console.log('✅ 无效API Key正确被拒绝 (401 Unauthorized)\n');
    } else {
      console.log('❌ 无效API Key竟然被接受了，这是个安全问题\n');
    }

    // 测试5: 测试缺少Authorization header
    console.log('🚫 测试5: 测试缺少Authorization header');
    const noAuthResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/pages/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_CONFIG.testContent)
    });

    if (noAuthResponse.status === 401) {
      console.log('✅ 缺少Authorization header正确被拒绝 (401 Unauthorized)\n');
    } else {
      console.log('❌ 缺少Authorization header竟然被接受了\n');
    }

    console.log('🎉 所有API调用测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  testApiCalls().then(() => {
    console.log('\n✨ API调用测试脚本执行完毕');
    process.exit(0);
  }).catch(err => {
    console.error('\n💥 API调用测试脚本执行失败:', err);
    process.exit(1);
  });
}

module.exports = { testApiCalls }; 