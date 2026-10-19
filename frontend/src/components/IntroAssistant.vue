<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const question = ref('')
const reply = ref('')
const error = ref('')
const sending = ref(false)

let controller: AbortController | null = null

async function sendQuestion() {
  if (sending.value) return

  const message = question.value.trim()

  if (!message) {
    error.value = '请先输入问题。'
    return
  }

  if (message.length > 2000) {
    error.value = '问题不能超过 2000 字。'
    return
  }

  sending.value = true
  error.value = ''
  reply.value = ''

  controller = new AbortController()
  const timeout = window.setTimeout(() => controller?.abort(), 65000)

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    })

    const contentType = response.headers.get('content-type') || ''

    if (!contentType.includes('application/json')) {
      throw new Error('接口返回异常，请确认后端已启动且接口转发配置正确。')
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '请求失败，请稍后重试。')
    }

    if (typeof data.reply !== 'string' || !data.reply.trim()) {
      throw new Error('暂未收到有效回复，请重试。')
    }

    reply.value = data.reply
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      error.value = '等待回复超时，请稍后重试。'
    } else {
      error.value =
        err instanceof Error ? err.message : '连接失败，请稍后重试。'
    }
  } finally {
    window.clearTimeout(timeout)
    sending.value = false
    controller = null
  }
}

onUnmounted(() => {
  controller?.abort()
})
</script>

<template>
  <section class="assistant">
    <header class="assistant-heading">
      <span class="assistant-icon" aria-hidden="true">✦</span>
      <div>
        <h3>个人介绍助手</h3>
        <p>关于我的学习、兴趣和项目，都可以问问。</p>
      </div>
    </header>

    <form @submit.prevent="sendQuestion">
      <label for="assistant-question">你想了解什么？</label>

      <textarea
        id="assistant-question"
        v-model="question"
        rows="3"
        maxlength="2000"
        placeholder="例如：目前正在做什么项目？"
        :disabled="sending"
        required
      ></textarea>

      <div class="form-bottom">
        <span>{{ question.length }} / 2000</span>
        <button type="submit" :disabled="sending">
          {{ sending ? '正在回复…' : '发送问题 →' }}
        </button>
      </div>
    </form>

    <div class="response" aria-live="polite" :aria-busy="sending">
      <p v-if="sending" class="muted">正在整理回答，请稍候…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else-if="reply" class="reply">{{ reply }}</p>
      <p v-else class="muted">你好！你想先了解我的哪一面？</p>
    </div>
  </section>
</template>

<style scoped>
.assistant {
  padding: 28px;
  border: 1px solid #dfe6dc;
  border-radius: 20px;
  background: #fffdf8;
}

.assistant-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 24px;
}

.assistant-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  color: #fff;
  background: #28664f;
  font-size: 24px;
}

h3 {
  margin: 0;
  font-size: 23px;
}

.assistant-heading p {
  margin: 6px 0 0;
  color: #6c7d73;
  font-size: 15px;
}

label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
}

textarea {
  display: block;
  width: 100%;
  padding: 15px;
  border: 1px solid #dfe6dc;
  border-radius: 12px;
  color: #203d35;
  background: #f7f9f2;
  resize: vertical;
}

textarea:focus {
  outline: 3px solid #91b897;
  outline-offset: 2px;
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
  color: #7b8779;
  font-size: 13px;
}

button {
  padding: 11px 20px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: #28664f;
  cursor: pointer;
}

button:hover {
  background: #1c503d;
}

button:disabled {
  opacity: 0.6;
  cursor: wait;
}

button:focus-visible {
  outline: 3px solid #b8794f;
  outline-offset: 3px;
}

.response {
  min-height: 110px;
  margin-top: 24px;
  padding: 20px;
  border-radius: 14px;
  background: #eef3e8;
}

.response p {
  margin: 0;
  line-height: 1.9;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.muted {
  color: #71806c;
}

.error {
  color: #a63e35;
}

@media (max-width: 600px) {
  .assistant {
    padding: 20px;
  }
}
</style>