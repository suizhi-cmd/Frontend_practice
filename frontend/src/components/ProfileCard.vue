<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface ProfileSection {
  title: string
  content: string
}

// 定义个人资料的数据结构
interface Profile {
  school: string
  college: string
  major: string
  interests: string
  learning: string
  currentProject: string
  pastProjects: string
  sections: ProfileSection[]
}

const profile = ref<Profile | null>(null)
const loading = ref(true)
const error = ref('')

// 给每个字段配上中文名称
const fields: { key: keyof Profile; label: string }[] = [
  { key: 'school', label: '学校' },
  { key: 'college', label: '学院' },
  { key: 'major', label: '专业' },
  { key: 'interests', label: '兴趣' },
  { key: 'learning', label: '正在学习' },
  { key: 'currentProject', label: '正在进行的项目' },
  { key: 'pastProjects', label: '做过的项目' },
]

// 组件出现在页面上时，读取后端资料
onMounted(async () => {
  try {
    const response = await fetch('/api/profile')

    if (!response.ok) {
      throw new Error('读取资料失败，请确认后端正在运行。')
    }

    const data: Profile = await response.json()
    profile.value = data
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : '暂时无法读取资料。'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="profile-card">
    <span class="eyebrow">MY LITTLE CORNER / 个人空间</span>
    <h1>你好，欢迎来到我的个人空间</h1>
    <p class="subtitle">记录学习，也记录生活。</p>

    <p v-if="loading" role="status">正在加载个人资料…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>

    <dl v-else-if="profile" class="profile-details">
      <div v-for="field in fields" :key="field.key">
        <dt>{{ field.label }}</dt>
        <dd>{{ profile[field.key] || '暂未填写' }}</dd>
      </div>
    </dl>
    <div v-if="profile && !loading && !error" class="intro-sections">
  <article
    v-for="(section, index) in profile.sections"
    :key="index"
    class="intro-section"
  >
    <h2>{{ section.title }}</h2>
    <p>{{ section.content }}</p>
  </article>
</div>
  </section>
</template>

<style scoped>
.profile-card {
  padding: 36px;
  border: 1px solid #dfe6dc;
  border-radius: 24px;
  background: linear-gradient(120deg, #e4eddd, #f8faf3);
  box-shadow: 0 12px 40px #203d3508;
}

.eyebrow {
  color: #28664f;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
}

h1 {
  margin: 20px 0 12px;
  font-size: clamp(26px, 4vw, 40px);
  line-height: 1.4;
}

.subtitle {
  color: #6c7d73;
}

.profile-details {
  margin: 28px 0 0;
}

.profile-details > div {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid #203d3512;
}

dt {
  color: #6c7d73;
}

dd {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.error {
  color: #a63e35;
}

@media (max-width: 600px) {
  .profile-card {
    padding: 24px;
  }

  .profile-details > div {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
.intro-section {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid #203d3518;
}

.intro-section h2 {
  margin: 0 0 12px;
  font-size: 22px;
}

.intro-section p {
  margin: 0;
  line-height: 1.9;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>