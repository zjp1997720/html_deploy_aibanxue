const { createApiKey, validateApiKey, getAllApiKeys } = require('../../models/apiKeys');
const crypto = require('crypto');

// 导入测试环境
const { testDb, testHelpers } = require('../setup');

describe('API Keys Model', () => {
  let db;

  beforeAll(async () => {
    db = testDb;
  });

  beforeEach(async () => {
    // 清理测试数据
    await db.exec('DELETE FROM api_keys;');
  });

  describe('createApiKey', () => {
    test('应该创建新的API Key', async () => {
      const keyData = {
        name: 'Test API Key',
        description: 'Test Description',
        permissions: ['read', 'write'],
        maxRequestsPerHour: 1000,
        maxRequestsPerDay: 10000
      };

      const result = await createApiKey(
        keyData.name,
        keyData.description,
        keyData.permissions,
        keyData.maxRequestsPerHour,
        keyData.maxRequestsPerDay
      );

      // 验证返回结果
      expect(result).toHaveProperty('keyId');
      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('name', keyData.name);
      expect(result).toHaveProperty('description', keyData.description);
      expect(result).toHaveProperty('permissions', keyData.permissions);
      expect(result).toHaveProperty('maxRequestsPerHour', keyData.maxRequestsPerHour);
      expect(result).toHaveProperty('maxRequestsPerDay', keyData.maxRequestsPerDay);
      expect(result).toHaveProperty('isActive', true);
      
      // 验证API Key格式
      expect(result.apiKey).toMatch(/^hg_/);
      expect(result.keyId).toMatch(/^key_/);
      
      // 验证时间戳
      expect(result.createdAt).toBeInstanceOf(Number);
      expect(result.updatedAt).toBeInstanceOf(Number);
    });

    test('应该使用默认权限当未提供时', async () => {
      const result = await createApiKey('Test Key', 'Test Description');

      expect(result.permissions).toEqual(['read', 'write']);
    });

    test('应该使用默认限制当未提供时', async () => {
      const result = await createApiKey('Test Key', 'Test Description');

      expect(result.maxRequestsPerHour).toBe(1000);
      expect(result.maxRequestsPerDay).toBe(10000);
    });

    test('应该处理过期时间', async () => {
      const expiresAt = Date.now() + 86400000; // 24小时后
      const result = await createApiKey(
        'Test Key',
        'Test Description',
        ['read'],
        100,
        1000,
        expiresAt
      );

      expect(result.expiresAt).toBe(expiresAt);
    });

    test('应该在数据库中保存API Key', async () => {
      const result = await createApiKey('Test Key', 'Test Description');

      // 查询数据库验证
      const dbKey = await db.get('SELECT * FROM api_keys WHERE key_id = ?', [result.keyId]);
      
      expect(dbKey).toBeTruthy();
      expect(dbKey.name).toBe('Test Key');
      expect(dbKey.description).toBe('Test Description');
      expect(dbKey.permissions).toBe('read,write');
      expect(dbKey.is_active).toBe(1);
      expect(dbKey.key_hash).toBeTruthy();
      expect(dbKey.key_hash).not.toBe(result.apiKey); // 应该存储hash而不是明文
    });

    test('应该生成唯一的key_id', async () => {
      const key1 = await createApiKey('Key 1');
      const key2 = await createApiKey('Key 2');

      expect(key1.keyId).not.toBe(key2.keyId);
    });

    test('应该生成唯一的API Key', async () => {
      const key1 = await createApiKey('Key 1');
      const key2 = await createApiKey('Key 2');

      expect(key1.apiKey).not.toBe(key2.apiKey);
    });
  });

  describe('validateApiKey', () => {
    let createdKey;

    beforeEach(async () => {
      createdKey = await createApiKey('Test Key', 'Test Description');
    });

    test('应该验证有效的API Key', async () => {
      const validated = await validateApiKey(createdKey.apiKey);

      expect(validated).toBeTruthy();
      expect(validated.keyId).toBe(createdKey.keyId);
      expect(validated.name).toBe('Test Key');
      expect(validated.description).toBe('Test Description');
      expect(validated.permissions).toEqual(['read', 'write']);
      expect(validated.maxRequestsPerHour).toBe(1000);
      expect(validated.maxRequestsPerDay).toBe(10000);
      expect(validated.isActive).toBe(true);
    });

    test('应该拒绝无效的API Key', async () => {
      const validated = await validateApiKey('invalid_key_12345');

      expect(validated).toBeFalsy();
    });

    test('应该拒绝空字符串', async () => {
      const validated = await validateApiKey('');

      expect(validated).toBeFalsy();
    });

    test('应该拒绝null值', async () => {
      const validated = await validateApiKey(null);

      expect(validated).toBeFalsy();
    });

    test('应该拒绝undefined值', async () => {
      const validated = await validateApiKey(undefined);

      expect(validated).toBeFalsy();
    });

    test('应该检查API Key是否活跃', async () => {
      // 先创建一个key
      const key = await createApiKey('Test Key');
      
      // 在数据库中将其设置为不活跃
      await db.run('UPDATE api_keys SET is_active = 0 WHERE key_id = ?', [key.keyId]);
      
      // 验证应该失败
      const validated = await validateApiKey(key.apiKey);
      expect(validated).toBeFalsy();
    });

    test('应该检查API Key是否过期', async () => {
      // 创建一个已过期的key
      const expiresAt = Date.now() - 1000; // 1秒前过期
      const key = await createApiKey('Expired Key', 'Expired Description', ['read'], 100, 1000, expiresAt);
      
      // 验证应该失败
      const validated = await validateApiKey(key.apiKey);
      expect(validated).toBeFalsy();
    });
  });

  describe('getAllApiKeys', () => {
    test('应该返回所有活跃的API Keys', async () => {
      // 创建多个API Keys
      await createApiKey('Key 1', 'Description 1');
      await createApiKey('Key 2', 'Description 2');
      await createApiKey('Key 3', 'Description 3');

      const keys = await getAllApiKeys();

      expect(keys).toHaveLength(3);
      expect(keys[0]).toHaveProperty('key_id');
      expect(keys[0]).toHaveProperty('name');
      expect(keys[0]).toHaveProperty('description');
      expect(keys[0]).toHaveProperty('permissions');
      expect(keys[0]).toHaveProperty('is_active');
      expect(keys[0]).toHaveProperty('created_at');
    });

    test('应该返回空数组当没有API Keys时', async () => {
      const keys = await getAllApiKeys();
      expect(keys).toHaveLength(0);
    });

    test('应该只返回活跃的API Keys', async () => {
      // 创建活跃的key
      const activeKey = await createApiKey('Active Key');
      
      // 创建不活跃的key
      const inactiveKey = await createApiKey('Inactive Key');
      await db.run('UPDATE api_keys SET is_active = 0 WHERE key_id = ?', [inactiveKey.keyId]);

      const keys = await getAllApiKeys();

      expect(keys).toHaveLength(1);
      expect(keys[0].name).toBe('Active Key');
    });

    test('应该按创建时间排序', async () => {
      // 创建多个keys，间隔一段时间
      testHelpers.mockDate(new Date('2023-01-01'));
      const key1 = await createApiKey('Key 1');
      
      testHelpers.mockDate(new Date('2023-01-02'));
      const key2 = await createApiKey('Key 2');
      
      testHelpers.mockDate(new Date('2023-01-03'));
      const key3 = await createApiKey('Key 3');

      const keys = await getAllApiKeys();

      // 应该按创建时间倒序排列
      expect(keys[0].name).toBe('Key 3');
      expect(keys[1].name).toBe('Key 2');
      expect(keys[2].name).toBe('Key 1');

      testHelpers.restoreDate();
    });
  });

  describe('错误处理', () => {
    test('应该处理数据库错误', async () => {
      // 模拟数据库错误
      jest.spyOn(db, 'run').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      await expect(createApiKey('Test Key')).rejects.toThrow('Database connection failed');
    });

    test('应该处理参数验证错误', async () => {
      await expect(createApiKey()).rejects.toThrow();
      await expect(createApiKey('')).rejects.toThrow();
      await expect(createApiKey(null)).rejects.toThrow();
    });
  });

  describe('边界情况', () => {
    test('应该处理长名称和描述', async () => {
      const longName = 'a'.repeat(100);
      const longDescription = 'b'.repeat(500);

      const result = await createApiKey(longName, longDescription);

      expect(result.name).toBe(longName);
      expect(result.description).toBe(longDescription);
    });

    test('应该处理特殊字符', async () => {
      const specialName = 'Test Key @#$%^&*()';
      const specialDescription = 'Description with 中文 and émojis 🚀';

      const result = await createApiKey(specialName, specialDescription);

      expect(result.name).toBe(specialName);
      expect(result.description).toBe(specialDescription);
    });

    test('应该处理空权限数组', async () => {
      const result = await createApiKey('Empty Permissions', 'Empty', []);

      expect(result.permissions).toEqual([]);
    });

    test('应该处理单字符权限', async () => {
      const result = await createApiKey('Single Permission', 'Single', ['r']);

      expect(result.permissions).toEqual(['r']);
    });
  });
});