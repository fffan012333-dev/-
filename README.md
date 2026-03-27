# 代发 OI 计算器

这是当前可本地使用、也可部署到 Vercel 的静态版本。

## 当前能力

- 正式测算支持多列对比
- 每列可切换 `现成组套 / 特殊组套`
- 现成组套可自动带出 `单品 COGS / 单品仓物`
- `COGS 检索` 同时覆盖单品 COGS 和现成组套 COGS
- `仓物检索` 覆盖现成组套仓物
- `公司价盘规划` 可单独查询 `C / B / A / S / SS` 五档价格
- `COGS` 和 `仓物` 支持数字与公式输入

## 核心口径

```text
单品结算价 = 单品到手价 × (1 - 前台折价%) × (1 - 后台折价%)
总计结算价 = 单品结算价 × 预计销量
总计除税收入 = 单品除税收入 × 预计销量
总计COGS = 单品COGS × 预计销量
总计仓物 = 单品仓物 × 预计销量
总履约成本 = 总计COGS + 总计仓物
```

## 关键文件

- `index.html`: 页面结构
- `styles.css`: 页面样式
- `app.js`: 交互与计算逻辑
- `data/ready-made-data.js`: 现成组套数据
- `data/product-cogs-data.js`: 单品 COGS 数据
- `data/price-plan-data.js`: 公司价盘规划数据
- `vercel.json`: Vercel 部署配置与缓存策略

## 本地打开

直接打开 `index.html` 即可。

如果本地文件模式有限制，也可以运行：

```bash
cd /Users/chaofan/Desktop/codex/OI计算器
python3 -m http.server 8080
```

然后访问 <http://localhost:8080>。

## 在线部署到 Vercel

最稳妥的方式是把这个文件夹放进一个 Git 仓库，然后导入 Vercel。

### 推荐流程

1. 把 `/Users/chaofan/Desktop/codex/OI计算器` 放到 GitHub 仓库
2. 登录 Vercel
3. 选择 `Add New Project`
4. 导入这个仓库
5. Root Directory 选择 `OI计算器`
6. 保持静态站点默认设置，直接部署

### 后续维护

- 你更新这个文件夹里的页面或数据文件后
- 再推送到仓库
- Vercel 会自动重新部署
- 生产链接刷新后就是最新版本

### 为什么这版适合长期维护

- `vercel.json` 已经加了缓存控制，尽量避免刷新后还看到旧数据
- 数据源被拆成独立文件，后续更新 `ready-made-data.js`、`product-cogs-data.js`、`price-plan-data.js` 时，不需要重写主逻辑
