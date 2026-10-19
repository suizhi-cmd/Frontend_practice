<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Project {
  title: string
  content: string
}

const projects = ref<Project[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const response = await fetch('/api/profile', {
      cache: 'no-store',
    })

    if (!response.ok) throw new Error('读取项目经历失败。')

    const data = await response.json()

    if (!Array.isArray(data.sections)) {
      throw new Error('项目资料格式不正确。')
    }

    projects.value = data.sections
      .filter((section: unknown) =>
        section !== null &&
        typeof section === 'object' &&
        'type' in section &&
        section.type === 'project' &&
        'title' in section &&
        typeof section.title === 'string' &&
        'content' in section &&
        typeof section.content === 'string'
      )
      .map((section: Project) => ({
        title: section.title,
        content: section.content,
      }))
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : '暂时无法读取项目。'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <p v-if="loading" role="status">正在读取项目经历…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>

    <p v-else-if="projects.length === 0" class="empty">
      项目经历整理中。
    </p>

    <div v-else class="project-grid">
      <article
        v-for="(project, index) in projects"
        :key="index"
        class="project-card"
      >
        <div class="card-top">
          <span class="project-label">项目经历</span>
          <span class="project-number">
            {{ String(index + 1).padStart(2, '0') }}
          </span>
        </div>

        <h3>{{ project.title }}</h3>

        <p v-if="project.content">{{ project.content }}</p>
        <p v-else class="empty">详细介绍整理中。</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.project-card {
  min-width: 0;
  padding: 28px;
  border: 1px solid #dce3d6;
  border-radius: 18px;
  background: #fffdf8;
}

.project-card:nth-child(even) {
  background: #edf2e7;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.project-label {
  padding: 4px 10px;
  border-radius: 6px;
  background: #e1ead8;
  color: #42613d;
  font-size: 13px;
}

.project-number {
  color: #87947c;
  font-size: 22px;
}

h3 {
  margin: 0 0 16px;
  color: #203d35;
  font-size: 23px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.project-card p {
  margin: 0;
  color: #5e705f;
  font-size: 16px;
  line-height: 1.9;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
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
}
</style>