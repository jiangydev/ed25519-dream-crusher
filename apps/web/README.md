# Ed25519 Dream Crusher - Web 版

## 🚀 快速开始

### 安装依赖

```bash
# 安装 pnpm（如果还没有）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 开发

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建

```bash
pnpm build
```

构建产物将输出到 `apps/web/out` 目录。

## 🌐 部署到 Cloudflare Pages

### 方式一：通过 Cloudflare Git 集成

1. 将代码推送到 GitHub
2. 在 Cloudflare Dashboard 中创建新的 Pages 项目
3. 连接你的 GitHub 仓库
4. 配置构建设置：
   - **构建命令**: `pnpm --filter web build`
   - **构建输出目录**: `apps/web/out`
5. 点击 "Save and Deploy"

### 方式二：通过 Wrangler CLI 部署

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 构建项目
pnpm build

# 部署
wrangler pages deploy apps/web/out --project-name=ed25519-dream-crusher
```

### 方式三：手动上传

1. 构建项目：`pnpm build`
2. 在 Cloudflare Dashboard 中创建新的 Pages 项目
3. 选择 "Upload Assets"
4. 上传 `apps/web/out` 目录中的所有文件

## 📦 项目结构

```
apps/web/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 主页面
│   └── globals.css        # 全局样式
├── components/
│   └── ui/                # shadcn/ui 组件
├── lib/
│   ├── pollard-rho.ts     # Pollard's Rho 算法核心
│   ├── storage.ts         # localStorage 持久化
│   ├── share.ts           # 分享链接
│   └── utils.ts           # 工具函数
├── hooks/
│   └── usePollardRho.ts   # 算法执行 Hook（分片执行）
└── public/                # 静态资源
```

## 🛠️ 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI 组件**: shadcn/ui
- **椭圆曲线**: @noble/curves (Ed25519)
- **压缩**: pako (gzip)
- **状态管理**: React Hooks

## ⚠️ 免责声明

本项目仅供娱乐和教育用途。Ed25519 在经典计算机上目前是安全的。请勿用于任何非法行为。

## 📄 许可证

MIT License
