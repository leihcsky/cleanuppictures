非常好，这一步已经是**「可以直接交给开发落地」**的阶段了。
下面我会给你一份 **完整、可执行的《Shadow Reduction Tool》PRD + 对应 SEO 文案**，**严格不涉及 AI、不虚假承诺**，并且**和浏览器端能力完全对齐**。

> ✅ 你可以直接把这份 PRD 扔给前端 / 全栈
> ✅ SEO 文案可直接用作英文工具页
> ✅ 不会因为“承诺过度”导致高跳出率

---

# 一、产品定位说明（给产品 / 开发 / SEO 共用）

## 产品名称（内部）

**Shadow Reduction Tool**

## 面向用户的一句话价值主张

> **Reduce harsh shadows and improve lighting in photos directly in your browser.**

## 核心定位（非常重要）

> **这是一个「Shadow Reduction / Shadow Enhancement」工具，而不是 Shadow Removal。**

* ❌ 不承诺“完全去除”
* ✅ 承诺“减弱、平衡、改善阴影区域”

---

# 二、目标用户 & 使用场景

## 目标用户

* 普通用户（非设计师）
* 不会 / 不想用 Photoshop
* 想快速“修一下照片阴影”的人

## 核心使用场景

* 📸 日常拍照：光线不均、暗部太重
* 🧑 人像：脸部、眼窝阴影过重
* 📦 产品图：桌面阴影、侧面暗区
* 🌄 风景照：局部暗影影响观感

---

# 三、功能范围定义（Scope）

## V1 必须实现（MVP）

* 图片上传
* 阴影减弱处理
* 强度调节
* 前后对比
* 下载结果

## 明确不做（V1）

* ❌ 阴影自动语义检测
* ❌ 内容重建
* ❌ 区域级智能分割
* ❌ 批量处理

---

# 四、功能需求清单（PRD 核心）

---

## 1️⃣ Image Upload Module（图片上传）

### 功能需求

* 支持格式：

  * JPG / JPEG
  * PNG
  * WEBP
* 上传方式：

  * 点击上传
  * 拖拽上传
* 最大文件：

  * 5MB（可配置）

### 交互要求

* 上传完成后自动进入处理界面
* 不需要用户额外点击确认

### UI 文案（英文）

> Upload a photo to reduce shadows and improve lighting.

---

## 2️⃣ Shadow Reduction Processing（阴影减弱处理核心）

### 技术实现建议（非强制）

* Canvas API / WebGL
* 颜色空间转换（RGB → LAB / HSL）
* 阴影判断：

  * 亮度低于阈值的像素区域
* 处理方式：

  * 提升暗区亮度
  * 降低局部对比
  * 轻微饱和度补偿

> ⚠️ 这是增强算法，不是检测算法

---

## 3️⃣ Control Panel（控制面板）

### 3.1 Shadow Reduction Strength（核心）

* Slider 控件
* 数值范围：

  * 0 – 100
* 默认值：

  * 50（自然）

#### 文案

> Shadow Reduction Strength

---

### 3.2 Optional Controls（可选，推荐）

* Brightness Boost（+ / -）
* Contrast Balance（+ / -）

> ⚠️ 可隐藏在 “Advanced” 下，避免复杂化

---

## 4️⃣ Preview Module（预览与对比）

### 必备功能

* Before / After 切换
* 实时预览（调整 slider 即更新）
* Reset 按钮

### 推荐增强

* Hover 显示原图（非必须）

---

## 5️⃣ Export & Download（导出）

### 输出格式

* JPG（默认）
* PNG

### 导出规则

* 保留原分辨率
* 不加水印
* 不强制登录

### CTA 文案

> Download Photo

---

## 6️⃣ Error Handling（异常处理）

### 错误场景

* 不支持格式
* 文件过大
* 处理失败

### 提示文案示例

> This image format is not supported.
> Please upload a JPG, PNG, or WEBP image.

---

## 7️⃣ 性能 & 安全

* 单次处理：1 张图片
* 浏览器端处理
* 不上传服务器（如属实）
* 图片不长期存储

---

# 五、页面 SEO 文案（英文，可直接用）

---

## Title

```
Reduce Shadow in Photo Online – Free Shadow Reduction Tool
```

## Meta Description

```
Reduce harsh shadows and improve lighting in your photos online.
No Photoshop required. Adjust shadow strength and download instantly.
```

---

## H1

**Reduce Shadow in Photo Online**

---

## Hero 区文案

> Reduce harsh shadows and balance lighting in your photos directly in your browser.
> No installation. No complex editing.

---

## H2 – How to Reduce Shadows in a Photo

内容要点：

1. Upload your photo
2. Adjust the shadow reduction strength
3. Preview the result and download

---

## H2 – What This Tool Does

* Reduces harsh shadows
* Improves uneven lighting
* Enhances dark areas naturally
* Keeps original image details

> ⚠️ 明确“不承诺完全去除”

---

## H2 – When to Use Shadow Reduction

* Face shadows in portraits
* Uneven lighting in photos
* Dark product images
* Overexposed light-and-shadow contrast

---

## H2 – Supported Image Formats

* JPG / JPEG
* PNG
* WEBP

---

## H2 – FAQ（极其重要）

### Q1: What is shadow reduction?

> Shadow reduction helps soften dark areas and balance lighting, making photos look more natural.

### Q2: Is this the same as removing shadows?

> No. This tool reduces the intensity of shadows but does not fully remove them.

### Q3: Do I need Photoshop?

> No. Everything works directly in your browser.

### Q4: Are my photos stored?

> Photos are processed locally and are not permanently stored.

---

## 语义关键词自然覆盖

* reduce shadow in photo
* shadow reduction tool
* fix lighting in photo
* reduce dark areas in image
* improve photo lighting online

---

# 六、SEO & 产品一致性说明（非常关键）

这套方案的最大价值在于：

* 🔹 **能力 = 承诺**
* 🔹 SERP 不硬刚 AI
* 🔹 跳出率可控
* 🔹 可作为未来 AI 升级的“前身页面”

未来你只需：

* 换处理内核
* 升级文案
* URL 不变

---
