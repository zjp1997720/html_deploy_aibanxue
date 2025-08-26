/**
 * Phase 3: 性能优化功能综合测试
 * 测试数据库优化、性能监控、内存管理、缓存系统等功能
 */

const { performance } = require('perf_hooks');

class Phase3PerformanceTests {
  constructor() {
    this.testResults = [];
    this.testStartTime = Date.now();
    this.config = {
      baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5678',
      timeout: 30000
    };
    
    console.log('🚀 Phase 3 性能优化测试开始');
    console.log(`测试目标: ${this.config.baseUrl}`);
  }

  /**
   * HTTP请求工具
   */
  async makeRequest(path, options = {}) {
    const url = `${this.config.baseUrl}${path}`;
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        ...options
      });
      
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      let data = null;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      return {
        status: response.status,
        ok: response.ok,
        data,
        responseTime: Math.round(responseTime),
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        status: 0,
        ok: false,
        error: error.message,
        responseTime: Math.round(endTime - startTime)
      };
    }
  }

  /**
   * 登录获取管理员权限
   */
  async login() {
    const loginData = {
      password: process.env.AUTH_PASSWORD || 'change_me_strong_password'
    };

    const response = await this.makeRequest('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(loginData)
    });

    if (response.status === 302 || response.ok) {
      console.log('✅ 管理员登录成功');
      return true;
    } else {
      console.error('❌ 管理员登录失败:', response.error || response.status);
      return false;
    }
  }

  /**
   * 测试公开API性能状态
   */
  async testPublicPerformanceAPI() {
    console.log('\n📊 测试公开性能API...');
    
    const tests = [
      {
        name: '性能状态API',
        path: '/api/v2/performance/status'
      },
      {
        name: '内存状态API',
        path: '/api/v2/memory/status'
      },
      {
        name: '健康检查API',
        path: '/api/v2/health'
      }
    ];

    for (const test of tests) {
      const result = await this.makeRequest(test.path);
      
      this.testResults.push({
        category: 'Public API',
        name: test.name,
        path: test.path,
        status: result.ok ? 'PASS' : 'FAIL',
        responseTime: result.responseTime,
        details: result.ok ? 'API正常响应' : result.error || `状态码: ${result.status}`
      });

      if (result.ok) {
        console.log(`  ✅ ${test.name}: ${result.responseTime}ms`);
        
        // 验证响应数据结构
        if (result.data && result.data.success) {
          console.log(`     数据结构正确, 包含: ${Object.keys(result.data.data).join(', ')}`);
        }
      } else {
        console.log(`  ❌ ${test.name}: ${result.error || result.status}`);
      }
    }
  }

  /**
   * 测试管理员性能API
   */
  async testAdminPerformanceAPI() {
    console.log('\n🔐 测试管理员性能API...');
    
    const tests = [
      {
        name: '性能统计API',
        path: '/api/admin/performance/stats'
      },
      {
        name: '性能报告API',
        path: '/api/admin/performance/report?hours=1'
      },
      {
        name: '内存状态API',
        path: '/api/admin/memory/status'
      },
      {
        name: '内存报告API',
        path: '/api/admin/memory/report'
      },
      {
        name: '内存泄漏检测API',
        path: '/api/admin/memory/leak-detection'
      }
    ];

    for (const test of tests) {
      const result = await this.makeRequest(test.path);
      
      this.testResults.push({
        category: 'Admin Performance API',
        name: test.name,
        path: test.path,
        status: result.ok ? 'PASS' : 'FAIL',
        responseTime: result.responseTime,
        details: result.ok ? 'API正常响应' : result.error || `状态码: ${result.status}`
      });

      if (result.ok) {
        console.log(`  ✅ ${test.name}: ${result.responseTime}ms`);
      } else {
        console.log(`  ❌ ${test.name}: ${result.error || result.status}`);
      }
    }
  }

  /**
   * 测试缓存管理API
   */
  async testCacheManagementAPI() {
    console.log('\n💾 测试缓存管理API...');
    
    const tests = [
      {
        name: '缓存统计API',
        path: '/api/admin/cache/stats'
      },
      {
        name: '缓存报告API',
        path: '/api/admin/cache/report'
      }
    ];

    for (const test of tests) {
      const result = await this.makeRequest(test.path);
      
      this.testResults.push({
        category: 'Cache Management API',
        name: test.name,
        path: test.path,
        status: result.ok ? 'PASS' : 'FAIL',
        responseTime: result.responseTime,
        details: result.ok ? 'API正常响应' : result.error || `状态码: ${result.status}`
      });

      if (result.ok) {
        console.log(`  ✅ ${test.name}: ${result.responseTime}ms`);
        
        if (result.data && result.data.data) {
          const cacheData = result.data.data;
          if (cacheData.hitRate !== undefined) {
            console.log(`     缓存命中率: ${cacheData.hitRate}%`);
          }
          if (cacheData.items !== undefined) {
            console.log(`     缓存项数量: ${cacheData.items}`);
          }
        }
      } else {
        console.log(`  ❌ ${test.name}: ${result.error || result.status}`);
      }
    }

    // 测试缓存预热
    console.log('\n  🔥 测试缓存预热...');
    const warmupResult = await this.makeRequest('/api/admin/cache/warmup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    this.testResults.push({
      category: 'Cache Management',
      name: '缓存预热功能',
      path: '/api/admin/cache/warmup',
      status: warmupResult.ok ? 'PASS' : 'FAIL',
      responseTime: warmupResult.responseTime,
      details: warmupResult.ok ? '缓存预热成功' : warmupResult.error || `状态码: ${warmupResult.status}`
    });

    if (warmupResult.ok) {
      console.log(`  ✅ 缓存预热: ${warmupResult.responseTime}ms`);
    } else {
      console.log(`  ❌ 缓存预热失败: ${warmupResult.error || warmupResult.status}`);
    }
  }

  /**
   * 测试内存管理功能
   */
  async testMemoryManagement() {
    console.log('\n🧠 测试内存管理功能...');

    // 测试强制垃圾回收
    const gcResult = await this.makeRequest('/api/admin/memory/gc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    this.testResults.push({
      category: 'Memory Management',
      name: '强制垃圾回收',
      path: '/api/admin/memory/gc',
      status: gcResult.ok ? 'PASS' : 'FAIL',
      responseTime: gcResult.responseTime,
      details: gcResult.ok ? '垃圾回收执行成功' : gcResult.error || `状态码: ${gcResult.status}`
    });

    if (gcResult.ok) {
      console.log(`  ✅ 强制垃圾回收: ${gcResult.responseTime}ms`);
      
      if (gcResult.data && gcResult.data.data) {
        const gcData = gcResult.data.data;
        if (gcData.success) {
          console.log(`     释放内存: ${gcData.freed ? gcData.freed.toFixed(2) : 'N/A'}MB`);
          console.log(`     回收耗时: ${gcData.gcTime ? gcData.gcTime.toFixed(2) : 'N/A'}ms`);
        } else {
          console.log(`     回收状态: ${gcData.error || '垃圾回收不可用'}`);
        }
      }
    } else {
      console.log(`  ❌ 强制垃圾回收失败: ${gcResult.error || gcResult.status}`);
    }
  }

  /**
   * 性能基准测试
   */
  async performanceBenchmark() {
    console.log('\n⚡ 执行性能基准测试...');
    
    const testEndpoints = [
      '/api/v2/health',
      '/api/v2/performance/status',
      '/api/v2/memory/status'
    ];

    const concurrentRequests = 10;
    const testRounds = 3;
    
    for (const endpoint of testEndpoints) {
      console.log(`\n  📈 测试端点: ${endpoint}`);
      
      const allResults = [];
      
      for (let round = 0; round < testRounds; round++) {
        const promises = [];
        
        for (let i = 0; i < concurrentRequests; i++) {
          promises.push(this.makeRequest(endpoint));
        }
        
        const results = await Promise.all(promises);
        allResults.push(...results);
        
        const successCount = results.filter(r => r.ok).length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
        
        console.log(`    第${round + 1}轮: ${successCount}/${concurrentRequests} 成功, 平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
      }
      
      // 计算总体统计
      const totalRequests = allResults.length;
      const successfulRequests = allResults.filter(r => r.ok).length;
      const successRate = (successfulRequests / totalRequests) * 100;
      const avgResponseTime = allResults.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests;
      const minResponseTime = Math.min(...allResults.map(r => r.responseTime));
      const maxResponseTime = Math.max(...allResults.map(r => r.responseTime));
      
      this.testResults.push({
        category: 'Performance Benchmark',
        name: `并发测试 ${endpoint}`,
        path: endpoint,
        status: successRate > 95 ? 'PASS' : (successRate > 80 ? 'WARNING' : 'FAIL'),
        responseTime: Math.round(avgResponseTime),
        details: `成功率: ${successRate.toFixed(1)}%, 响应时间: ${minResponseTime}-${maxResponseTime}ms`
      });
      
      console.log(`    总结: 成功率 ${successRate.toFixed(1)}%, 平均响应时间 ${avgResponseTime.toFixed(2)}ms`);
      console.log(`    响应时间范围: ${minResponseTime}ms - ${maxResponseTime}ms`);
    }
  }

  /**
   * 生成测试报告
   */
  generateReport() {
    console.log('\n📋 生成测试报告...');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'PASS').length;
    const failedTests = this.testResults.filter(t => t.status === 'FAIL').length;
    const warningTests = this.testResults.filter(t => t.status === 'WARNING').length;
    
    const avgResponseTime = this.testResults.reduce((sum, t) => sum + (t.responseTime || 0), 0) / totalTests;
    const testDuration = Date.now() - this.testStartTime;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 Phase 3 性能优化测试报告');
    console.log('='.repeat(80));
    console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`测试目标: ${this.config.baseUrl}`);
    console.log(`测试用时: ${(testDuration / 1000).toFixed(2)}秒`);
    console.log('');
    console.log('📈 测试统计:');
    console.log(`  总测试数: ${totalTests}`);
    console.log(`  通过测试: ${passedTests} ✅`);
    console.log(`  失败测试: ${failedTests} ❌`);
    console.log(`  警告测试: ${warningTests} ⚠️`);
    console.log(`  成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`  平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
    console.log('');

    // 按类别分组显示结果
    const categories = [...new Set(this.testResults.map(t => t.category))];
    
    categories.forEach(category => {
      const categoryTests = this.testResults.filter(t => t.category === category);
      const categoryPassed = categoryTests.filter(t => t.status === 'PASS').length;
      
      console.log(`📂 ${category} (${categoryPassed}/${categoryTests.length})`);
      categoryTests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : test.status === 'WARNING' ? '⚠️' : '❌';
        const responseTime = test.responseTime ? ` (${test.responseTime}ms)` : '';
        console.log(`  ${icon} ${test.name}${responseTime}`);
        if (test.status !== 'PASS' && test.details) {
          console.log(`     ${test.details}`);
        }
      });
      console.log('');
    });

    // 性能建议
    console.log('💡 性能优化建议:');
    
    if (avgResponseTime > 1000) {
      console.log('  ⚠️  平均响应时间较高，建议检查数据库和缓存配置');
    } else if (avgResponseTime < 200) {
      console.log('  ✅ 响应时间表现优秀');
    } else {
      console.log('  ✅ 响应时间表现良好');
    }
    
    if (failedTests > 0) {
      console.log('  ❌ 存在失败的测试，请检查服务器状态和配置');
    }
    
    if (passedTests === totalTests) {
      console.log('  🎉 所有测试通过，Phase 3性能优化功能完全正常！');
    }
    
    console.log('='.repeat(80));

    return {
      totalTests,
      passedTests,
      failedTests,
      warningTests,
      successRate: (passedTests / totalTests) * 100,
      avgResponseTime,
      testDuration,
      allTestsPassed: passedTests === totalTests
    };
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    try {
      // 登录管理员
      const loginSuccess = await this.login();
      
      // 公开API测试
      await this.testPublicPerformanceAPI();
      
      // 管理员API测试（需要登录）
      if (loginSuccess) {
        await this.testAdminPerformanceAPI();
        await this.testCacheManagementAPI();
        await this.testMemoryManagement();
      } else {
        console.log('⚠️  跳过需要管理员权限的测试');
      }
      
      // 性能基准测试
      await this.performanceBenchmark();
      
      // 生成报告
      const report = this.generateReport();
      
      return report;
      
    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error);
      return { error: error.message };
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const tester = new Phase3PerformanceTests();
  
  tester.runAllTests()
    .then(report => {
      if (report.allTestsPassed) {
        console.log('🎉 Phase 3 所有测试通过！');
        process.exit(0);
      } else {
        console.log('❌ Phase 3 测试存在失败项');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ 测试运行失败:', error);
      process.exit(1);
    });
}

module.exports = Phase3PerformanceTests; 