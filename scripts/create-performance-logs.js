const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, '../db/html-go.db');

console.log('=== Phase 3: 创建性能日志表 ===');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 连接数据库失败:', err.message);
    process.exit(1);
  }
  console.log('✅ 数据库连接成功');
});

// 创建性能日志表
function createPerformanceLogsTable() {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS performance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        response_time INTEGER NOT NULL,
        memory_delta INTEGER DEFAULT 0,
        user_agent TEXT,
        ip_address TEXT,
        timestamp INTEGER NOT NULL,
        is_slow INTEGER DEFAULT 0,
        is_error INTEGER DEFAULT 0,
        query_params TEXT,
        body_size INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `;
    
    db.run(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ performance_logs表创建成功');
        resolve();
      }
    });
  });
}

// 创建性能监控相关索引
function createPerformanceIndexes() {
  return new Promise((resolve, reject) => {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_perf_logs_created_at ON performance_logs(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_perf_logs_endpoint ON performance_logs(endpoint)',
      'CREATE INDEX IF NOT EXISTS idx_perf_logs_response_time ON performance_logs(response_time)',
      'CREATE INDEX IF NOT EXISTS idx_perf_logs_is_slow ON performance_logs(is_slow)',
      'CREATE INDEX IF NOT EXISTS idx_perf_logs_is_error ON performance_logs(is_error)',
      'CREATE INDEX IF NOT EXISTS idx_perf_logs_status_code ON performance_logs(status_code)',
      'CREATE INDEX IF NOT EXISTS idx_perf_logs_method_endpoint ON performance_logs(method, endpoint)',
      'CREATE INDEX IF NOT EXISTS idx_perf_logs_timestamp_endpoint ON performance_logs(timestamp, endpoint)'
    ];
    
    let completed = 0;
    indexes.forEach((indexSql, index) => {
      db.run(indexSql, (err) => {
        if (err) {
          reject(err);
          return;
        }
        completed++;
        
        // 提取索引名称
        const match = indexSql.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
        const indexName = match ? match[1] : `索引${index + 1}`;
        console.log(`  ✅ ${indexName}`);
        
        if (completed === indexes.length) {
          console.log('✅ 性能监控索引创建成功');
          resolve();
        }
      });
    });
  });
}

// 验证表结构
function verifyTableStructure() {
  return new Promise((resolve, reject) => {
    console.log('\n🔍 验证表结构:');
    
    db.all("PRAGMA table_info(performance_logs)", (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('\n📋 performance_logs表结构:');
      rows.forEach(row => {
        console.log(`  - ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
      });
      
      resolve();
    });
  });
}

// 执行迁移
async function runMigration() {
  try {
    console.log('🚀 开始创建性能监控表...\n');
    
    await createPerformanceLogsTable();
    await createPerformanceIndexes();
    await verifyTableStructure();
    
    console.log('\n🎉 性能监控数据库表创建完成！');
    console.log('\n📋 创建总结:');
    console.log('  ✅ performance_logs表已创建');
    console.log('  ✅ 8个性能监控索引已创建');
    console.log('  ✅ 表结构验证完成');
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
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

// 运行迁移
runMigration(); 