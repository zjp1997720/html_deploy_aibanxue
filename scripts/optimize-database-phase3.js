const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, '../db/html-go.db');

console.log('=== Phase 3: 数据库性能优化 ===');
console.log('开始优化数据库性能...\n');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 连接数据库失败:', err.message);
    process.exit(1);
  }
  console.log('✅ 数据库连接成功');
});

// 性能优化配置
const optimizations = [
  {
    name: 'pages表性能索引',
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_pages_created_at ON pages(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_pages_is_protected ON pages(is_protected)',
      'CREATE INDEX IF NOT EXISTS idx_pages_code_type ON pages(code_type)',
      'CREATE INDEX IF NOT EXISTS idx_pages_created_protected ON pages(created_at DESC, is_protected)',
      'CREATE INDEX IF NOT EXISTS idx_pages_name_search ON pages(name) WHERE name IS NOT NULL'
    ]
  },
  {
    name: 'API Keys表性能索引',
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_api_keys_active_created ON api_keys(is_active, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at DESC) WHERE last_used_at IS NOT NULL'
    ]
  },
  {
    name: 'API使用日志表性能索引',
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_api_logs_key_created ON api_usage_logs(key_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint_method ON api_usage_logs(endpoint, method)',
      'CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_usage_logs(status_code)',
      'CREATE INDEX IF NOT EXISTS idx_api_logs_response_time ON api_usage_logs(response_time)',
      'CREATE INDEX IF NOT EXISTS idx_api_logs_created_status ON api_usage_logs(created_at DESC, status_code)'
    ]
  }
];

// 数据库配置优化
const dbConfigurations = [
  'PRAGMA journal_mode = WAL',           // 启用WAL模式提高并发性能
  'PRAGMA synchronous = NORMAL',         // 平衡安全性和性能
  'PRAGMA cache_size = -64000',          // 设置缓存大小为64MB
  'PRAGMA temp_store = MEMORY',          // 临时文件存储在内存中
  'PRAGMA mmap_size = 268435456',        // 设置内存映射大小为256MB
  'PRAGMA optimize'                       // 执行自动优化
];

async function executeOptimizations() {
  try {
    console.log('🔧 开始执行数据库优化...\n');

    // 1. 配置数据库参数
    console.log('📝 配置数据库参数:');
    for (const config of dbConfigurations) {
      await new Promise((resolve, reject) => {
        db.run(config, (err) => {
          if (err) {
            console.log(`  ❌ ${config}: ${err.message}`);
            reject(err);
          } else {
            console.log(`  ✅ ${config}`);
            resolve();
          }
        });
      });
    }

    console.log('\n🔍 创建性能索引:');

    // 2. 创建性能索引
    for (const optimization of optimizations) {
      console.log(`\n  📊 ${optimization.name}:`);
      
      for (const indexSql of optimization.indexes) {
        await new Promise((resolve, reject) => {
          db.run(indexSql, (err) => {
            if (err) {
              console.log(`    ❌ 索引创建失败: ${err.message}`);
              reject(err);
            } else {
              // 提取索引名称
              const match = indexSql.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
              const indexName = match ? match[1] : '未知索引';
              console.log(`    ✅ ${indexName}`);
              resolve();
            }
          });
        });
      }
    }

    // 3. 统计索引
    console.log('\n📊 索引统计:');
    const indexCount = await new Promise((resolve, reject) => {
      db.all('SELECT COUNT(*) as count FROM sqlite_master WHERE type="index" AND name NOT LIKE "sqlite_%"', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows[0].count);
        }
      });
    });

    console.log(`  总索引数量: ${indexCount} 个`);

    // 4. 分析表统计信息
    console.log('\n📈 更新表统计信息:');
    await new Promise((resolve, reject) => {
      db.run('ANALYZE', (err) => {
        if (err) {
          console.log('  ❌ 统计信息更新失败:', err.message);
          reject(err);
        } else {
          console.log('  ✅ 表统计信息已更新');
          resolve();
        }
      });
    });

    // 5. 检查数据库完整性
    console.log('\n🔍 检查数据库完整性:');
    const integrityCheck = await new Promise((resolve, reject) => {
      db.get('PRAGMA integrity_check', (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (integrityCheck && integrityCheck.integrity_check === 'ok') {
      console.log('  ✅ 数据库完整性检查通过');
    } else {
      console.log('  ⚠️  数据库完整性检查发现问题:', integrityCheck);
    }

    console.log('\n🎉 数据库性能优化完成！');
    console.log('\n📋 优化总结:');
    console.log(`  ✅ 配置了 ${dbConfigurations.length} 个数据库参数`);
    console.log(`  ✅ 创建了 ${optimizations.reduce((sum, opt) => sum + opt.indexes.length, 0)} 个性能索引`);
    console.log(`  ✅ 总索引数量: ${indexCount} 个`);
    console.log('  ✅ 启用了WAL模式提高并发性能');
    console.log('  ✅ 优化了缓存和内存设置');

  } catch (error) {
    console.error('\n❌ 优化过程中出错:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    db.close((err) => {
      if (err) {
        console.error('❌ 关闭数据库连接失败:', err.message);
      } else {
        console.log('\n✅ 数据库连接已关闭');
      }
    });
  }
}

// 执行优化
executeOptimizations(); 