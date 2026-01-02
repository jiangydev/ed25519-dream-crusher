# Ed25519 梦碎机

[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **使用 Pollard's Rho 算法演示 Ed25519 曲线 ECDLP 求解的娱乐项目**

> **[English](README.md)**

---

## ⚠️ 免责声明

**本脚本仅供娱乐和教育目的。**

在经典计算机上攻破 Ed25519 在计算上是不可行的。群阶约为 2^252，即使使用 Pollard's Rho 算法（时间复杂度为 O(√n)），也需要大约 2^126 次操作。以目前的计算速度，这将比宇宙的年龄还要长。

**请勿将本脚本用于任何非法活动。Ed25519 在经典计算机上仍然是安全的。**

---

## 项目简介

本项目实现了使用 Pollard's Rho 算法求解 Ed25519 椭圆曲线离散对数问题（ECDLP）。它旨在：

- 教育演示 Pollard's Rho 算法的工作原理
- 直观展示指数级复杂度的规模
- 幽默地提醒人们为什么椭圆曲线密码学是安全的
- 以有趣的方式让人体会密码学的安全性

### 现实情况

```
理论复杂度：约 2^126 次椭圆曲线操作
当前硬件估算时间：约 10^30 年
宇宙年龄：约 1.38 × 10^10 年
成功概率：≈ 0
```

---

## 安装

### 环境要求

- Python 3.12 或更高版本
- ecdsa 库 (>= 0.19.1)

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/jiangydev/ed25519-dream-crusher.git
cd ed25519-dream-crusher

# 创建虚拟环境（推荐）
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

---

## 使用方法

### 基本用法

```bash
python pollard_rho_ed25519_fun.py --public-key <公钥的十六进制>
```

### 使用示例

```bash
# 带 0x 前缀
python pollard_rho_ed25519_fun.py --public-key 0x1234abcd...5678ef

# 不带 0x 前缀
python pollard_rho_ed25519_fun.py --public-key 1234abcd...5678ef

# 设置迭代上限
python pollard_rho_ed25519_fun.py --public-key 1234abcd...5678ef --max-iterations 1000000

# 自定义日志间隔
python pollard_rho_ed25519_fun.py --public-key 1234abcd...5678ef --log-interval 50000
```

### 命令行参数

| 参数 | 简写 | 必需 | 说明 |
|------|------|------|------|
| `--public-key` | `-p` | 是 | Ed25519 公钥的十六进制格式（64个十六进制字符） |
| `--max-iterations` | | 否 | 尝试的最大迭代次数（默认：无限制） |
| `--log-interval` | | 否 | 每N次迭代打印进度（默认：100000） |

---

## 算法原理

### Pollard's Rho 算法

该算法在椭圆曲线群上进行伪随机游走，跟踪以下形式的点：

```
P = alpha * G + beta * Q
```

其中：
- `G` 是基点（生成元）
- `Q` 是目标公钥（Q = k * G）
- `alpha` 和 `beta` 是被跟踪的系数
- `k` 是我们要找的私钥

### Floyd 循环检测

脚本使用"龟兔赛跑"方法：
- 龟每次移动1步
- 兔每次移动2步
- 当它们碰撞时，我们可以求解私钥

### 求解 k

当发现碰撞时：

```
alpha_t * G + beta_t * Q = alpha_h * G + beta_h * Q
(alpha_t - alpha_h) * G = (beta_h - beta_t) * k * G
k = (alpha_t - alpha_h) * inverse(beta_h - beta_t) mod n
```

---

## 项目结构

```
ed25519-dream-crusher/
├── pollard_rho_ed25519_fun.py   # 主程序实现
├── requirements.txt              # Python 依赖
├── doc/
│   └── REQUIREMENTS.md           # 项目需求文档
├── README.md                     # 英文文档
└── README.zh-CN.md              # 本文件
```

---

## 示例输出

```
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
  █                                                           █
  █         Pollard's Rho ECDLP Solver for Ed25519            █
  █            (Entertainment Edition / 仅供娱乐)              █
  █                                                           █
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█

  ╔══════════════════════════════════════════════════════════════════════╗
  ║  免责声明：本脚本仅供娱乐用途。                                      ║
  ║  请勿将其用于任何非法活动。                                         ║
  ║  Ed25519 目前在传统计算机上运行安全。                               ║
  ╚══════════════════════════════════════════════════════════════════════╝

  ──────────────────────────────────────────────────────────────────────
  迭代次数：100,000
  速度：约 50,000 ops/sec
  进度：1.234567890123456e-35%
  预计剩余时间：3.45 × 10^28 年（比宇宙年龄还长！）
  状态：🐢 龟龟和 🐇 兔兔还在散步... 目前还没撞上！
  ──────────────────────────────────────────────────────────────────────
```

---

## 技术细节

### Ed25519 曲线参数

- **曲线方程**：-x^2 + y^2 = 1 - 121665/121666 * x^2 * y^2 (在 GF(p) 上)
- **域模数 (p)**：2^255 - 19
- **群阶 (n)**：约 2^252
- **基点 (G)**：标准 Ed25519 生成元

### 算法复杂度

- **时间复杂度**：O(√n) ≈ 2^126 次操作
- **空间复杂度**：O(1)
- **预期迭代次数**：约 √(π * n / 2)

---

## 依赖库

- **ecdsa** (>= 0.19.1)：Python 椭圆曲线密码学库
  - 提供 Ed25519 曲线实现
  - 点运算（加法、乘法）
  - 模逆运算

---

## 教育价值

本脚本展示了：

1. **Pollard's Rho 算法的工作原理** - 理解随机游走和碰撞检测
2. **椭圆曲线密码学为何安全** - 亲眼目睹不切实际的时间需求
3. **密钥长度的重要性** - 256位曲线提供巨大的安全边界
4. **算法设计原理** - 龟兔循环检测、分区函数

---

## 许可证

MIT License - 欢迎用于教育目的。

---

## 贡献

这是一个教育/演示项目。欢迎提交：

- Bug 修复
- 文档改进
- 其他教育功能

---

## 致谢

- **ecdsa** 库维护者提供了优秀的椭圆曲线实现
- John Pollard 发明了 Rho 算法
- Ed25519 设计团队（Bernstein 等）

---

*记住：这只是娱乐！Ed25519 是安全的。别期待能找到任何私钥。😄*
