const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// 数据库文件路径
const dbPath = path.join(__dirname, '../db/html-go.db');

console.log('开始API Key系统数据库迁移...');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库失败:', err.message);
    process.exit(1);
  }
  console.log('已连接到数据库');
});

// 检查表是否存在
function checkTableExists(tableName) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      }
    );
  });
}

// 创建api_keys表
function createApiKeysTable() {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_id TEXT UNIQUE NOT NULL,
        key_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        permissions TEXT DEFAULT 'read,write',
        max_requests_per_hour INTEGER DEFAULT 1000,
        max_requests_per_day INTEGER DEFAULT 10000,
        expires_at INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER
      )
    `;
    
    db.run(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ api_keys表创建成功');
        resolve();
      }
    });
  });
}

// 创建api_usage_logs表
function createApiUsageLogsTable() {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS api_usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_id TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        request_ip TEXT,
        user_agent TEXT,
        status_code INTEGER,
        response_time INTEGER,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (key_id) REFERENCES api_keys (key_id)
      )
    `;
    
    db.run(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ api_usage_logs表创建成功');
        resolve();
      }
    });
  });
}

// 创建索引以提高查询性能
function createIndexes() {
  return new Promise((resolve, reject) => {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_api_keys_key_id ON api_keys(key_id)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key_id ON api_usage_logs(key_id)',
      'CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint)'
    ];
    
    let completed = 0;
    indexes.forEach((sql, index) => {
      db.run(sql, (err) => {
        if (err) {
          reject(err);
          return;
        }
        completed++;
        if (completed === indexes.length) {
          console.log('✅ 数据库索引创建成功');
          resolve();
        }
      });
    });
  });
}

// 插入示例API Key（仅在开发环境）
function insertSampleApiKey() {
  return new Promise((resolve, reject) => {
    // 生成示例API Key
    const keyId = 'demo_' + crypto.randomBytes(16).toString('hex');
    const apiKey = 'hg_' + crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const sql = `
      INSERT OR IGNORE INTO api_keys 
      (key_id, key_hash, name, description, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const now = Date.now();
    db.run(sql, [
      keyId,
      keyHash,
      '演示API Key',
      '这是一个用于演示的API Key，请在生产环境中删除',
      'read,write',
      now,
      now
    ], function(err) {
      if (err) {
        reject(err);
      } else {
        if (this.changes > 0) {
          console.log('✅ 插入演示API Key成功');
          console.log(`📝 演示API Key: ${apiKey}`);
          console.log(`📝 Key ID: ${keyId}`);
          console.log('⚠️  请妥善保存此API Key，它只会显示一次！');
        } else {
          console.log('ℹ️  演示API Key已存在，跳过插入');
        }
        resolve();
      }
    });
  });
}

// 验证表结构
function verifyTables() {
  return new Promise((resolve, reject) => {
    console.log('\n🔍 验证表结构:');
    
    // 验证api_keys表
    db.all("PRAGMA table_info(api_keys)", (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('\n📋 api_keys表结构:');
      rows.forEach(row => {
        console.log(`  - ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
      });
      
      // 验证api_usage_logs表
      db.all("PRAGMA table_info(api_usage_logs)", (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log('\n📋 api_usage_logs表结构:');
        rows.forEach(row => {
          console.log(`  - ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
        });
        
        resolve();
      });
    });
  });
}

// 执行迁移
async function runMigration() {
  try {
    console.log('📊 检查现有表结构...');
    
    const apiKeysExists = await checkTableExists('api_keys');
    const apiUsageLogsExists = await checkTableExists('api_usage_logs');
    
    console.log(`api_keys表存在: ${apiKeysExists}`);
    console.log(`api_usage_logs表存在: ${apiUsageLogsExists}`);
    
    console.log('\n🚀 开始创建表结构...');
    await createApiKeysTable();
    await createApiUsageLogsTable();
    await createIndexes();
    
    // 仅在开发环境插入示例数据
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n🧪 插入演示数据...');
      await insertSampleApiKey();
    }
    
    await verifyTables();
    
    console.log('\n🎉 API Key系统数据库迁移完成！');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接失败:', err.message);
      } else {
        console.log('✅ 数据库连接已关闭');
      }
    });
  }
}

// 运行迁移
runMigration(); 