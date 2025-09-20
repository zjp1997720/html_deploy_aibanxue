const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// =============================
// 路径解析与目录准备
// =============================
const configuredPath = process.env.DB_PATH || './db/html-go.db';
const dbPath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.resolve(__dirname, '..', configuredPath);
const dbDir = path.dirname(dbPath);
const backupDir = path.join(dbDir, 'backups');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// =============================
// 数据库连接实例
// =============================
let db = null;

function createConnection() {
  return new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('数据库连接失败:', err);
    }
  });
}

// =============================
// 辅助工具
// =============================
function checkDatabaseIntegrity() {
  return new Promise((resolve, reject) => {
    const tempDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }

      tempDb.get('PRAGMA integrity_check', [], (innerErr, row) => {
        tempDb.close();
        if (innerErr) {
          reject(innerErr);
        } else {
          resolve(row.integrity_check === 'ok');
        }
      });
    });
  });
}

function createBackup() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dbPath)) {
      resolve(false);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `html-go-${timestamp}.db`);

    const sourceStream = fs.createReadStream(dbPath);
    const destStream = fs.createWriteStream(backupPath);

    sourceStream.pipe(destStream);

    destStream.on('finish', () => {
      console.log(`数据库备份创建成功: ${backupPath}`);
      resolve(backupPath);
    });

    destStream.on('error', (err) => {
      console.error('数据库备份失败:', err);
      reject(err);
    });
  });
}

function restoreFromBackup(backupPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(backupPath)) {
      reject(new Error('备份文件不存在'));
      return;
    }

    if (db) {
      db.close();
    }

    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    fs.copyFileSync(backupPath, dbPath);
    console.log(`数据库恢复成功: ${backupPath}`);
    resolve();
  });
}

function getLatestBackup() {
  if (!fs.existsSync(backupDir)) {
    return null;
  }

  const backups = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('html-go-') && file.endsWith('.db'))
    .sort()
    .reverse();

  return backups.length > 0 ? path.join(backupDir, backups[0]) : null;
}

function cleanOldBackups() {
  if (!fs.existsSync(backupDir)) {
    return;
  }

  const backups = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('html-go-') && file.endsWith('.db'))
    .sort();

  while (backups.length > 7) {
    const oldBackup = path.join(backupDir, backups.shift());
    fs.unlinkSync(oldBackup);
    console.log(`删除旧备份: ${oldBackup}`);
  }
}

// =============================
// 结构迁移
// =============================
async function initializeSchema(connection) {
  const runStatement = (sql, params = []) => new Promise((resolve, reject) => {
    connection.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });

  const getTableInfo = (table) => new Promise((resolve, reject) => {
    connection.all(`PRAGMA table_info(${table})`, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

  const ensureColumn = async (table, column, definition) => {
    const columns = await getTableInfo(table);
    if (!columns.some(col => col.name === column)) {
      await runStatement(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
      console.log(`表 ${table} 自动补列: ${column}`);
    }
  };

  // pages 表（新增 name 字段）
  await runStatement(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      html_content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      password TEXT,
      is_protected INTEGER DEFAULT 0,
      code_type TEXT DEFAULT 'html',
      name TEXT
    )
  `);
  await ensureColumn('pages', 'name', 'name TEXT');

  // performance_logs 表及索引
  await runStatement(`
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
  `);

  const performanceIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_perf_logs_created_at ON performance_logs(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_perf_logs_endpoint ON performance_logs(endpoint)',
    'CREATE INDEX IF NOT EXISTS idx_perf_logs_response_time ON performance_logs(response_time)',
    'CREATE INDEX IF NOT EXISTS idx_perf_logs_is_slow ON performance_logs(is_slow)',
    'CREATE INDEX IF NOT EXISTS idx_perf_logs_is_error ON performance_logs(is_error)',
    'CREATE INDEX IF NOT EXISTS idx_perf_logs_status_code ON performance_logs(status_code)',
    'CREATE INDEX IF NOT EXISTS idx_perf_logs_method_endpoint ON performance_logs(method, endpoint)',
    'CREATE INDEX IF NOT EXISTS idx_perf_logs_timestamp_endpoint ON performance_logs(timestamp, endpoint)'
  ];

  for (const statement of performanceIndexes) {
    await runStatement(statement);
  }

  // api_keys 表
  await runStatement(`
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
  `);

  // api_usage_logs 表
  await runStatement(`
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
  `);

  // 相关索引
  const apiIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_api_keys_key_id ON api_keys(key_id)',
    'CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key_id ON api_usage_logs(key_id)',
    'CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint)'
  ];

  for (const statement of apiIndexes) {
    await runStatement(statement);
  }
}

// =============================
// 初始化主流程
// =============================
async function initDatabase() {
  try {
    console.log('开始数据库初始化...');

    const dbExists = fs.existsSync(dbPath);

    if (dbExists) {
      console.log('数据库文件已存在，检查完整性...');
      const isIntact = await checkDatabaseIntegrity();

      if (!isIntact) {
        console.warn('数据库损坏，尝试从备份恢复...');
        const latestBackup = getLatestBackup();

        if (latestBackup) {
          await restoreFromBackup(latestBackup);
        } else {
          console.warn('没有找到备份，创建新数据库...');
          fs.unlinkSync(dbPath);
        }
      } else {
        console.log('数据库完整性检查通过');
      }
    }

    db = createConnection();

    await initializeSchema(db);

    if (dbExists) {
      await createBackup();
      cleanOldBackups();
    }

    console.log('✅ 数据库初始化成功');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);

    if (fs.existsSync(dbPath)) {
      console.log('尝试创建全新数据库...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const corruptedPath = path.join(backupDir, `html-go-corrupted-${timestamp}.db`);

      fs.renameSync(dbPath, corruptedPath);
      console.log(`损坏的数据库已备份到: ${corruptedPath}`);

      return initDatabase();
    }

    return Promise.reject(error);
  }
}

// =============================
// 查询辅助函数
// =============================
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('数据库未初始化'));
      return;
    }

    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('数据库未初始化'));
      return;
    }

    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('数据库未初始化'));
      return;
    }

    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

function getDatabaseStatus() {
  return {
    exists: fs.existsSync(dbPath),
    size: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
    backupCount: fs.existsSync(backupDir) ? fs.readdirSync(backupDir).length : 0,
    latestBackup: getLatestBackup()
  };
}

module.exports = {
  db: () => db,
  initDatabase,
  query,
  get,
  run,
  checkDatabaseIntegrity,
  createBackup,
  restoreFromBackup,
  getDatabaseStatus
};
