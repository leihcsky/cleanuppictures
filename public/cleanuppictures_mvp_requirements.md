# CleanupPictures.org — MVP 需求说明书

## 一、项目定位（Positioning）

### 1. 产品一句话定位
**CleanupPictures.org 是一个面向普通用户的在线图片清理工具站，帮助用户一键移除图片中不需要的元素（阴影、表情符号、颜色等），无需设计经验。**

### 2. 目标用户
- 普通互联网用户（非设计师）
- 社交媒体用户（截图、表情包、转发图片）
- 学生 / 办公用户
- 内容创作者（博客、社媒）

### 3. 核心使用场景
- 图片中有阴影影响可读性
- 图片被表情 / emoji 遮挡
- 想移除图片中的某种颜色用于二次编辑

### 4. MVP 阶段目标
- 覆盖 3 个低 KD、强需求关键词
- 验证搜索流量 + 用户使用行为
- 为后续订阅 / AI 能力升级打基础

---

## 二、关键词与工具对应关系（MVP 核心）

| 工具功能 | 主关键词 | URL |
|--------|--------|----|
| 移除阴影 | remove shadow from photo | /remove-shadow/ |
| 移除表情 | remove emoji from image | /remove-emoji/ |
| 移除颜色 | remove color from image | /remove-color/ |

首页覆盖泛词：
- cleanup pictures
- clean up images online

---

## 三、网站整体结构（Information Architecture）

```text
/
├─ /remove-shadow/
├─ /remove-emoji/
├─ /remove-color/
├─ /about/
├─ /privacy-policy/
└─ /terms/
```

说明：
- 首页 = 功能入口 + SEO 泛词页
- 工具页 = 核心落地页（SEO + 转化）
- 不设置 blog（MVP 阶段避免稀释权重）

---

## 四、首页设计与内容规划（Homepage）

### 1. 首页核心职责
- 承接「cleanup pictures」泛搜索
- 解释网站能做什么
- 将用户导向具体工具页

### 2. 首页内容结构

#### Hero 区
- H1: Cleanup Pictures Online
- 副标题：Remove shadows, emojis, and unwanted colors from images in seconds.
- 主 CTA：Start Cleaning Your Picture

#### Tools 区
- 三个工具卡片
  - Remove Shadow from Photo
  - Remove Emoji from Image
  - Remove Color from Image

#### Why 区
- No signup required
- Free to use
- Runs in browser

#### FAQ 区（SEO）
- What does cleanup pictures mean?
- Is it free?
- Are images uploaded to server?

---

## 五、工具页通用结构（Tool Page Template）

适用于：
- /remove-shadow/
- /remove-emoji/
- /remove-color/

### 1. 页面核心职责
- 精准匹配搜索意图
- 提供直接可用工具
- 承载全部 SEO 内容

### 2. 页面结构

#### H1
- Remove Shadow from Photo Online

#### Tool 操作区
- 上传图片（拖拽 / 点击）
- 操作按钮（Remove / Clean / Process）
- 结果预览（Before / After）
- 下载按钮

#### 功能说明区
- What this tool does
- Supported image formats
- Use cases

#### 使用步骤
1. Upload image
2. Click button
3. Download result

#### FAQ（强烈建议）
- Is this tool free?
- Does it work on mobile?
- Is my image stored?

---

## 六、MVP 阶段功能清单（Functional Scope）

### 1. 通用功能
- 图片上传（jpg / png / webp）
- 图片预览
- 图片下载
- 移动端适配
- 基础错误提示

### 2. 工具功能（按关键词）

#### Remove Shadow
- 基础阴影淡化 / 移除
- 单一算法即可（MVP）

#### Remove Emoji
- 针对明显遮挡区域
- 支持简单修复

#### Remove Color
- 选择颜色（吸管 / 预设）
- 移除为透明或白色

---

## 七、技术实现建议（MVP）

### 1. 前端
- HTML / CSS / JavaScript
- Canvas API
- 本地处理优先（降低成本）

### 2. 算法来源（MVP 可行方案）
- OpenCV.js（基础图像处理）
- 简单颜色阈值 / mask
- 后期可升级 AI（如 SAM / diffusion）

### 3. 服务端（可选）
- MVP 阶段可无后端
- 若使用 AI：Node / Python API

---

## 八、SEO 策略（MVP）

### 1. 页面策略
- 1 工具 = 1 页面
- 明确 URL / Title / H1
- 首页不抢工具页关键词

### 2. 外链策略
- 初期只做工具页外链
- 首页自然承接

### 3. 内容策略
- 工具页 > 首页
- 不做博客，避免稀释

---

## 九、后续扩展预留（非 MVP）

- 批量处理
- 高清导出
- 历史记录
- 账号系统
- 订阅付费
- 更多 cleanup 工具

---

## 十、MVP 成功判断标准

- 页面被 Google 收录
- 有自然搜索曝光
- 用户完成上传 → 下载闭环
- 明确哪个工具最有潜力

---

**文档版本**：v1.0  
**适用阶段**：MVP / SEO 验证期
