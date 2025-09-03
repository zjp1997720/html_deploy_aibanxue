const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 数据库文件路径
const dbPath = path.join(__dirname, '../db/html-go.db');
const backupDir = path.join(__dirname, '../db/backups');

// 确保数据库和备份目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 数据库连接实例
let db = null;

// 创建数据库连接
function createConnection() {
  return new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('数据库连接失败:', err);
    }
  });
}

// 检查数据库完整性
function checkDatabaseIntegrity() {
  return new Promise((resolve, reject) => {
    const tempDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      tempDb.get("PRAGMA integrity_check", [], (err, row) => {
        tempDb.close();
        if (err) {
          reject(err);
        } else {
          resolve(row.integrity_check === 'ok');
        }
      });
    });
  });
}

// 创建数据库备份
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

// 恢复数据库备份
function restoreFromBackup(backupPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(backupPath)) {
      reject(new Error('备份文件不存在'));
      return;
    }
    
    // 关闭现有连接
    if (db) {
      db.close();
    }
    
    // 删除损坏的数据库
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    // 恢复备份
    fs.copyFileSync(backupPath, dbPath);
    console.log(`数据库恢复成功: ${backupPath}`);
    resolve();
  });
}

// 获取最新的备份
function getLatestBackup() {
  const backups = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('html-go-') && file.endsWith('.db'))
    .sort()
    .reverse();
  
  return backups.length > 0 ? path.join(backupDir, backups[0]) : null;
}

// 清理旧备份（保留最近7个）
function cleanOldBackups() {
  const backups = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('html-go-') && file.endsWith('.db'))
    .sort();
  
  while (backups.length > 7) {
    const oldBackup = path.join(backupDir, backups.shift());
    fs.unlinkSync(oldBackup);
    console.log(`删除旧备份: ${oldBackup}`);
  }
}

// 初始化数据库结构
async function initializeSchema(dbConnection) {
  return new Promise((resolve, reject) => {
    dbConnection.serialize(() => {
      // 创建页面表
      dbConnection.run(`
        CREATE TABLE IF NOT EXISTS pages (
          id TEXT PRIMARY KEY,
          html_content TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          password TEXT,
          is_protected INTEGER DEFAULT 0,
          code_type TEXT DEFAULT 'html'
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

// 初始化数据库
async function initDatabase() {
  try {
    console.log('开始数据库初始化...');
    
    // 检查数据库文件是否存在
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
    
    // 创建数据库连接
    db = createConnection();
    
    // 初始化表结构
    await initializeSchema(db);
    
    // 创建备份
    if (dbExists) {
      await createBackup();
      cleanOldBackups();
    }
    
    console.log('✅ 数据库初始化成功');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    
    // 如果所有方法都失败，尝试创建全新的数据库
    if (fs.existsSync(dbPath)) {
      console.log('尝试创建全新数据库...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const corruptedPath = path.join(backupDir, `html-go-corrupted-${timestamp}.db`);
      
      // 备份损坏的数据库
      fs.renameSync(dbPath, corruptedPath);
      console.log(`损坏的数据库已备份到: ${corruptedPath}`);
      
      // 重新初始化
      return initDatabase();
    }
    
    return Promise.reject(error);
  }
}

// 执行查询的辅助函数
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

// 执行单行查询的辅助函数
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

// 执行更新的辅助函数
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

// 获取数据库状态
function getDatabaseStatus() {
  return {
    exists: fs.existsSync(dbPath),
    size: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
    backupCount: fs.readdirSync(backupDir).length,
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