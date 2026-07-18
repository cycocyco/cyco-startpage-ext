# CYCO Startpage — Dark Minimal Theme 设计说明

## 设计哲学

**克制、层次、呼吸感**

- 不追求"炫酷"，追求"舒服"
- 每一个视觉元素都有存在的理由
- 动画是辅助，不是主角

---

## 配色系统

### 暗色模式 (默认)

| 变量 | 值 | 用途 |
|------|-----|------|
| --bg | #0c0d12 | 页面背景，极深的冷灰，带微弱蓝紫底色 |
| --card-bg | rgba(22,24,32,0.75) | 卡片背景，半透明，配合 backdrop-filter |
| --card-bg-solid | #161820 | 需要实色的场景（弹窗、设置面板）|
| --border | rgba(255,255,255,0.06) | 边框，几乎隐形但提供结构感 |
| --border-soft | rgba(255,255,255,0.04) | 更淡的边框，用于输入框等 |
| --text | #e8e9ec | 主文字，高对比但柔和 |
| --text-dim | rgba(232,233,236,0.50) | 次要文字，50%透明度 |
| --accent | #6b8fd4 | 强调色，低饱和冷蓝 |
| --accent-hover | #8aabea | 悬浮时的强调色 |
| --accent-glow | rgba(107,143,212,0.12) | 光晕效果，极淡 |
| --clay | #8a8fa0 | 分类标题等辅助色 |

### 亮色模式

同步调整为更克制的配色，保持一致的视觉语言。

---

## 关键设计细节

### 1. 毛玻璃效果 (backdrop-filter)

所有卡片、弹窗、设置面板都使用 `backdrop-filter: blur()`，让背景隐约透出，增加层次感。

```css
.search-card {
  backdrop-filter: blur(12px);
}
.settings {
  backdrop-filter: blur(20px);
}
```

### 2. 时钟文字渐变

```css
.clock .time {
  background: linear-gradient(180deg, var(--text) 0%, var(--text-dim) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

从实色渐变到半透明，营造微妙的立体感。

### 3. 悬浮光效 (伪元素)

书签卡片悬浮时，有一道从左到右扫过的微光：

```css
.bm::before {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
  transition: left 0.6s ease;
}
.bm:hover::before { left: 100%; }
```

仅 3% 的白色，极其克制，但足以让卡片"活"起来。

### 4. 热搜图片遮罩

```css
.hot-card .himg::after {
  background: linear-gradient(to bottom, transparent 60%, var(--card-bg) 100%);
}
```

图片底部渐变融入卡片背景，避免生硬的截断。

### 5. 动画曲线

统一使用 `cubic-bezier(0.22, 1, 0.36, 1)` —— 快速启动，缓慢收尾，丝滑不拖沓。

---

## 性能保障

| 措施 | 说明 |
|------|------|
| 仅 transform/opacity 动画 | GPU 加速，不触发重排 |
| will-change: transform | 提示浏览器优化 |
| backdrop-filter 适度使用 | 仅在关键卡片使用，避免大面积 |
| prefers-reduced-motion | 尊重用户系统设置 |

---

## 与原版的对比

| 维度 | 原版 | 新版 |
|------|------|------|
| 风格 | 暖棕、复古、厚重 | 冷灰、现代、轻盈 |
| 边框 | 明显、有颜色 | 极淡、几乎隐形 |
| 阴影 | 较重、有方向 | 极 subtle、弥散 |
| 圆角 | 10px | 14px，更柔和 |
| 层次 | 靠颜色和边框 | 靠毛玻璃和微妙光影 |
| 动画 | 0.2s 快速 | 0.25-0.35s 丝滑 |
| 光效 | 无 | 悬浮微光、accent glow |

---

## 使用方式

直接替换项目中的 `newtab.css` 即可。所有选择器保持不变，不修改任何 JavaScript 逻辑。
