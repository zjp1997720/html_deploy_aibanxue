## Codex CLI 中如何配置 MCP 工具（本仓库规范）

本项目使用 JSON 方式配置 MCP 工具：`.mcp/servers.json`。你可以通过命令行参数或环境变量将其加载进 Codex CLI。

---

### 1 放置与加载方式（两选一）

- 启动参数加载（推荐）：

```bash
codex --mcp-config .mcp/servers.json
```

- 环境变量加载（bash）：

```bash
export MCP_SERVERS="$(cat .mcp/servers.json)"
codex
```

> 以上两种任选其一即可；二者都提供同一份 JSON 给 Codex CLI。

### 2 配置文件格式说明

`.mcp/servers.json` 使用如下结构：

```json
{
  "mcpServers": {
    "<别名>": {
      "command": "<可执行文件或 npx>",
      "args": ["<包名或脚本>", "<参数>"],
      "env": { "KEY": "VALUE" },
      "type": "stdio|sse",        // 可选
      "timeout": 60,               // 可选，单位秒
      "disabled": false            // 可选，true 表示临时禁用
    }
  }
}
```

本仓库已为你合并了 `codebuddy_mcp_settings.json` 中的全部 MCP 项：

- thinking（顺序思考）
- firecrawl-mcp（网页抓取，默认禁用）
- playwright-mcp（通过 smithery 运行）
- exa（搜索/检索，smithery）
- context7-mcp（Upstash Context7，smithery）
- mcp-server-chart（SSE 图表服务，默认禁用）
- playwright（本仓库原有 @playwright/mcp 配置）

如需临时停用某一工具，将其 `disabled` 设为 `true` 即可；或直接在文件中删除该条目。

### 3 首次环境准备（Playwright）

首次使用浏览器自动化相关工具需要安装浏览器二进制：

```bash
npx playwright install chromium
```

本仓库默认参数：无头模式（`--headless`）、隔离会话（`--isolated`）、浏览器 `chromium`。

### 4 验证加载

- 命令查看：

```bash
codex mcp list
```

- 交互内快捷：输入 `/mcp servers` 查看已加载的 MCP。

看到上述条目且无报错，即表示加载成功。

### 5 安全提示

- 避免在仓库中提交真实密钥。若已用于测试，请尽快在服务端轮换。
- 推荐在运行 Codex CLI 的终端环境中注入敏感 `env`，或使用 `.env` 搭配外层启动脚本导入；避免把密钥硬编码入版本控制。
- 生产部署建议：`NODE_ENV=production`、按需开启/禁用 MCP，日志中勿打印敏感头部。

---

以上配置已就绪：你可以直接用上面的两种加载方式之一启动 Codex CLI，并在需要时切换/扩展 MCP 条目。
