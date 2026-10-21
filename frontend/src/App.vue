<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ProfileCard from './components/ProfileCard.vue'
import PhotoCarousel from './components/PhotoCarousel.vue'
import ProfileEditor from './components/ProfileEditor.vue'
import PhotoManager from './components/PhotoManager.vue'
import IntroAssistant from './components/IntroAssistant.vue'
import MessageBoard from './components/MessageBoard.vue'
import ProjectShowcase from './components/ProjectShowcase.vue'

const editing = ref(false)
const hasUnsavedChanges = ref(false)
const managingPhotos = ref(false)

function togglePhotos() {
  managingPhotos.value = !managingPhotos.value
}

function toggleEditing() {
  if (
    editing.value &&
    hasUnsavedChanges.value &&
    !window.confirm('资料尚未保存，确定放弃修改并返回主页吗？')
  ) {
    return
  }

  hasUnsavedChanges.value = false
  editing.value = !editing.value
}
const profileVersion = ref(0)

function handleSaved() {
  profileVersion.value += 1
}

interface LifePhoto {
  src: string
  title: string
}

const lifePhotos = ref<LifePhoto[]>([])
const lifeLoading = ref(true)
const lifeError = ref('')

async function loadLifePhotos() {
  lifeLoading.value = true
  lifeError.value = ''

  try {
    const response = await fetch('/api/photos', {
      cache: 'no-store',
    })

    if (!response.ok) throw new Error('读取照片失败')

    const data: unknown = await response.json()

    if (
      !Array.isArray(data) ||
      !data.every((photo) =>
        photo !== null &&
        typeof photo === 'object' &&
        typeof photo.src === 'string' &&
        typeof photo.title === 'string'
      )
    ) {
      throw new Error('照片格式不正确')
    }

    lifePhotos.value = data.slice(0, 4)
  } catch {
    lifeError.value = '暂时无法加载照片，请稍后刷新。'
  } finally {
    lifeLoading.value = false
  }
}

onMounted(loadLifePhotos)

// 退出照片管理后，更新照片墙
watch(managingPhotos, (current, previous) => {
  if (previous && !current) {
    loadLifePhotos()
  }
})
</script>

<template>
  <div id="page-top" class="portfolio">
    <header class="site-header">
      <img
  class="header-banner"
  src="/illustrations/header-campus.png"
  alt=""
  aria-hidden="true"
  fetchpriority="high"
>
      <div class="header-inner">
        <div class="brand">
          <span class="brand-mark">绥之</span>
          <span>我的个人空间</span>
        </div>

        <nav
          v-if="!editing && !managingPhotos"
          class="navigation"
          aria-label="主页导航"
        >
          <a href="#about">关于我</a>
          <a href="#projects">项目经历</a>
          <a href="#life">生活相册</a>
          <a href="#assistant">问问助手</a>
          <a href="#messages">留言板</a>
        </nav>

        <div class="management">
  <details
    v-if="!editing && !managingPhotos"
    class="management-menu"
  >
    <summary>内容管理 ▾</summary>

    <div class="management-options">
      <button type="button" @click="toggleEditing">
        编辑个人资料
      </button>

      <button type="button" @click="togglePhotos">
        管理照片
      </button>
    </div>
  </details>

  <button
    v-else-if="editing"
    type="button"
    @click="toggleEditing"
  >
    返回主页
  </button>

  <button
    v-else
    type="button"
    @click="togglePhotos"
  >
    返回主页
  </button>
</div>
      </div>
    </header>

    <main class="page">
      <ProfileEditor
        v-if="editing"
        @saved="handleSaved"
        @dirty="hasUnsavedChanges = $event"
      />

      <PhotoManager v-else-if="managingPhotos" />

      <template v-else>
        <!-- 首屏 -->
       <section id="top" class="hero" aria-labelledby="hero-title">
  <div class="hero-copy">
  <h1 id="hero-title">
    你好，<br>
    我是<span class="name-highlight">绥之。</span>
  </h1>

  <p class="hero-description">
    电子科技大学在读本科生，在学习与实践中探索更多可能。
  </p>

  <div class="hero-actions">
    <a class="primary-link" href="#projects">
      查看我的项目 →
    </a>

    <a class="chat-link" href="#assistant">
      和助手聊聊
    </a>
  </div>
</div>

  <PhotoCarousel />
</section>
        
        <!-- 个人介绍 -->
        <section id="about" class="chapter" aria-labelledby="about-title">
          <header class="chapter-heading">
            <h2 id="about-title">不止一段自我介绍。</h2>
            <span class="accent-line"></span>
          </header>

          <ProfileCard :key="profileVersion" />
        </section>
        <!-- 新增：项目经历 -->
<section
  id="projects"
  class="chapter"
  aria-labelledby="projects-title"
>
  <header class="chapter-heading">
    <h2 id="projects-title">把想法变成作品。</h2>
    <span class="accent-line"></span>
  </header>

  <ProjectShowcase :key="profileVersion" />
</section>

<section
  id="life"
  class="chapter life-section"
  aria-labelledby="life-title"
>
  <header class="life-heading">
    <div>
      <h2 id="life-title">生活不止代码</h2>
      <span class="life-accent"></span>
    </div>

    <a href="#top">回到轮播，查看更多 →</a>
  </header>

  <p v-if="lifeLoading" role="status">正在加载照片…</p>
  <p v-else-if="lifeError" role="alert">{{ lifeError }}</p>
  <p v-else-if="lifePhotos.length === 0">
    等待记录新的生活瞬间。
  </p>

  <div v-else class="life-gallery">
    <figure
      v-for="photo in lifePhotos"
      :key="photo.src"
      class="life-photo"
    >
      <div class="life-image">
        <img
          :src="photo.src"
          :alt="photo.title"
          loading="lazy"
        >
      </div>

      <figcaption>{{ photo.title }}</figcaption>
    </figure>
  </div>
</section>

<!-- AI 助手 -->
<div class="interaction-grid">
  <section id="assistant" class="interaction-panel">
    <IntroAssistant />
  </section>

  <section id="messages" class="interaction-panel">
    <MessageBoard />
  </section>
</div>
      </template>
    </main>

    <footer class="site-footer">
  <img
    class="footer-landscape"
    src="/illustrations/footer-landscape.png"
    alt=""
    aria-hidden="true"
  >

  <div class="footer-base">
    <div class="footer-inner">
      <div class="footer-identity">
        <span class="brand-mark">绥之</span>
        <p>电子科技大学在读本科生</p>
      </div>

      <div class="footer-message">
        <p>保持好奇，持续更新。</p>
        <span>学习、项目，以及生活里的小小收获。</span>
      </div>

      <a class="back-to-top" href="#page-top">
        返回顶部 ↑
      </a>
    </div>
  </div>
</footer>
  </div>
</template>

<style scoped>
/* 页面与导航 */
.portfolio {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  color: #203d35;
  background: #f8f7f2;
}

.portfolio::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image: url("/illustrations/page-background.png");
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  opacity: 0.5;
  pointer-events: none;
}
.site-header {
  background: #f8f7f2;
  border-bottom: 2px solid #315747;
}
.header-banner {
  display: block;
  width: 100%;
  height: clamp(150px, 17vw, 250px);
  object-fit: cover;
  object-position: center 58%;
}
.header-inner, .footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 15px;
  font-weight: 600;
}
.brand-mark {
  font-family: inherit;
  font-size: 26px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 1px;
  white-space: nowrap;
}
.navigation, .management {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
}
.navigation a {
  color: #354b40;
  font-size: 14px;
  text-decoration: none;
}
.navigation a:hover {
  color: #b46642;
}
.management {
  gap: 8px;
}
.management-menu {
  position: relative;
  z-index: 10;
}

.management-menu > summary {
  padding: 9px 14px;
  border: 1px solid #b7c8b0;
  border-radius: 10px;
  background: #fff;
  color: #355547;
  font-size: 14px;
  list-style: none;
  cursor: pointer;
}

.management-menu > summary::-webkit-details-marker {
  display: none;
}

.management-menu > summary:hover,
.management-menu[open] > summary {
  background: #edf3e7;
}

.management-menu > summary:focus-visible {
  outline: 3px solid #91b897;
  outline-offset: 3px;
}

.management-options {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  display: grid;
  gap: 5px;
  width: 180px;
  padding: 8px;
  border: 1px solid #dfe6dc;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 30px #203d3514;
}

.management-options button {
  width: 100%;
  padding: 11px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #355547;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.management-options button:hover {
  background: #edf3e7;
}
.management button {
  padding: 8px 14px;
  color: #355547;
  border: 1px solid #aab9ac;
  border-radius: 7px;
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 36px 28px 64px;
}
/* 首屏 */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  align-items: center;
  gap: 40px;
  padding: 20px 0 36px;
  scroll-margin-top: 20px;
}
.hero h1 {
  margin: 0 0 24px;
  font-family: inherit;
  font-size: clamp(42px, 5.6vw, 72px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -2px;
}
.hero h1 span {
  color: #173e30;
}
.name-highlight {
  position: relative;
  display: inline-block;
}
.name-highlight::after {
  content: '';
  position: absolute;
  left: 8%;
  right: 0;
  bottom: -8px;
  height: 4px;
  border-radius: 50%;
  background: #ef995e;
  transform: rotate(-4deg);
}
.hero-description {
  max-width: 440px;
  margin: 28px 0;
  color: #365745;
  font-size: 19px;
  line-height: 1.8;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin: 0;
}
.hero-actions a {
  display: inline-block;
  padding: 12px 22px;
  border-radius: 28px;
  font-size: 15px;
  text-decoration: none;
}
.hero-actions .primary-link {
  color: #fff;
  background: #254e32;
  border: 1px solid #254e32;
}
.hero-actions .primary-link:hover {
  background: #193b25;
}
.chat-link {
  color: #254e32;
  background: transparent;
  border: 1px solid #254e32;
}
.chat-link:hover {
  background: #e9efdf;
}
/* 内容章节 */
.chapter {
  margin-top: 28px;
  scroll-margin-top: 24px;
}
.chapter-heading {
  margin-bottom: 24px;
}
.chapter-heading h2 {
  margin: 10px 0 14px;
  font-family: 'Songti SC', 'SimSun', serif;
  font-size: clamp(25px, 3vw, 34px);
  line-height: 1.5;
}
.accent-line {
  display: block;
  width: 30px;
  height: 3px;
  background: #bc724b;
}
/* 生活照片墙 */
.life-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 22px;
}
.life-heading h2 {
  margin: 0 0 10px;
  font-family: inherit;
  font-size: 30px;
  line-height: 1.4;
}
.life-accent {
  display: block;
  width: 92px;
  height: 4px;
  border-radius: 50%;
  background: #eea16c;
  transform: rotate(-3deg);
}
.life-heading a {
  color: #42634e;
  font-size: 14px;
  text-decoration: none;
}
.life-heading a:hover {
  text-decoration: underline;
}
.life-gallery {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
  gap: 18px;
}
.life-photo {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  border: 1px solid #dfe6dc;
  border-radius: 18px;
  background: #fff;
  height: 100%;
}

.life-image {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 240px;
  padding: 12px;
  overflow: hidden;
  background: #fff;
}
.life-image img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 216px;
  min-width: 0;
  min-height: 0;
  object-fit: contain;
  border-radius: 16px;
}
.life-photo figcaption {
  min-height: 78px;
  margin: 0;
  padding: 12px 16px 18px;
  color: #35503c;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
/* 互动双栏与子组件主题 */
.interaction-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 22px;
  margin-top: 44px;
}
.interaction-panel {
  min-width: 0;
  scroll-margin-top: 24px;
}
#assistant :deep(.assistant) {
  background: linear-gradient(145deg, #f0f5e8, #e0edcf);
  border: 1px solid #dbe6cf;
  border-radius: 22px;
}
#messages :deep(.message-board) {
  background: linear-gradient(145deg, #fff4e7, #ffe6cb);
  border: 1px solid #f0ddc4;
  border-radius: 22px;
}
#assistant :deep(textarea), #messages :deep(textarea) {
  background: #ffffffd9;
  border-color: #ffffff;
}
#assistant :deep(.response) {
  background: #ffffffa6;
  border: 1px solid #ffffff80;
}
#messages :deep(.message-item) {
  background: #ffffffa6;
  border-color: #ffffff90;
}
#assistant :deep(.form-bottom), #messages :deep(.form-bottom) {
  align-items: flex-start;
}
#assistant :deep(.form-bottom span), #messages :deep(.form-bottom span) {
  flex: 1 1 180px;
}
#assistant :deep(button), #messages :deep(button) {
  flex-shrink: 0;
}
/* 页尾与键盘焦点 */
/* 页尾 */
.site-footer {
  margin-top: 32px;
  background: transparent;
  color: #f1f5e9;
}

/* 山丘装饰不占用文字区域 */
.footer-landscape {
  display: block;
  width: 100%;
  height: auto;
  margin-bottom: -1px;
  pointer-events: none;
}

.footer-inner {
  position: relative;
  min-height: 160px;
  padding-top: 30px;
  padding-bottom: 30px;
  gap: 24px;
}

.footer-identity .brand-mark {
  display: block;
  font-size: 28px;
}

.footer-identity p {
  margin: 10px 0 0;
  color: #c5d4bd;
  font-size: 14px;
}

.footer-message p {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
}

.footer-message span {
  color: #c5d4bd;
  font-size: 14px;
}

.footer-base {
  background: #214b3f;
}

.back-to-top {
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  border: 1px solid #b8c9b570;
  border-radius: 24px;
  background: #ffffff0a;
  color: #f1f5e9;
  font-size: 14px;
  text-decoration: none;
}

.back-to-top:hover {
  background: #ffffff18;
}
a:focus-visible, button:focus-visible {
  outline: 3px solid #b8794f;
  outline-offset: 4px;
}
/* 平板与手机 */
@media (max-width: 900px) {
  .life-gallery {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: start;
  gap: 18px;
}
}
@media (max-width: 850px) {
  .interaction-grid {
    grid-template-columns: 1fr;
    gap: 20px;
    margin-top: 32px;
  }
}
@media (max-width: 760px) {
  .header-inner {
  padding: 16px;
  gap: 16px;
}
.brand {
  min-width: 0;
  gap: 10px;
  font-size: 13px;
}

.brand-mark {
  font-size: 24px;
}

.management {
  margin-left: auto;
}
  .header-banner {
  height: 140px;
  object-position: 60% center;
}

.portfolio::before {
  background-position: center;
  opacity: 0.4;
}
  .navigation {
  order: 3;
  width: 100%;
  min-width: 0;
  flex-wrap: wrap;
  gap: 10px 18px;
}

.navigation a {
  font-size: 14px;
}
  .page {
    padding: 24px 16px 40px;
  }
  .hero {
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  padding-top: 8px;
}

.hero-copy {
  min-width: 0;
  padding: 8px 0;
}

.hero h1 {
  font-size: 40px;
  line-height: 1.3;
  letter-spacing: -1px;
}

.hero-description {
  max-width: 100%;
  font-size: 16px;
  overflow-wrap: anywhere;
}
  .footer-inner {
  align-items: flex-start;
  gap: 24px;
}

.footer-message {
  width: 100%;
  order: 3;
}

.footer-message span {
  display: block;
}
}
@media (max-width: 500px) {
  .life-gallery {
    grid-template-columns: 1fr;
  }
  .life-heading h2 {
    font-size: 26px;
  }
}

</style>