const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const dbPath = path.join(__dirname, '../db/html-go.db');

console.log('开始为pages表添加name字段...');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库失败:', err.message);
    process.exit(1);
  }
  console.log('已连接到数据库');
});

// 检查name字段是否已存在
function checkColumnExists() {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(pages)", (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const nameColumnExists = rows.some(row => row.name === 'name');
      console.log('检查结果 - name字段是否存在:', nameColumnExists);
      resolve(nameColumnExists);
    });
  });
}

// 添加name字段
function addNameColumn() {
  return new Promise((resolve, reject) => {
    const sql = 'ALTER TABLE pages ADD COLUMN name TEXT DEFAULT NULL';
    db.run(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('成功添加name字段');
        resolve();
      }
    });
  });
}

// 执行迁移
async function runMigration() {
  try {
    const columnExists = await checkColumnExists();
    
    if (columnExists) {
      console.log('name字段已存在，跳过迁移');
    } else {
      await addNameColumn();
      console.log('迁移完成！');
    }
    
    // 验证迁移结果
    console.log('\n验证迁移结果:');
    db.all("PRAGMA table_info(pages)", (err, rows) => {
      if (err) {
        console.error('验证失败:', err.message);
      } else {
        console.log('当前pages表结构:');
        rows.forEach(row => {
          console.log(`- ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
        });
      }
      
      // 关闭数据库连接
      db.close((err) => {
        if (err) {
          console.error('关闭数据库连接失败:', err.message);
        } else {
          console.log('数据库连接已关闭');
        }
      });
    });
    
  } catch (error) {
    console.error('迁移失败:', error.message);
    process.exit(1);
  }
}

// 运行迁移
runMigration(); 