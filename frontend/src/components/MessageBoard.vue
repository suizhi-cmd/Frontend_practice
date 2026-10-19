<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Message {
  id: string
  text: string
  time: string
}

const storageKey = 'suizhi-portfolio-messages'
const messages = ref<Message[]>([])
const draft = ref('')
const error = ref('')
const ready = ref(false)

onMounted(() => {
  try {
    const saved = localStorage.getItem(storageKey)

    if (saved) {
      const data: unknown = JSON.parse(saved)

      if (
        !Array.isArray(data) ||
        !data.every((item) =>
          item !== null &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.text === 'string' &&
          typeof item.time === 'string'
        )
      ) {
        throw new Error('留言数据格式异常')
      }

      messages.value = data
    }

    ready.value = true
  } catch {
    error.value = '无法读取本地留言，暂时停止保存，避免覆盖原数据。'
  }
})

function persist(nextMessages: Message[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(nextMessages))
    messages.value = nextMessages
    error.value = ''
    return true
  } catch {
    error.value = '浏览器无法保存留言，请检查存储空间或隐私设置。'
    return false
  }
}

function publishMessage() {
  if (!ready.value) return

  const text = draft.value.trim()

  if (!text || text.length > 1000) {
    error.value = '请输入 1～1000 字的留言。'
    return
  }

  const message: Message = {
    id: crypto.randomUUID(),
    text,
    time: new Date().toISOString(),
  }

  if (persist([message, ...messages.value])) {
    draft.value = ''
  }
}

function deleteMessage(id: string) {
  if (!ready.value) return
  if (!window.confirm('确定删除这条留言吗？')) return

  persist(messages.value.filter((message) => message.id !== id))
}

function formatTime(time: string) {
  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN')
}
</script>

<template>
  <section class="message-board" aria-labelledby="message-board-title">
    <header>
      <h2 id="message-board-title">留下一点想法</h2>
      <p>关于页面、项目，或者一句简单的问候。</p>
    </header>

    <form @submit.prevent="publishMessage">
      <label for="message-draft">你的留言</label>

      <textarea
        id="message-draft"
        v-model="draft"
        rows="3"
        maxlength="1000"
        placeholder="想说的话，写在这里……"
        :disabled="!ready"
        required
      ></textarea>

      <div class="form-bottom">
        <span>仅保存在当前浏览器，不会公开给其他访客。</span>
        <button type="submit" :disabled="!ready || !draft.trim()">
          发布留言
        </button>
      </div>
    </form>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <p v-if="ready && messages.length === 0" class="empty">
      还没有留言，写下第一条吧。
    </p>

    <ul v-if="messages.length" class="message-list">
      <li v-for="message in messages" :key="message.id" class="message-item">
        <p class="message-text">{{ message.text }}</p>

        <div class="message-meta">
          <time :datetime="message.time">{{ formatTime(message.time) }}</time>
          <button
            type="button"
            class="delete-button"
            @click="deleteMessage(message.id)"
          >
            删除
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.message-board {
  padding: 30px;
  border: 1px solid #dfe6dc;
  border-radius: 20px;
  background: #fffdf8;
}

h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

header p {
  margin: 0 0 24px;
  color: #6c786b;
}

label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
}

textarea {
  display: block;
  width: 100%;
  padding: 16px;
  border: 1px solid #d8e0d2;
  border-radius: 12px;
  background: #f8faf5;
  color: #203d35;
  resize: vertical;
}

.form-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
}

.form-bottom span {
  color: #7b8576;
  font-size: 13px;
}

button {
  padding: 10px 18px;
  border: 0;
  border-radius: 10px;
  background: #28664f;
  color: #fff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

textarea:focus-visible,
button:focus-visible {
  outline: 3px solid #91b897;
  outline-offset: 3px;
}

.message-list {
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.message-item {
  margin-top: 14px;
  padding: 18px;
  border: 1px solid #dfe6dc;
  border-radius: 12px;
  background: #f8faf5;
}

.message-text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  color: #7b8576;
  font-size: 12px;
}

.delete-button {
  padding: 5px 10px;
  color: #9e4537;
  background: #faeeeb;
}

.empty {
  margin-top: 24px;
  color: #7b8576;
}

.error {
  color: #9e4537;
}

@media (max-width: 600px) {
  .message-board {
    padding: 22px;
  }
}
</style>