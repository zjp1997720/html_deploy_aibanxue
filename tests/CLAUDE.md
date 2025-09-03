[根目录](../CLAUDE.md) > **tests**

# Tests模块 - 测试层架构

## 模块职责

负责项目的自动化测试，包括功能测试、性能测试、集成测试和用户界面测试。

## 主要测试文件

### 功能测试
- **test-api-calls.js**: API调用测试
- **test-apikey.js**: API密钥测试
- **login-automation.spec.js**: 登录自动化测试

### 性能测试
- **phase2-test.js**: 阶段2性能测试
- **phase3-performance-test.js**: 阶段3性能测试

### 测试配置
- **test-results/.last-run.json**: 测试结果记录

## 测试框架

### 测试工具
- **Playwright**: 端到端测试和自动化测试
- **自定义测试框架**: 基于Node.js的测试工具
- **性能测试**: 自定义性能测试工具

### 测试类型
- **单元测试**: 测试单个函数和模块
- **集成测试**: 测试模块间的交互
- **端到端测试**: 测试完整的用户流程
- **性能测试**: 测试系统性能和负载

## 测试覆盖

### API测试
- 页面创建API测试
- 页面查看API测试
- 认证API测试
- API密钥测试
- 管理后台API测试

### 用户界面测试
- 登录流程测试
- 页面创建测试
- 管理后台测试
- 响应式设计测试

### 性能测试
- 响应时间测试
- 并发用户测试
- 内存使用测试
- 数据库性能测试

## 对外接口

### 测试运行命令
```bash
# 运行所有测试
npm test

# 运行特定测试
node tests/phase2-test.js
node tests/login-automation.spec.js

# 运行API测试
node tests/test-api-calls.js
node tests/test-apikey.js

# 运行性能测试
node tests/phase3-performance-test.js
```

### 测试配置
```javascript
// 测试配置示例
const testConfig = {
  baseUrl: 'http://localhost:5678',
  timeout: 30000,
  retries: 3,
  headless: true,
  slowMo: 0
};
```

## 关键依赖与配置

### 测试依赖
- **@playwright/test**: 端到端测试框架
- **node-fetch**: HTTP请求测试
- **自定义工具**: 测试辅助函数

### 测试环境
- **开发环境**: 本地测试
- **测试环境**: 集成测试
- **生产环境**: 冒烟测试

### 测试数据
- **测试数据库**: 独立的测试数据库
- **测试用户**: 测试用的用户账户
- **测试页面**: 测试用的页面数据

## 数据模型

### 测试结果
```typescript
interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  timestamp: Date;
  environment: string;
}
```

### 性能指标
```typescript
interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  errorRate: number;
}
```

## 测试策略

### 单元测试
- 测试单个函数的正确性
- 模拟依赖项
- 覆盖边界条件
- 验证错误处理

### 集成测试
- 测试模块间的交互
- 验证数据流
- 测试API端点
- 验证数据库操作

### 端到端测试
- 模拟用户操作
- 测试完整流程
- 验证用户界面
- 测试跨浏览器兼容性

### 性能测试
- 负载测试
- 压力测试
- 耐久性测试
- 容量测试

## 常见问题 (FAQ)

### Q: 如何运行特定测试？
A: 使用node命令直接运行特定的测试文件。

### Q: 测试失败时如何调试？
A: 查看测试日志，使用调试模式，检查测试数据。

### Q: 如何添加新的测试？
A: 创建新的测试文件，遵循现有的测试结构和约定。

### Q: 如何设置测试环境？
A: 使用独立的环境配置和测试数据库。

## 相关文件清单

### 核心文件
- `test-api-calls.js` - API调用测试
- `test-apikey.js` - API密钥测试
- `login-automation.spec.js` - 登录自动化测试
- `phase2-test.js` - 阶段2性能测试
- `phase3-performance-test.js` - 阶段3性能测试

### 配置文件
- `test-results/.last-run.json` - 测试结果记录

### 依赖文件
- `../package.json` - 项目配置
- `../config.js` - 应用配置

## 变更记录 (Changelog)

- **2025-09-03**: 创建tests模块文档（待完善）
- **功能增强**: 添加自动化测试框架
- **性能测试**: 完善性能测试套件
- **测试覆盖**: 提高测试覆盖率