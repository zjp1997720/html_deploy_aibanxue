[根目录](../CLAUDE.md) > **views**

# Views模块 - 视图层架构

## 模块职责

负责用户界面的模板和组件，使用EJS模板引擎构建现代化的响应式Web界面。

## 入口与启动

### 主要目录结构
- **layouts/**: 布局模板
- **partials/**: 可重用组件
- **admin/**: 管理后台模板
- **根模板**: 主要页面模板

### 模板配置
```javascript
// 在app.js中配置
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
```

## 主要模板文件

### 布局模板
- **layout.ejs**: 基础布局模板
- **layouts/modern.ejs**: 现代化布局
- **layouts/admin.ejs**: 管理后台布局
- **layouts/admin-modern.ejs**: 现代化管理布局

### 页面模板
- **index.ejs**: 首页模板
- **index-modern.ejs**: 现代化首页
- **login.ejs**: 登录页面
- **login-modern.ejs**: 现代化登录页面
- **dashboard.ejs**: 管理面板
- **dashboard-modern.ejs**: 现代化管理面板
- **password.ejs**: 密码验证页面
- **error.ejs**: 错误页面

### 管理后台模板
- **admin/pages.ejs**: 页面管理
- **admin/apikeys.ejs**: API密钥管理

### 组件模板
- **partials/header.ejs**: 页头组件
- **partials/footer.ejs**: 页脚组件

## 对外接口

### 模板渲染接口
```javascript
// 在路由中使用
res.render('template-name', {
  title: '页面标题',
  layout: 'layout-name',
  data: {} // 传递给模板的数据
});
```

### 公共组件
- **导航栏**: 响应式导航组件
- **侧边栏**: 管理后台侧边栏
- **表格**: 数据表格组件
- **表单**: 输入表单组件
- **模态框**: 弹窗组件

## 关键依赖与配置

### EJS配置
- **模板引擎**: EJS 3.1.10
- **模板目录**: ./views
- **布局支持**: 支持布局继承
- **组件复用**: 支持部分模板

### 样式依赖
- **CSS框架**: 自定义CSS框架
- **响应式设计**: 移动端适配
- **主题系统**: 支持主题切换
- **动画效果**: CSS3动画

### JavaScript依赖
- **交互库**: 原生JavaScript
- **图表库**: Mermaid.js
- **图标库**: Font Awesome
- **工具库**: 自定义工具函数

## 数据模型

### 模板上下文
```typescript
interface TemplateContext {
  title: string;           // 页面标题
  layout?: string;         // 布局模板
  currentPath?: string;    // 当前路径
  user?: User;            // 用户信息
  pages?: Page[];         // 页面数据
  stats?: Stats;          // 统计数据
  formatDate?: Function;  // 日期格式化函数
  // 其他自定义数据
}
```

### 组件数据
```typescript
interface ComponentData {
  id: string;             // 组件ID
  type: string;           // 组件类型
  props: object;          // 组件属性
  children?: ComponentData[]; // 子组件
}
```

## 测试与质量

### 模板测试
- 渲染准确性测试
- 数据绑定测试
- 条件渲染测试
- 循环渲染测试

### 样式测试
- 响应式测试
- 主题切换测试
- 浏览器兼容性测试
- 性能测试

### 交互测试
- 用户操作测试
- 表单验证测试
- 动画效果测试
- 可访问性测试

## 常见问题 (FAQ)

### Q: 如何添加新的页面模板？
A: 在views目录下创建新的.ejs文件，然后在路由中调用res.render()。

### Q: 如何修改布局？
A: 修改layouts目录下的对应模板文件，或创建新的布局模板。

### Q: 如何使用组件？
A: 使用<%- include('partials/component-name') %>语法包含组件模板。

### Q: 如何添加样式？
A: 在public/css目录下添加样式文件，然后在模板中引用。

## 相关文件清单

### 核心文件
- `layout.ejs` - 基础布局
- `index-modern.ejs` - 现代化首页
- `login-modern.ejs` - 现代化登录页
- `dashboard-modern.ejs` - 现代化管理面板

### 目录结构
- `layouts/` - 布局模板
- `partials/` - 组件模板
- `admin/` - 管理后台模板

### 依赖文件
- `../public/css/` - 样式文件
- `../public/js/` - JavaScript文件
- `../app.js` - 主应用文件

## 变更记录 (Changelog)

- **2025-09-03**: 创建views模块文档（待完善）
- **功能增强**: 添加现代化UI模板
- **响应式设计**: 改进移动端体验
- **主题系统**: 支持主题切换功能