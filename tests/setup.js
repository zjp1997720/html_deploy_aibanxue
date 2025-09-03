const path = require('path');
const fs = require('fs');
const { initDatabase } = require('../models/db');

// 测试数据库路径
const testDbPath = path.join(__dirname, '..', 'db', 'test.db');

// 清理测试数据库
beforeAll(async () => {
  // 确保db目录存在
  const dbDir = path.dirname(testDbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // 删除旧的测试数据库
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.AUTH_ENABLED = 'true';
  process.env.AUTH_PASSWORD = 'test-password';
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.DB_PATH = testDbPath;
  
  // 初始化测试数据库
  await initDatabase();
});

// 测试完成后清理
afterAll(async () => {
  // 关闭数据库连接
  const db = require('../models/db');
  if (db && db.close) {
    db.close();
  }
  
  // 清理测试数据库
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// 每个测试前清理会话
beforeEach(() => {
  // 清理所有会话数据
  const sessionDir = path.join(__dirname, '..', 'sessions');
  if (fs.existsSync(sessionDir)) {
    const files = fs.readdirSync(sessionDir);
    files.forEach(file => {
      if (file.startsWith('sess-')) {
        fs.unlinkSync(path.join(sessionDir, file));
      }
    });
  }
});

// 全局测试超时
jest.setTimeout(30000);