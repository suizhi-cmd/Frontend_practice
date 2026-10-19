<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface Photo {
  src: string
  title: string
}

const photos = ref<Photo[]>([])
const loading = ref(true)
const error = ref('')

const currentIndex = ref(0)
const paused = ref(false)

const currentPhoto = computed(() => photos.value[currentIndex.value])

function changePhoto(step: number) {
  if (photos.value.length === 0) return

  currentIndex.value =
    (currentIndex.value + step + photos.value.length) %
    photos.value.length
}

let timer: ReturnType<typeof setInterval> | undefined
let active = true

onMounted(async () => {
  try {
    const response = await fetch('/api/photos', {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('读取照片失败，请确认后端正常运行。')
    }

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
      throw new Error('照片列表格式不正确。')
    }

    photos.value = data
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : '读取照片失败。'
  } finally {
    loading.value = false
  }

  // 异步读取结束前，组件可能已被移除
  if (!active || photos.value.length < 2) return

  timer = setInterval(() => {
    if (!paused.value) changePhoto(1)
  }, 4000)
})

onUnmounted(() => {
  active = false
  if (timer !== undefined) clearInterval(timer)
})
</script>

<template>
  <section class="carousel">
<header>
  <h2>生活相册</h2>
</header>

<p v-if="loading" role="status">正在加载照片…</p>
<p v-else-if="error" role="alert">{{ error }}</p>
<p v-else-if="photos.length === 0">还没有添加照片。</p>

    <figure v-if="currentPhoto">
      <img :src="currentPhoto.src" :alt="currentPhoto.title">
      <figcaption>{{ currentPhoto.title }}</figcaption>
    </figure>

    <div v-if="photos.length > 0" class="controls">
      <button type="button" @click="changePhoto(-1)">上一张</button>
      <span>{{ currentIndex + 1 }} / {{ photos.length }}</span>
      <button type="button" @click="changePhoto(1)">下一张</button>
      <button
        type="button"
        :aria-pressed="paused"
        @click="paused = !paused"
      >
        {{ paused ? '继续播放' : '暂停播放' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.carousel {
  padding: 28px;
  background: #fff;
  border: 1px solid #dfe6dc;
  border-radius: 24px;
}

.eyebrow {
  color: #28664f;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
}

h2 {
  margin: 10px 0;
  font-size: 26px;
}

header p {
  margin: 0 0 24px;
  color: #6c7d73;
}

figure {
  margin: 0;
}

img {
  display: block;
  width: 100%;
  height: clamp(240px, 40vw, 460px);
  object-fit: contain;
  background: #edf1e9;
  border-radius: 16px;
}

figcaption {
  padding: 16px 0;
  text-align: center;
  overflow-wrap: anywhere;
}

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

button {
  padding: 10px 16px;
  border: 1px solid #dfe6dc;
  border-radius: 10px;
  background: #eef4e9;
  color: #203d35;
  cursor: pointer;
}

button:hover {
  background: #dfead8;
}

button:focus-visible {
  outline: 3px solid #28664f;
  outline-offset: 3px;
}

@media (max-width: 600px) {
  .carousel {
    padding: 20px;
  }
}
.carousel {
  min-width: 0;
  padding: 18px;
  border-radius: 20px;
  box-shadow: 0 12px 32px #203d3508;
}

h2 {
  margin: 0 0 14px;
  font-size: 20px;
}

img {
  height: clamp(240px, 28vw, 360px);
  object-fit: contain;
  border-radius: 12px;
}

figcaption {
  padding: 12px 0;
  font-size: 16px;
}

.controls {
  gap: 8px;
}

button {
  padding: 8px 12px;
  font-size: 14px;
}

@media (max-width: 760px) {
  img {
    height: 280px;
  }
}
</style>