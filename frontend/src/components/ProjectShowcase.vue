<script setup lang="ts">
import { onMounted, ref } from "vue";

interface Project {
  title: string;
  content: string;
}

const projects = ref<Project[]>([]);
const loading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    const response = await fetch("/api/profile", {
      cache: "no-store",
    });

    if (!response.ok) throw new Error("读取项目经历失败。");

    const data = await response.json();

    if (!Array.isArray(data.sections)) {
      throw new Error("项目资料格式不正确。");
    }

    projects.value = data.sections
      .filter(
        (section: unknown) =>
          section !== null &&
          typeof section === "object" &&
          "type" in section &&
          section.type === "project" &&
          "title" in section &&
          typeof section.title === "string" &&
          "content" in section &&
          typeof section.content === "string",
      )
      .map((section: Project) => ({
        title: section.title,
        content: section.content,
      }));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "暂时无法读取项目。";
  } finally {
    loading.value = false;
  }
});

function getExcerpt(content: string) {
  const text = content.trim().replace(/\s+/g, " ");

  if (!text) return "项目介绍整理中。";

  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}
</script>

<template>
  <div>
    <p v-if="loading" role="status">正在读取项目经历…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="projects.length === 0" class="empty">项目经历整理中。</p>

    <div v-else class="project-grid">
      <article
        v-for="(project, index) in projects"
        :key="index"
        class="project-card"
      >
        <div class="project-main">
          <header class="project-heading">
            <span class="project-icon" aria-hidden="true">
              <template v-if="index % 2 === 0">⌘</template>
              <template v-else>&lt;/&gt;</template>
            </span>
            <h3>{{ project.title }}</h3>
          </header>

          <p class="project-excerpt">
            {{ getExcerpt(project.content) }}
          </p>

          <details v-if="project.content.trim()" class="project-details">
            <summary>
              <span class="when-closed">展开项目介绍</span>
              <span class="when-open">收起项目介绍</span>
              <span class="expand-icon" aria-hidden="true">＋</span>
            </summary>

            <p class="project-body">{{ project.content }}</p>
          </details>
        </div>

        <!-- 抽象装饰，不冒充项目截图 -->
        <div class="project-art" aria-hidden="true">
          <span class="project-number">
            {{ String(index + 1).padStart(2, "0") }}
          </span>

          <img
            v-if="project.title.includes('风控')"
            class="project-illustration"
            src="/illustrations/risk.png"
            alt=""
            loading="lazy"
          />

          <img
            v-else
            class="project-illustration"
            src="/illustrations/exploration.png"
            alt=""
            loading="lazy"
          />
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 22px;
}

.project-card {
  position: relative;
  isolation: isolate;
  min-width: 0;
  overflow: hidden;
  padding: 28px;
  border: 1px solid #dce5d1;
  border-radius: 22px;
  background: linear-gradient(135deg, #f7faef, #e8efd9);
}

.project-card:nth-child(even) {
  border-color: #d3e2ef;
  background: linear-gradient(135deg, #f1f7ff, #dfedf9);
}

.project-main {
  position: relative;
  z-index: 1;
}

.project-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.project-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: #dce8c9;
  color: #315537;
  font-size: 24px;
  font-weight: 700;
}

.project-card:nth-child(even) .project-icon {
  background: #cfe3f7;
  color: #315c87;
  font-size: 18px;
}

h3 {
  margin: 3px 0 0;
  color: #203d35;
  font-size: 23px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.project-excerpt {
  min-height: 90px;
  margin: 22px 0;
  color: #536b59;
  font-size: 16px;
  line-height: 1.9;
  overflow-wrap: anywhere;
}

.project-details {
  margin-top: 18px;
}

summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 16px;
  border: 1px solid #a9bda4;
  border-radius: 12px;
  background: #ffffff80;
  color: #315537;
  font-size: 14px;
  font-weight: 600;
  list-style: none;
  cursor: pointer;
}

summary::-webkit-details-marker {
  display: none;
}

summary:hover {
  background: #fffdf5;
}

summary:focus-visible {
  outline: 3px solid #91b897;
  outline-offset: 3px;
}

.expand-icon {
  font-size: 20px;
  font-weight: 400;
}

.when-open {
  display: none;
}

details[open] .when-open {
  display: inline;
}

details[open] .when-closed {
  display: none;
}

details[open] .expand-icon {
  transform: rotate(45deg);
}

.project-body {
  margin: 16px 0 0;
  padding: 18px;
  border: 1px solid #ffffff90;
  border-radius: 12px;
  background: #ffffffa6;
  color: #3c5746;
  font-size: 16px;
  line-height: 1.95;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* 卡片底部的抽象装饰 */
.project-art {
  display: flex;
  justify-content: space-between;
  align-items: end;
  height: 92px;
  margin-top: 20px;
  pointer-events: none;
}

.project-number {
  color: #527046;
  font-size: 54px;
  font-weight: 700;
  line-height: 1;
  opacity: 0.18;
}

.art-window {
  width: 120px;
  padding: 9px;
  border: 1px solid #bbccb1;
  border-radius: 10px;
  background: #ffffff80;
  transform: rotate(-6deg);
}

.project-card:nth-child(even) .art-window {
  border-color: #b3cce3;
  transform: rotate(6deg);
}

.window-top {
  display: flex;
  gap: 4px;
  padding-bottom: 9px;
  border-bottom: 1px solid #ccd8c5;
}

.window-top i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #8ea87e;
}

.art-lines {
  display: grid;
  gap: 6px;
  padding-top: 10px;
}

.art-lines span {
  width: 85%;
  height: 4px;
  border-radius: 4px;
  background: #c2d2b5;
}

.art-lines span:nth-child(even) {
  width: 58%;
}

.project-card:nth-child(even) .art-lines span {
  background: #bbd1e6;
}

.empty {
  color: #7b8576;
}

.error {
  color: #9e4537;
}

@media (max-width: 760px) {
  .project-grid {
    grid-template-columns: 1fr;
  }

  .project-card {
    padding: 22px;
  }

  .project-excerpt {
    min-height: 0;
  }
}

.project-art {
  height: 165px;
  margin-top: 16px;
}

.project-illustration {
  display: block;
  width: 230px;
  max-width: 70%;
  height: 165px;
  object-fit: contain;
  object-position: right bottom;
}
</style>
