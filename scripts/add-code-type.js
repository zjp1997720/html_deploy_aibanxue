/**
 * u6dfbu52a0u4ee3u7801u7c7bu578bu5b57u6bb5u5230u6570u636eu5e93
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// u6570u636eu5e93u6587u4ef6u8defu5f84
const dbPath = path.join(__dirname, '../db/html-go.db');

// u68c0u67e5u6570u636eu5e93u6587u4ef6u662fu5426u5b58u5728
if (!fs.existsSync(dbPath)) {
  console.log('u521bu5efau6570u636eu5e93u76eeu5f55...');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

// u521bu5efau6570u636eu5e93u8fdeu63a5
const db = new sqlite3.Database(dbPath);

// u6dfbu52a0code_typeu5217
console.log('u6dfbu52a0code_typeu5217u5230pagesu8868...');

// u6dfbu52a0code_typeu5217
db.run("ALTER TABLE pages ADD COLUMN code_type TEXT DEFAULT 'html'", (err) => {
  if (err) {
    // u5982u679cu5217u5df2u5b58u5728uff0cu5219u4f1au8fd4u56deu9519u8bef
    if (err.message.includes('duplicate column name')) {
      console.log('code_typeu5217u5df2u5b58u5728uff0cu65e0u9700u6dfbu52a0');
    } else {
      console.error('u6dfbu52a0u5217u9519u8bef:', err.message);
    }
  } else {
    console.log('u6210u529fu6dfbu52a0code_typeu5217');
  }
  
  // u5173u95edu6570u636eu5e93u8fdeu63a5
  db.close();
});
