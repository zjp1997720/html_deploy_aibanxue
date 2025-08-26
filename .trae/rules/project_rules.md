# 代码规范指南

## 📝 文件命名规范

- 文件名使用 kebab-case：`user-controller.js`
- 目录名使用 kebab-case：`models/`, `routes/`
- 配置文件使用 camelCase：`config.js`

## 🔤 变量命名规范

```javascript
// 变量和函数使用 camelCase
const userName = 'John';
const getUserById = (id) => { ... };

// 常量使用 UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// 类名使用 PascalCase
class UserController { ... }
```

## 📁 项目结构规范

- **models/** - 数据模型和数据库操作
- **routes/** - API路由定义
- **middleware/** - 中间件函数
- **utils/** - 工具函数
- **views/** - EJS模板文件
- **public/** - 静态资源文件
- **scripts/** - 脚本文件

## 🔧 Express.js 最佳实践

### 路由定义
```javascript
// 使用 express.Router()
const router = express.Router();

// RESTful API 设计
router.get('/api/users', getUsersController);
router.get('/api/users/:id', getUserByIdController);
router.post('/api/users', createUserController);
router.put('/api/users/:id', updateUserController);
router.delete('/api/users/:id', deleteUserController);
```

### 错误处理
```javascript
// 统一错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 异步函数错误处理
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

### 环境变量使用
```javascript
// 使用 process.env 读取环境变量
const port = process.env.PORT || 3000;
const dbPath = process.env.DB_PATH || './db/default.db';

// 在 config.js 中集中管理配置
module.exports = {
  port: process.env.PORT || 3000,
  database: {
    path: process.env.DB_PATH || './db/html-go.db'
  }
};
```

## 🗄️ 数据库操作规范

### SQLite 查询
```javascript
// 使用参数化查询防止SQL注入
const query = 'SELECT * FROM users WHERE id = ?';
db.get(query, [userId], (err, row) => { ... });

// 错误处理
db.run(query, params, function(err) {
  if (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
  // 处理成功情况
});
```

## 🎨 前端资源规范

### CSS 文件组织
- 全局样式：`public/css/styles.css`
- 页面特定样式：`public/css/page-name.css`
- 组件样式：内联在相应的EJS模板中

### JavaScript 文件组织
- 全局脚本：`public/js/main.js`
- 功能模块：`public/js/feature-name.js`
- 配置文件：`public/js/config.js`

## 🔒 安全最佳实践

```javascript
// 密码处理
const crypto = require('crypto');
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// 输入验证
const validateInput = (input) => {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input');
  }
  return input.trim();
};

// CORS 配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
```

## 📝 注释和文档

```javascript
/**
 * 创建新页面
 * @param {Object} pageData - 页面数据
 * @param {string} pageData.content - 页面内容
 * @param {boolean} pageData.isProtected - 是否受密码保护
 * @returns {Promise<Object>} 创建的页面对象
 */
const createPage = async (pageData) => {
  // 实现代码
};
```

