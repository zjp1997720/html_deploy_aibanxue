const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, '../db/html-go.db');

console.log('检查数据库中的时间戳格式...');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库失败:', err.message);
    process.exit(1);
  }
  console.log('已连接到数据库');
});

// 查询前5条记录的时间戳
db.all("SELECT id, created_at FROM pages ORDER BY created_at DESC LIMIT 5", (err, rows) => {
  if (err) {
    console.error('查询失败:', err.message);
  } else {
    console.log('\n数据库中的时间戳：');
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   原始时间戳: ${row.created_at}`);
      console.log(`   时间戳类型: ${typeof row.created_at}`);
      
      // 尝试转换为Date对象
      try {
        const date = new Date(parseInt(row.created_at));
        console.log(`   转换为Date: ${date.toISOString()}`);
        console.log(`   本地时间: ${date.toLocaleString('zh-CN')}`);
        console.log(`   是否有效: ${!isNaN(date.getTime())}`);
      } catch (error) {
        console.log(`   转换错误: ${error.message}`);
      }
      console.log('');
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