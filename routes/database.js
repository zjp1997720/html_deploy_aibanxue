const express = require('express');
const router = express.Router();
const { 
  initDatabase, 
  checkDatabaseIntegrity, 
  createBackup, 
  restoreFromBackup, 
  getDatabaseStatus 
} = require('../models/db');

// 获取数据库状态
router.get('/status', async (req, res) => {
  try {
    const status = getDatabaseStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 检查数据库完整性
router.get('/integrity', async (req, res) => {
  try {
    const isIntact = await checkDatabaseIntegrity();
    res.json({
      success: true,
      data: {
        integrity: isIntact,
        message: isIntact ? '数据库完整性正常' : '数据库可能已损坏'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 创建数据库备份
router.post('/backup', async (req, res) => {
  try {
    const backupPath = await createBackup();
    res.json({
      success: true,
      data: {
        backupPath,
        message: '数据库备份创建成功'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 重新初始化数据库（危险操作）
router.post('/reinit', async (req, res) => {
  try {
    // 这将重新初始化数据库，可能导致数据丢失
    await initDatabase();
    res.json({
      success: true,
      message: '数据库重新初始化成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;