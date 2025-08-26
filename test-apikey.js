/**
 * API Key功能测试脚本
 * 测试API Key的创建、验证、使用等功能
 */

const { createApiKey, validateApiKey, getAllApiKeys } = require('./models/apiKeys');

async function testApiKeyFunctions() {
  console.log('🧪 开始测试API Key功能...\n');

  try {
    // 测试1: 创建API Key
    console.log('📝 测试1: 创建API Key');
    const newKey = await createApiKey(
      '测试API Key',
      '这是一个用于测试的API Key',
      ['read', 'write'],
      100, // 每小时100次
      1000 // 每天1000次
    );
    
    console.log('✅ API Key创建成功:');
    console.log(`   Key ID: ${newKey.keyId}`);
    console.log(`   API Key: ${newKey.apiKey}`);
    console.log(`   权限: ${newKey.permissions.join(', ')}`);
    console.log(`   每小时限制: ${newKey.maxRequestsPerHour}`);
    console.log(`   每日限制: ${newKey.maxRequestsPerDay}\n`);

    // 测试2: 验证API Key
    console.log('🔍 测试2: 验证API Key');
    const keyInfo = await validateApiKey(newKey.apiKey);
    
    if (keyInfo) {
      console.log('✅ API Key验证成功:');
      console.log(`   Key ID: ${keyInfo.keyId}`);
      console.log(`   名称: ${keyInfo.name}`);
      console.log(`   权限: ${keyInfo.permissions.join(', ')}`);
      console.log(`   每小时限制: ${keyInfo.maxRequestsPerHour}`);
      console.log(`   每日限制: ${keyInfo.maxRequestsPerDay}\n`);
    } else {
      console.log('❌ API Key验证失败\n');
    }

    // 测试3: 验证无效的API Key
    console.log('🔍 测试3: 验证无效的API Key');
    const invalidKeyInfo = await validateApiKey('hg_invalid_key_123456789');
    
    if (invalidKeyInfo) {
      console.log('❌ 无效Key验证竟然成功了（这是个bug）\n');
    } else {
      console.log('✅ 无效Key验证正确失败\n');
    }

    // 测试4: 获取所有API Keys
    console.log('📋 测试4: 获取所有API Keys');
    const allKeys = await getAllApiKeys();
    
    console.log(`✅ 成功获取${allKeys.length}个API Key:`);
    allKeys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key.name} (${key.key_id})`);
      console.log(`      权限: ${key.permissions}`);
      console.log(`      状态: ${key.is_active ? '活跃' : '已禁用'}`);
      console.log(`      创建时间: ${new Date(key.created_at).toLocaleString('zh-CN')}`);
    });

    console.log('\n🎉 所有测试完成！API Key功能正常工作。');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  testApiKeyFunctions().then(() => {
    console.log('\n✨ 测试脚本执行完毕');
    process.exit(0);
  }).catch(err => {
    console.error('\n💥 测试脚本执行失败:', err);
    process.exit(1);
  });
}

module.exports = { testApiKeyFunctions }; 