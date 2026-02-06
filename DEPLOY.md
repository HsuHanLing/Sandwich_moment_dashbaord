# 部署指南 (Deployment Guide)

## 一、推送到 GitHub

在项目根目录（Fr. Dashboard 文件夹）打开终端，执行：

```bash
git init
git remote add origin https://github.com/deynnchan-maker/analyticsdashboardfr.git
# 若 origin 已存在：git remote set-url origin https://github.com/deynnchan-maker/analyticsdashboardfr.git

git add .
git commit -m "Analytics Dashboard - initial commit"
git branch -M main
git push -u origin main
```

若提示需要登录，使用 GitHub 用户名 + Personal Access Token（不要用密码）。

---

## 二、在 Vercel 部署（真实 BigQuery 数据）

### 1. 连接 GitHub

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录
2. 点击 **Add New** → **Project**
3. 选择 `deynnchan-maker/analyticsdashboardfr` 仓库
4. 点击 **Import**

### 2. 配置环境变量（必填）

在 **Environment Variables** 中新增：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `GOOGLE_CLOUD_PROJECT` | 你的 GCP 项目 ID | 如 `my-project-123` |
| `BIGQUERY_DATASET` | 数据集名称 | 如 `analytics_233462855` |
| `BIGQUERY_TABLE` | 表名（可用通配符） | 如 `events_*` |

### 3. BigQuery 服务账号认证

1. 打开 [Google Cloud Console](https://console.cloud.google.com/) → IAM → Service Accounts
2. 创建 Service Account，授予角色：`BigQuery Data Viewer`、`BigQuery Job User`
3. 创建 JSON 密钥并下载
4. 在 Vercel 环境变量中新增：
   - **变量名**：`GOOGLE_SERVICE_ACCOUNT`
   - **值**：将整个 JSON 文件内容复制粘贴（整段 JSON，包括 `{ }`）

### 4. 部署

点击 **Deploy**。部署完成后会得到预览和生产 URL。

### 5. 环境变量汇总（真实数据）

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `GOOGLE_CLOUD_PROJECT` | ✅ | GCP 项目 ID |
| `BIGQUERY_DATASET` | ✅ | BigQuery 数据集名 |
| `BIGQUERY_TABLE` | ✅ | BigQuery 表名（如 `events_*`） |
| `GOOGLE_SERVICE_ACCOUNT` | ✅ | Service Account JSON 完整内容 |

**不要**设置 `USE_MOCK_DATA`，留空即使用真实 BigQuery。
