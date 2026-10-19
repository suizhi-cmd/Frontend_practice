<script setup lang="ts">
import { ref } from 'vue'
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
</script>

<template>
  <div class="portfolio">
    <header class="site-header">
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
          <a href="#top">生活相册</a>
          <a href="#assistant">问问助手</a>
          <a href="#messages">留言板</a>
          <a href="#projects">项目经历</a>
        </nav>

        <div class="management">
          <button
            v-if="!managingPhotos"
            type="button"
            @click="toggleEditing"
          >
            {{ editing ? '返回主页' : '编辑资料' }}
          </button>

          <button
            v-if="!editing"
            type="button"
            @click="togglePhotos"
          >
            {{ managingPhotos ? '返回主页' : '管理照片' }}
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
    <span class="hello-tag">你好，很高兴认识你</span>

    <h1 id="hero-title">
      欢迎来到<br>
      <span>我的个人空间。</span>
    </h1>

    <p class="hero-description">
      在这里，了解我的学习、项目和生活。
    </p>

    <a class="primary-link" href="#about">了解更多 →</a>
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

<!-- AI 助手 -->
<section id="assistant" class="chapter">
  <IntroAssistant />
</section>

<section id="messages" class="chapter">
  <MessageBoard />
</section>
      </template>
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="brand footer-brand">
          <span class="brand-mark">绥之</span>
          <span>我的个人空间</span>
        </div>
        <p>持续更新中</p>
        <span class="footer-note">保持热爱，奔赴下一场山海。</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.portfolio {
  color: #203d35;
  background:
    radial-gradient(ellipse at 85% 12%, #e5e9da80, transparent 38%),
    #f8f7f2;
}

/* 顶部导航 */
.site-header {
  border-bottom: 1px solid #203d3518;
}

.header-inner,
.footer-inner {
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
  font-family: Georgia, serif;
  font-size: 42px;
  font-weight: 400;
  line-height: 1;
}

.navigation,
.management {
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

.management button {
  padding: 8px 14px;
  color: #355547;
  border: 1px solid #aab9ac;
  border-radius: 7px;
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}

/* 主体容器 */
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 36px 28px 64px;
}

/* 首屏 */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 56px;
  padding: 26px 0 52px;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #66796c;
  font-size: 10px;
  letter-spacing: 3px;
}

.short-line {
  width: 48px;
  height: 1px;
  background: #bdc6b9;
}

.hero h1 {
  margin: 24px 0 20px;
  font-family:
    "Noto Serif SC", "Source Han Serif SC", "Songti SC",
    "SimSun", serif;
  font-size: clamp(32px, 4vw, 54px);
  line-height: 1.45;
  letter-spacing: -1px;
}

.hero h1 span {
  color: #b46642;
}

.hero-description {
  margin: 0;
  color: #667366;
  font-size: 15px;
  line-height: 1.9;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 28px;
}

.hero-actions a {
  padding: 11px 20px;
  border-radius: 6px;
  font-size: 13px;
  text-decoration: none;
}

.primary-link {
  border: 1px solid #204c3d;
  background: #204c3d;
  color: #fff;
}

.primary-link:hover {
  background: #153b2e;
}

.outline-link {
  border: 1px solid #a7b7a9;
  color: #355547;
  background: #ffffff50;
}

.outline-link:hover {
  background: #e8eddf;
}

.hero-note {
  margin: 30px 0 0;
  color: #85907e;
  font-size: 12px;
}

/* 相纸效果 */
.hero-photo {
  position: relative;
  isolation: isolate;
  min-width: 0;
  margin: 0 8px;
  padding: 12px 12px 0;
  border: 1px solid #e6e5d9;
  background: #fffdf6;
  box-shadow: 0 12px 35px #273b2c18;
  transform: rotate(3deg);
}

.hero-photo::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 18px -12px 8px;
  background: #d9e2d0;
  transform: rotate(-7deg);
}

.hero-photo img {
  display: block;
  width: 100%;
  height: clamp(260px, 30vw, 370px);
  object-fit: contain;
  background: #e9ecdf;
}

.hero-photo figcaption {
  padding: 15px 8px;
  color: #6b7767;
  text-align: right;
  font-family: "KaiTi", "STKaiti", serif;
  font-size: 17px;
}

/* 区块分隔 */
.values-strip {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  padding: 22px 12px;
  border-top: 1px solid #cfd8c9;
  border-bottom: 1px solid #cfd8c9;
  color: #73816d;
  font-size: 12px;
  letter-spacing: 1px;
}

.star {
  color: #315444;
}

.chapter {
  margin-top: 56px;
  scroll-margin-top: 24px;
}

.chapter-heading {
  margin-bottom: 24px;
}

.chapter-number {
  color: #6c7b68;
  font-size: 11px;
  letter-spacing: 2px;
}

.chapter-heading h2 {
  margin: 10px 0 14px;
  font-family: "Songti SC", "SimSun", serif;
  font-size: clamp(25px, 3vw, 34px);
  line-height: 1.5;
}

.accent-line {
  display: block;
  width: 30px;
  height: 3px;
  background: #bc724b;
}

/* 页尾 */
.site-footer {
  color: #e9eddf;
  background: #214b3f;
}

.footer-inner {
  min-height: 110px;
}

.footer-inner p {
  margin: 0;
  color: #bbcab7;
  font-size: 12px;
  letter-spacing: 3px;
}

.footer-note {
  color: #c8d3bf;
  font-family: "KaiTi", "STKaiti", serif;
  font-size: 15px;
}

a:focus-visible,
button:focus-visible {
  outline: 3px solid #b8794f;
  outline-offset: 4px;
}

/* 手机适配 */
@media (max-width: 760px) {
  .header-inner,
  .footer-inner {
    padding: 18px 20px;
  }

  .navigation {
    order: 3;
    width: 100%;
  }

  .page {
    padding: 24px 20px 40px;
  }

  .hero {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 12px 0 40px;
  }

  .hero-photo {
    margin: 0;
    transform: none;
  }

  .hero-photo::before {
    display: none;
  }

  .hero-photo img {
    height: 280px;
  }

  .values-strip {
    gap: 12px;
    font-size: 11px;
    letter-spacing: 0;
  }

  .chapter {
    margin-top: 36px;
  }
}
/* 简化首屏，覆盖上一版的排版 */
.hero {
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 36px;
  align-items: center;
  padding: 12px 0 32px;
  scroll-margin-top: 20px;
}

.hello-tag {
  display: inline-block;
  padding: 6px 12px;
  color: #446550;
  background: #e7eddf;
  border-radius: 8px;
  font-size: 15px;
}

.hero h1 {
  margin: 20px 0;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  font-size: clamp(32px, 3.6vw, 48px);
  line-height: 1.4;
  letter-spacing: -1px;
}

.hero h1 span {
  color: #28664f;
}

.hero-description {
  margin-bottom: 28px;
  font-size: 17px;
  line-height: 1.8;
}

.hero-copy > .primary-link {
  display: inline-block;
  padding: 12px 22px;
  border-radius: 10px;
  text-decoration: none;
}

.chapter {
  margin-top: 28px;
}

@media (max-width: 760px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .hero-copy {
    padding: 8px 0;
  }
}

.brand-mark {
  font-family: inherit;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 1px;
  white-space: nowrap;
}
</style>