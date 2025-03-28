/**
 * u6570u636eu5e93u8fc1u79fbu811au672c
 * u7528u4e8eu5c06u73b0u6709u6570u636eu5e93u8868u7ed3u6784u66f4u65b0u4e3au65b0u7684u7ed3u6784
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// u6570u636eu5e93u6587u4ef6u8defu5f84
const dbPath = path.join(__dirname, '../db/html-go.db');

// u68c0u67e5u6570u636eu5e93u6587u4ef6u662fu5426u5b58u5728
if (!fs.existsSync(dbPath)) {
  console.error('u6570u636eu5e93u6587u4ef6u4e0du5b58u5728:', dbPath);
  process.exit(1);
}

// u521bu5efau6570u636eu5e93u8fdeu63a5
const db = new sqlite3.Database(dbPath);

// u68c0u67e5u8868u7ed3u6784u5e76u6dfbu52a0u65b0u5217
async function migrateDatabase() {
  return new Promise((resolve, reject) => {
    // u68c0u67e5pagesu8868u4e2du662fu5426u5b58u5728code_typeu5217
    db.get("PRAGMA table_info(pages)", (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // u68c0u67e5u662fu5426u5df2u5b58u5728code_typeu5217
      const hasCodeTypeColumn = rows.some(row => row.name === 'code_type');
      
      if (!hasCodeTypeColumn) {
        console.log('u6dfbu52a0code_typeu5217u5230pagesu8868...');
        
        // u6dfbu52a0code_typeu5217
        db.run("ALTER TABLE pages ADD COLUMN code_type TEXT DEFAULT 'html'", (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log('u6210u529fu6dfbu52a0code_typeu5217');
          resolve();
        });
      } else {
        console.log('code_typeu5217u5df2u5b58u5728uff0cu65e0u9700u8fc1u79fb');
        resolve();
      }
    });
  });
}

// u6267u884cu8fc1u79fb
migrateDatabase()
  .then(() => {
    console.log('u6570u636eu5e93u8fc1u79fbu5b8cu6210');
    db.close();
  })
  .catch((err) => {
    console.error('u6570u636eu5e93u8fc1u79fbu9519u8bef:', err);
    db.close();
    process.exit(1);
  });
