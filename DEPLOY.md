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
| `BIGQUERY_DATASET` | 数据集名称 | Moment 为 `analytics_474274728` |
| `BIGQUERY_TABLE` | 表名（可用通配符） | 如 `events_*` |
| `REVENUECAT_API_KEY` | RevenueCat Secret API Key | 需含 `charts_metrics:charts:read` |
| `REVENUECAT_PROJECT_ID` | RevenueCat 项目 ID | Moment 为 `41c7a8a1` |
| `MOMENT_REVENUECAT_APP_IDS` | 正式 App ID，以逗号分隔 | `appebb7e6d670,app7c2744eaa5` |
| `MOMENT_REPORT_TIME_ZONE` | GA4 资源实际报表时区 | 未设置会显示 UTC 假设提示；不能随意猜测 |

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
| `REVENUECAT_API_KEY` | ✅（订阅收入） | RevenueCat Secret API Key |
| `REVENUECAT_PROJECT_ID` | ✅（订阅收入） | RevenueCat 项目 ID |

正式环境保持 `MOMENT_DEMO=false`，不要启用示范数据。

优先读取已验证交易明细。未接入该明细时，收入和 ARPU 可使用 RevenueCat Charts 的正式内购收入（订阅＋一次性购买，排除广告，USD）；页面标明来源及退款按记账日扣除的口径。Charts 使用 UTC，仅当报表为 UTC 时使用此来源。今日数据保留并标为暂定，不会因 incomplete 而整天消失。

独立 `/api/moment/billing` 会读取完整顾客／交易／订阅明细并逐日与图表对账，恢复按 RC 顾客 ID 去重的 ARPPU、付款人数、初购／续订联集与产品统计。首次可能需要约两分钟，GA4 和收入可先显示。开启 Vercel Fluid compute，路由 `maxDuration=300`；读取限流、30 分钟快照缓存，最多 500 顾客。更多顾客应使用定时交易导出。版本筛选缺少购买时版本时，明细显示不可用，绝不套用 last_seen_app_version。

RC 匿名顾客与 App 安装／帐号尚未映射时，跨来源付费率、订阅比例和充值路径仍待接入。交易次数不能代替人数；旧 RC LTV/ARPPU 图表也不能代替本期收入／本期付费人数。缺少来源显示 `—`，不会填零。

若要读取交易与产品明细，金钥还需相应唯读权限：`customer_information:customers:read`、`customer_information:purchases:read`、`customer_information:subscriptions:read`、`project_configuration:products:read`。这些权限与 `charts_metrics:charts:read` 不同。完整接入与覆盖日期说明见 [analytics integration](docs/analytics-integration.md)。

### 6. 访问密钥（可选但推荐）

| 变量名 | 说明 |
|--------|------|
| `DASHBOARD_PASSWORD` | 访问密钥。设置后，用户需输入此密钥才能进入看板。不设置则无需登录。 |
