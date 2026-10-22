<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Reply { id: string; text: string; time: string }
interface Message { id: string; name: string; text: string; time: string; replies: Reply[] }
const messages = ref<Message[]>([])
const total = ref(0)
const name = ref('')
const draft = ref('')
const draftId = ref(crypto.randomUUID())
const error = ref('')
const status = ref('')
const loading = ref(false)
const busy = ref(false)
const ready = ref(false)
const adminOpen = ref(false)
const password = ref('')
const replyingTo = ref('')
const replyDraft = ref('')
const replyId = ref(crypto.randomUUID())

async function api(path: string, method = 'GET', body?: object, admin = false) {
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(admin ? { 'X-Edit-Password': password.value } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  })
  if (!(response.headers.get('Content-Type') || '').includes('application/json')) {
    throw new Error('留言接口尚未就绪，请稍后刷新。')
  }
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '操作失败，请稍后重试。')
  return data
}

async function loadMessages(more = false) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await api(`/api/messages?offset=${more ? messages.value.length : 0}`)
    if (!Array.isArray(data.messages) || typeof data.total !== 'number') throw new Error('留言格式异常。')
    if (more) {
      const existing = new Set(messages.value.map(item => item.id))
      messages.value.push(...data.messages.filter((item: Message) => !existing.has(item.id)))
    } else {
      messages.value = data.messages
    }
    total.value = data.total
    ready.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取留言失败，请重试。'
  } finally {
    loading.value = false
  }
}

async function publishMessage() {
  if (busy.value || !draft.value.trim()) return
  busy.value = true
  error.value = ''
  status.value = ''
  try {
    await api('/api/messages', 'POST', { id: draftId.value, name: name.value.trim(), text: draft.value.trim() })
    draft.value = ''
    draftId.value = crypto.randomUUID()
    status.value = '留言已发布，所有访客都可以看到。'
    await loadMessages()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '发布失败，请稍后重试。'
  } finally { busy.value = false }
}

function toggleAdmin() {
  adminOpen.value = !adminOpen.value
  if (!adminOpen.value) {
    password.value = ''
    replyingTo.value = ''
    replyDraft.value = ''
  }
}

function startReply(id: string) {
  if (replyDraft.value && !window.confirm('放弃当前未发送的回复吗？')) return
  replyingTo.value = replyingTo.value === id ? '' : id
  replyDraft.value = ''
  replyId.value = crypto.randomUUID()
}

async function sendReply(messageId: string) {
  if (busy.value || !replyDraft.value.trim()) return
  busy.value = true
  error.value = ''
  status.value = ''
  try {
    const data = await api('/api/messages/reply', 'POST', {
      messageId, id: replyId.value, text: replyDraft.value.trim(),
    }, true)
    messages.value = messages.value.map(item => item.id === messageId ? data.message : item)
    replyingTo.value = ''
    replyDraft.value = ''
    replyId.value = crypto.randomUUID()
    status.value = '站主回复已发布。'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '回复失败，请重试。'
  } finally { busy.value = false }
}

async function removeMessage(messageId: string, replyId?: string) {
  if (busy.value || !window.confirm(replyId ? '确定删除这条回复吗？' : '确定删除这条留言及其全部回复吗？')) return
  busy.value = true
  error.value = ''
  status.value = ''
  try {
    await api('/api/messages', 'DELETE', { messageId, replyId }, true)
    if (replyId) {
      messages.value = messages.value.map(item => item.id === messageId
        ? { ...item, replies: item.replies.filter(reply => reply.id !== replyId) } : item)
    } else {
      messages.value = messages.value.filter(item => item.id !== messageId)
      total.value = Math.max(0, total.value - 1)
      if (replyingTo.value === messageId) { replyingTo.value = ''; replyDraft.value = '' }
    }
    status.value = '已删除。'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败，请重试。'
  } finally { busy.value = false }
}

function formatTime(time: string) {
  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN')
}
onMounted(() => loadMessages())
</script>

<template>
  <section class="message-board" aria-labelledby="message-board-title">
    <header class="message-heading">
      <h2 id="message-board-title">留下一点想法</h2>
      <p>关于页面、项目，或者一句简单的问候。</p>
      <img class="message-illustration" src="/illustrations/message.png" alt="" aria-hidden="true">
    </header>

    <form @submit.prevent="publishMessage">
      <label for="message-name">昵称（选填）</label>
      <input id="message-name" v-model="name" maxlength="30" placeholder="怎么称呼你？" :disabled="busy">
      <label for="message-draft">你的留言</label>
      <textarea id="message-draft" v-model="draft" rows="3" maxlength="1000"
        placeholder="想说的话，写在这里……" :disabled="busy || !ready" required></textarea>
      <div class="form-bottom">
        <span>留言和站主回复会公开展示，请勿填写私人信息。</span>
        <button type="submit" :disabled="busy || !ready || !draft.trim()">{{ busy ? '正在处理…' : '发布留言' }}</button>
      </div>
    </form>

    <div class="board-tools">
      <button type="button" class="quiet-button" :disabled="busy || loading" @click="loadMessages()">{{ loading ? '正在读取…' : '刷新留言' }}</button>
      <button type="button" class="quiet-button" :aria-expanded="adminOpen" :disabled="busy" @click="toggleAdmin">{{ adminOpen ? '收起管理' : '站主管理' }}</button>
    </div>
    <div v-if="adminOpen" class="admin-panel">
      <label for="message-admin-password">管理密码</label>
      <input id="message-admin-password" v-model="password" type="password" autocomplete="current-password" :disabled="busy" placeholder="输入你的编辑密码">
      <p>填写后可回复或删除留言，关闭管理后会清空密码。</p>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="status" class="notice" role="status">{{ status }}</p>
    <p v-if="!ready && loading" role="status">正在读取留言…</p>
    <p v-if="ready && !messages.length" class="empty">还没有留言，写下第一条吧。</p>

    <ul v-if="messages.length" class="message-list">
      <li v-for="message in messages" :key="message.id" class="message-item">
        <strong class="visitor-name">{{ message.name }}</strong>
        <p class="message-text">{{ message.text }}</p>
        <div class="message-meta">
          <time :datetime="message.time">{{ formatTime(message.time) }}</time>
          <div v-if="adminOpen" class="admin-actions">
            <button type="button" class="quiet-button" :disabled="busy" @click="startReply(message.id)">回复</button>
            <button type="button" class="delete-button" :disabled="busy || !password" @click="removeMessage(message.id)">删除留言</button>
          </div>
        </div>
        <div v-for="reply in message.replies" :key="reply.id" class="owner-reply">
          <span class="owner-badge">绥之 · 站主</span>
          <p class="message-text">{{ reply.text }}</p>
          <div class="message-meta">
            <time :datetime="reply.time">{{ formatTime(reply.time) }}</time>
            <button v-if="adminOpen" type="button" class="delete-button" :disabled="busy || !password" @click="removeMessage(message.id, reply.id)">删除回复</button>
          </div>
        </div>
        <form v-if="adminOpen && replyingTo === message.id" class="reply-form" @submit.prevent="sendReply(message.id)">
          <label :for="`reply-${message.id}`">以站主身份回复</label>
          <textarea :id="`reply-${message.id}`" v-model="replyDraft" rows="2" maxlength="1000" :disabled="busy" required></textarea>
          <div class="form-bottom">
            <span>回复会显示在这条留言下方。</span>
            <button type="submit" :disabled="busy || !password || !replyDraft.trim()">发布回复</button>
          </div>
        </form>
      </li>
    </ul>
    <button v-if="messages.length < total" class="load-more" type="button" :disabled="loading || busy" @click="loadMessages(true)">{{ loading ? '正在读取…' : '查看更多留言' }}</button>
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

.message-heading {
  position: relative;
  min-height: 120px;
  padding-right: 130px;
}

.message-illustration {
  position: absolute;
  right: -8px;
  top: -14px;
  width: 135px;
  height: 135px;
  object-fit: contain;
  pointer-events: none;
}

@media (max-width: 600px) {
  .message-heading {
    padding-right: 90px;
    min-height: 105px;
  }

  .message-illustration {
    width: 95px;
    height: 105px;
    top: 0;
  }
}
input {
  display: block;
  width: 100%;
  min-width: 0;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #d8e0d2;
  border-radius: 12px;
  background: #fffdf8;
  color: #203d35;
  font: inherit;
}
input:focus-visible { outline: 3px solid #91b897; outline-offset: 3px; }
.board-tools, .admin-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.board-tools { margin-top: 18px; justify-content: space-between; }
.quiet-button { padding: 6px 10px; background: #edf3e7; color: #355547; }
.admin-panel { margin-top: 14px; padding: 16px; background: #ffffffb3; border: 1px solid #dfe6dc; border-radius: 12px; }
.admin-panel p { margin: 0; color: #6c786b; font-size: 13px; }
.visitor-name { display: block; margin-bottom: 8px; overflow-wrap: anywhere; }
.owner-reply { margin-top: 16px; padding: 14px; border-left: 3px solid #92b393; border-radius: 0 10px 10px 0; background: #edf3e7; }
.owner-badge { display: inline-block; margin-bottom: 8px; color: #28664f; font-weight: 600; font-size: 13px; }
.reply-form { margin-top: 16px; }
.notice { color: #28664f; }
.load-more { display: block; margin: 20px auto 0; }
.message-meta { flex-wrap: wrap; }
</style>