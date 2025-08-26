const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, '../db/html-go.db');

console.log('=== Phase 3: 数据库状态检查 ===');
console.log('数据库路径:', dbPath);
console.log();

// 创建数据库连接
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ 连接数据库失败:', err.message);
    process.exit(1);
  }
  console.log('✅ 数据库连接成功');
  
  // 检查表结构
  console.log('\n📋 数据库表结构:');
  db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, tables) => {
    if (err) {
      console.error('❌ 查询表失败:', err.message);
      db.close();
      return;
    }
    
    tables.forEach(table => {
      console.log(`  ✓ ${table.name}`);
    });
    
    // 检查索引
    console.log('\n🔍 数据库索引:');
    db.all('SELECT name, tbl_name FROM sqlite_master WHERE type="index" AND name NOT LIKE "sqlite_%"', (err, indexes) => {
      if (err) {
        console.error('❌ 查询索引失败:', err.message);
        db.close();
        return;
      }
      
      if (indexes.length > 0) {
        indexes.forEach(idx => {
          console.log(`  ✓ ${idx.name} (表: ${idx.tbl_name})`);
        });
      } else {
        console.log('  ⚠️  未发现自定义索引');
      }
      
      // 检查记录数
      console.log('\n📊 表数据统计:');
      let completed = 0;
      const totalTables = tables.length;
      
      if (totalTables === 0) {
        console.log('  ⚠️  没有找到任何表');
        db.close();
        return;
      }
      
      tables.forEach(table => {
        db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
          if (err) {
            console.log(`  ❌ ${table.name}: 查询失败 (${err.message})`);
          } else {
            console.log(`  ${table.name}: ${row.count} 条记录`);
          }
          
          completed++;
          if (completed === totalTables) {
            // 检查pages表结构
            console.log('\n📄 pages表结构详情:');
            db.all('PRAGMA table_info(pages)', (err, cols) => {
              if (err) {
                console.log('  ❌ 无法获取pages表结构');
              } else {
                cols.forEach(col => {
                  console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
                });
              }
              
              console.log('\n🎯 性能优化建议:');
              console.log(`  📊 发现 ${indexes.length} 个自定义索引`);
              console.log(`  📋 发现 ${tables.length} 个表`);
              
              if (indexes.length < 5) {
                console.log('  ⚠️  建议添加更多索引以优化查询性能');
              }
              
              console.log('  ✅ 数据库状态检查完成！');
              
              // 关闭连接
              db.close((err) => {
                if (err) {
                  console.error('❌ 关闭数据库连接失败:', err.message);
                } else {
                  console.log('\n✅ 数据库连接已关闭');
                }
              });
            });
          }
        });
      });
    });
  });
}); 