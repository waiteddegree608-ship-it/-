# 接口文档 (API Documentation)

Base URL: `http://localhost:3000/api`

## 关键词管理 (Keywords)

### `GET /api/keywords`
获取所有关键词。
- **Response**: `Keyword[]`

### `POST /api/keywords`
添加新关键词。
- **Body**: `{ "word": "string", "scope": "string (optional)" }`
- **Response**: `Keyword`

### `DELETE /api/keywords/:id`
删除指定关键词及其关联的热点数据。
- **Response**: `{ "success": true }`

### `PUT /api/keywords/:id/toggle`
切换关键词的启用/禁用状态。
- **Response**: `Keyword (updated)`

---

## 热点新闻 (Hotspots)

### `GET /api/hotspots`
获取所有热点新闻（按时间倒序排列）。
- **Response**: `Hotspot[]` (包含关联的 `keyword` 对象)

---

## 预警任务管理 (Alert Tasks)

### `GET /api/alerts/tasks`
获取所有预警任务。
- **Response**: `AlertTask[]` (包含 `records` 计数)

### `POST /api/alerts/tasks`
创建新的预警任务。
- **Body**: 
  ```json
  {
    "keyword": "string",
    "intervalHours": "number",
    "platforms": ["string"],
    "notifyMethod": "webhook | email",
    "webhookUrl": "string (optional)",
    "email": "string (optional)"
  }
  ```
- **Response**: `AlertTask`

### `DELETE /api/alerts/tasks/:id`
删除预警任务。
- **Response**: `{ "success": true }`

### `PUT /api/alerts/tasks/:id/toggle`
切换预警任务状态（启用/禁用）。
- **Response**: `AlertTask (updated)`

### `PUT /api/alerts/tasks/:id`
更新预警任务配置。
- **Body**: 同 `POST /api/alerts/tasks` (省略 `keyword`)
- **Response**: `AlertTask (updated)`

---

## 预警记录 (Alert Records)

### `GET /api/alerts/records`
获取最近 500 条预警记录。
- **Response**: `AlertRecord[]` (包含关联的 `task` 对象)

---

## 系统设置 (Settings)

### `GET /api/settings`
获取当前系统配置。
- **Response**: `Config` 对象 (读取自环境变量和默认值)

### `POST /api/settings`
更新系统配置（写入 `.env` 文件，重启生效）。
- **Body**:
  ```json
  {
    "cron": { "schedule": "string" },
    "smtp": { "host": "string", "port": 465, "secure": true, "user": "string", "pass": "string" },
    "defaults": { "webhookUrl": "string", "email": "string", "alertInterval": 1, "notifyMethod": "webhook", "platforms": ["string"] }
  }
  ```
- **Response**: `{ "success": true, "message": "Restart required for changes to take effect." }`

---

## 系统控制 (System)

### `POST /api/trigger`
手动触发全网热点扫描和预警扫描。后台异步执行。
- **Response**: `{ "success": true, "message": "Scan started in background" }`

### `POST /api/push`
（主要供内部/第三方机器人调用）将未通知的 `isReal=true` 热点标记为已通知，并返回这些热点。
- **Response**: `{ "alerts": Hotspot[] }`

---

## 数据导出 (Data Export)

除 `dev.db` 核心数据库外，每次 API 或定时任务完成热点扫描时，系统都会自动在根目录 `data/` 下按模块与时间戳归档 JSON 格式数据备份：
- **词云数据**：存储于 `data/wordclouds/`，包含特定关键词下经过 AI 分析后的纯词组及权重。
- **热点新闻池数据**：存储于 `data/hotspots/`，包含完整的新闻标题、AI 摘要、网址与置信度。
- **独立预警任务记录**：存储于 `data/alerts/`，记录每次触发自定义警报任务时产生的高危信息包。
