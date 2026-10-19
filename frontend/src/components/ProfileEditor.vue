<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

interface Section {
  title: string
  content: string
}

interface Profile {
  school: string
  college: string
  major: string
  interests: string
  learning: string
  currentProject: string
  pastProjects: string
  sections: Section[]
}

type BasicField = Exclude<keyof Profile, 'sections'>

const fields: { key: BasicField; label: string }[] = [
  { key: 'school', label: '学校' },
  { key: 'college', label: '学院' },
  { key: 'major', label: '专业' },
  { key: 'interests', label: '兴趣' },
  { key: 'learning', label: '正在学习' },
  { key: 'currentProject', label: '正在进行的项目' },
  { key: 'pastProjects', label: '做过的项目' },
]

const emit = defineEmits<{
  saved: []
  dirty: [value: boolean]
}>()

const profile = ref<Profile | null>(null)
const password = ref('')
const status = ref('正在读取资料…')
const saving = ref(false)
// 记录最近一次读取或保存成功时的资料
const savedSnapshot = ref('')

const hasChanges = computed(() =>
  profile.value !== null &&
  JSON.stringify(profile.value) !== savedSnapshot.value
)

// 将“是否有未保存修改”通知首页
watch(hasChanges, (value) => {
  emit('dirty', value)
})

// 刷新或关闭网页时，触发浏览器自己的确认提示
function warnBeforeLeave(event: BeforeUnloadEvent) {
  if (!hasChanges.value) return

  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeLeave)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', warnBeforeLeave)
})

onMounted(async () => {
  try {
    const response = await fetch('/api/profile', {
      cache: 'no-store',
    })

    if (!response.ok) throw new Error('读取资料失败，请刷新重试。')

    profile.value = await response.json()
    savedSnapshot.value = JSON.stringify(profile.value)
    status.value = ''
  } catch {
    status.value = '无法读取资料，请确认后端正在运行。'
  }
})

function addSection() {
  if (!profile.value || profile.value.sections.length >= 10) return

  profile.value.sections.push({
    title: '',
    content: '',
  })
}

function removeSection(index: number) {
  if (!profile.value) return

  if (window.confirm('确定删除这个介绍区块吗？保存后才会生效。')) {
    profile.value.sections.splice(index, 1)
  }
}

function moveSection(index: number, step: number) {
  if (!profile.value) return

  const sections = profile.value.sections
  const target = index + step

  if (target < 0 || target >= sections.length) return

  const section = sections[index]

  if (!section) return

  sections.splice(index, 1)
  sections.splice(target, 0, section)
}

async function saveProfile() {
  if (!profile.value || saving.value) return

  saving.value = true
  status.value = '正在保存…'

  try {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Edit-Password': password.value,
      },
      body: JSON.stringify(profile.value),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '保存失败。')
    }

    savedSnapshot.value = JSON.stringify(profile.value)
    password.value = ''
    status.value = '保存成功，主页资料已更新。'
    emit('saved')
  } catch (error) {
    status.value =
      error instanceof Error ? error.message : '保存失败，请重试。'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="editor">
    <h2>编辑个人资料</h2>
    <p class="hint">
      这里只填写愿意公开的内容，主页和访客助手都会读取这些资料。
    </p>

    <form v-if="profile" @submit.prevent="saveProfile">
      <fieldset :disabled="saving">
        <legend>基础资料</legend>

        <label v-for="field in fields" :key="field.key">
          {{ field.label }}
          <textarea
            v-model="profile[field.key]"
            rows="2"
            maxlength="1000"
          ></textarea>
        </label>
      </fieldset>

      <fieldset :disabled="saving">
        <legend>详细介绍</legend>
        <p class="hint">
          最多 10 个区块，可填写个人优势、项目经历、实践经历等。
        </p>

        <article
          v-for="(section, index) in profile.sections"
          :key="index"
          class="section-editor"
        >
          <label>
            区块标题
            <input
              v-model="section.title"
              placeholder="例如：个人网贷 AI 风控系统"
              maxlength="60"
              required
            >
          </label>

          <label>
            正文
            <textarea
              v-model="section.content"
              placeholder="可以分段写项目背景、个人职责、技术方案、难点和成果。"
              rows="7"
              maxlength="3000"
            ></textarea>
          </label>

          <div class="actions">
            <button
              type="button"
              :disabled="index === 0"
              @click="moveSection(index, -1)"
            >
              上移
            </button>
            <button
              type="button"
              :disabled="index === profile.sections.length - 1"
              @click="moveSection(index, 1)"
            >
              下移
            </button>
            <button
              type="button"
              class="danger"
              @click="removeSection(index)"
            >
              删除区块
            </button>
          </div>
        </article>

        <button
          type="button"
          :disabled="profile.sections.length >= 10"
          @click="addSection"
        >
          ＋ 添加介绍区块
        </button>
      </fieldset>

      <label>
        编辑密码
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          :disabled="saving"
          required
        >
      </label>

      <button class="save" type="submit" :disabled="saving">
        {{ saving ? '正在保存…' : '保存全部资料' }}
      </button>
    </form>

    <p role="status">{{ status }}</p>
  </section>
</template>

<style scoped>
.editor {
  padding: 28px;
  border: 1px solid #dfe6dc;
  border-radius: 24px;
  background: #fff;
}

h2 {
  margin: 0 0 12px;
}

.hint {
  color: #6c7d73;
}

fieldset {
  min-width: 0;
  margin: 24px 0;
  padding: 20px;
  border: 1px solid #dfe6dc;
  border-radius: 16px;
}

legend {
  padding: 0 8px;
  font-weight: 700;
}

label {
  display: block;
  margin-bottom: 16px;
  font-weight: 600;
}

input,
textarea {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid #dfe6dc;
  border-radius: 10px;
  background: #fafbf7;
  color: #203d35;
}

textarea {
  resize: vertical;
}

input:focus,
textarea:focus {
  outline: 2px solid #91b897;
  outline-offset: 2px;
}

.section-editor {
  margin-bottom: 20px;
  padding: 18px;
  border: 1px solid #dfe6dc;
  border-radius: 14px;
  background: #f8faf5;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

button {
  padding: 10px 16px;
  border: 1px solid #dfe6dc;
  border-radius: 10px;
  background: #eef4e9;
  color: #203d35;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:focus-visible {
  outline: 3px solid #28664f;
  outline-offset: 3px;
}

.danger {
  color: #a63e35;
  background: #faeeeb;
}

.save {
  background: #28664f;
  color: #fff;
}

@media (max-width: 600px) {
  .editor {
    padding: 20px;
  }

  fieldset {
    padding: 12px;
  }
}
</style>