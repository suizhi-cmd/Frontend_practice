<script setup lang="ts">
import { ref } from "vue";

defineProps<{ checking: boolean; checkError: string }>();
const emit = defineEmits<{ loggedIn: []; retry: [] }>();
const password = ref("");
const visible = ref(false);
const busy = ref(false);
const error = ref("");

async function login() {
  if (busy.value) return;
  if (!password.value.trim()) {
    error.value = "请先填写访问密码。";
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password.value }),
      signal: AbortSignal.timeout(20000),
    });
    if (
      !(response.headers.get("Content-Type") || "").includes("application/json")
    )
      throw new Error("登录接口尚未就绪，请稍后刷新。");
    const data = await response.json();
    if (!response.ok || data.authenticated !== true)
      throw new Error(data.error || "登录失败，请重试。");
    password.value = "";
    emit("loggedIn");
  } catch (err) {
    error.value =
      err instanceof Error && err.name === "TimeoutError"
        ? "登录等待超时，请检查网络后重试。"
        : err instanceof Error
          ? err.message
          : "登录失败，请稍后重试。";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <img
        class="login-banner"
        src="/illustrations/header-campus.png"
        alt="湖畔校园插画"
      />
      <div class="login-content">
        <span class="login-brand">绥之</span>
        <p class="login-eyebrow">保持好奇，持续更新。</p>
        <h1 id="login-title">欢迎来到我的个人空间</h1>
        <p class="login-description">
          输入访问密码，看看我的学习、项目与生活。
        </p>
        <p v-if="checking" role="status" class="login-description">
          正在检查登录状态…
        </p>
        <template v-else-if="checkError">
          <p class="login-error" role="alert">{{ checkError }}</p>
          <button type="button" class="login-submit" @click="emit('retry')">
            重新连接
          </button>
        </template>
        <form v-else @submit.prevent="login">
          <label for="visitor-password">访问密码</label>
          <div class="password-field">
            <input
              id="visitor-password"
              v-model="password"
              :type="visible ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入访问密码"
              maxlength="256"
              :disabled="busy"
              required
            />
            <button
              type="button"
              class="visibility-button"
              :aria-label="visible ? '隐藏密码' : '显示密码'"
              :aria-pressed="visible"
              @click="visible = !visible"
            >
              {{ visible ? "隐藏" : "显示" }}
            </button>
          </div>
          <p v-if="error" class="login-error" role="alert">{{ error }}</p>
          <button class="login-submit" type="submit" :disabled="busy">
            {{ busy ? "正在验证…" : "进入个人主页 →" }}
          </button>
          <p class="login-hint">访问密码请向主页主人获取。</p>
        </form>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: 28px 16px;
  background: #f8f7f2 url("/illustrations/page-background.png") center / cover;
  color: #203d35;
}
.login-card {
  width: min(100%, 570px);
  overflow: hidden;
  border: 1px solid #dce5d8;
  border-radius: 26px;
  background: #fffefaf5;
  box-shadow: 0 18px 60px #203d3512;
}
.login-banner {
  display: block;
  width: 100%;
  height: 190px;
  object-fit: cover;
  object-position: center 60%;
}
.login-content {
  padding: 30px 36px 34px;
}
.login-brand {
  font-size: 30px;
  font-weight: 700;
}
.login-eyebrow {
  margin: 0 0 22px;
  font-size: 13px;
  color: #6c786b;
}
h1 {
  margin: 0 0 12px;
  font-size: clamp(23px, 5vw, 29px);
  line-height: 1.5;
}
.login-description {
  margin: 0 0 24px;
  color: #627569;
  font-size: 14px;
}
label {
  display: block;
  margin-bottom: 9px;
  font-weight: 600;
}
.password-field {
  display: flex;
  align-items: center;
  border: 1px solid #c8d7c4;
  border-radius: 12px;
  background: #fff;
}
input {
  width: 100%;
  min-width: 0;
  padding: 14px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font: inherit;
}
.visibility-button {
  flex-shrink: 0;
  margin-right: 8px;
  padding: 7px;
  border: 0;
  background: transparent;
  color: #42634e;
  cursor: pointer;
}
.login-submit {
  display: block;
  width: 100%;
  margin-top: 18px;
  padding: 14px;
  border: 0;
  border-radius: 12px;
  background: #28664f;
  color: #fff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.login-submit:disabled {
  opacity: 0.6;
  cursor: wait;
}
.login-hint {
  margin: 14px 0 0;
  color: #7b8576;
  font-size: 12px;
  text-align: center;
}
.login-error {
  color: #9e4537;
  font-size: 14px;
  overflow-wrap: anywhere;
}
button:focus-visible,
input:focus-visible {
  outline: 3px solid #91b897;
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .login-page {
    background-size: 100% 100%;
  }
  .login-banner {
    height: 150px;
  }
  .login-content {
    padding: 24px;
  }
}
</style>
