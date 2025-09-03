[根目录](../CLAUDE.md) > **scripts**

# Scripts模块 - 部署工具层架构

## 模块职责

负责项目的部署、维护、数据库迁移等自动化脚本，提供开发、测试、生产环境的管理工具。

## 主要脚本文件

### 部署脚本
- **deploy.sh**: 主部署脚本
- **setup-cert.sh**: SSL证书设置脚本
- **start-production.sh**: 生产环境启动脚本

### 数据库脚本
- **migrate-db.js**: 数据库迁移脚本
- **migrate-to-v2.js**: 升级到v2版本的迁移脚本
- **add-name-field.js**: 添加名称字段的脚本
- **add-code-type.js**: 添加代码类型字段的脚本
- **optimize-database-phase3.js**: 数据库优化脚本

### 维护脚本
- **find-free-port.js**: 查找可用端口
- **check-db-status.js**: 检查数据库状态
- **check-time-format.js**: 检查时间格式
- **create-performance-logs.js**: 创建性能日志

### 监控脚本
- **cleanup-old-logs.js**: 清理旧日志
- **monitor-performance.js**: 性能监控

## 对外接口

### 部署命令
```bash
# 主部署脚本
./scripts/deploy.sh

# 生产环境启动
./scripts/start-production.sh

# SSL证书设置
./scripts/setup-cert.sh
```

### 数据库迁移
```bash
# 数据库迁移
node scripts/migrate-db.js

# 升级到v2
node scripts/migrate-to-v2.js

# 数据库优化
node scripts/optimize-database-phase3.js
```

### 维护命令
```bash
# 检查数据库状态
node scripts/check-db-status.js

# 查找可用端口
node scripts/find-free-port.js

# 创建性能日志
node scripts/create-performance-logs.js
```

## 关键依赖与配置

### 环境要求
- **Node.js**: 14.0+
- **npm**: 6.0+
- **SQLite3**: 数据库支持
- **PM2**: 进程管理（生产环境）

### 配置文件
- **.env**: 环境变量配置
- **config.js**: 应用配置
- **package.json**: 项目依赖和脚本

### 部署环境
- **开发环境**: 本地开发
- **测试环境**: 功能测试
- **生产环境**: 正式部署

## 数据模型

### 部署配置
```typescript
interface DeployConfig {
  environment: 'development' | 'test' | 'production';
  server: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
  database: {
    path: string;
    backupPath: string;
  };
  ssl: {
    enabled: boolean;
    certPath: string;
    keyPath: string;
  };
}
```

### 迁移记录
```typescript
interface MigrationRecord {
  id: string;
  name: string;
  version: string;
  executedAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  checksum: string;
}
```

## 测试与质量

### 部署测试
- 环境配置测试
- 数据库迁移测试
- 服务启动测试
- 健康检查测试

### 脚本测试
- 参数验证测试
- 错误处理测试
- 回滚机制测试
- 日志记录测试

### 性能测试
- 部署时间测试
- 资源使用测试
- 并发部署测试
- 恢复时间测试

## 常见问题 (FAQ)

### Q: 如何回滚部署？
A: 使用git checkout或恢复备份的方式进行回滚。

### Q: 数据库迁移失败怎么办？
A: 检查迁移脚本，修复问题后重新执行，或手动恢复数据库。

### Q: 如何监控部署状态？
A: 查看部署日志，或使用健康检查接口。

### Q: 如何优化部署速度？
A: 使用增量部署、并行处理、缓存优化等方式。

## 相关文件清单

### 核心文件
- `deploy.sh` - 主部署脚本
- `migrate-db.js` - 数据库迁移
- `start-production.sh` - 生产启动脚本

### 工具脚本
- `setup-cert.sh` - SSL证书设置
- `check-db-status.js` - 数据库状态检查
- `create-performance-logs.js` - 性能日志创建

### 依赖文件
- `../package.json` - 项目配置
- `../config.js` - 应用配置
- `../.env` - 环境变量

## 变更记录 (Changelog)

- **2025-09-03**: 创建scripts模块文档（待完善）
- **功能增强**: 添加自动化部署脚本
- **数据库管理**: 完善迁移和维护工具
- **性能优化**: 添加监控和优化脚本