<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface Photo {
  src: string
  title: string
}

const photos: Photo[] = [
  { src: '/images/校庆志愿者.jpg', title: '校庆优秀志愿者' },
  { src: '/images/出征仪式.jpg', title: '支教队出征仪式' },
  { src: '/images/开营2.jpeg', title: '支教队社区课堂' },
  { src: '/images/校外义卖.jpg', title: '支教队校外义卖活动' },
  { src: '/images/草地音乐节.jpg', title: '草地音乐节' },
  { src: '/images/迎新晚会.jpg', title: '迎新晚会' },
  { src: '/images/国际交流1.jpg', title: '英国参加国际交流' },
  { src: '/images/国际交流2.jpg', title: '英国交流学习答辩获得成功' },
]

const currentIndex = ref(0)
const paused = ref(false)

const currentPhoto = computed(() => photos[currentIndex.value])

function changePhoto(step: number) {
  currentIndex.value =
    (currentIndex.value + step + photos.length) % photos.length
}

let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(() => {
    if (!paused.value) changePhoto(1)
  }, 4000)
})

onUnmounted(() => {
  if (timer !== undefined) clearInterval(timer)
})
</script>

<template>
  <section class="carousel">
    <header>
      <span class="eyebrow">LIFE IN FRAMES</span>
      <h2>我的校园与生活</h2>
      <p>把值得记住的瞬间，留在这里。</p>
    </header>

    <figure v-if="currentPhoto">
      <img :src="currentPhoto.src" :alt="currentPhoto.title">
      <figcaption>{{ currentPhoto.title }}</figcaption>
    </figure>

    <div class="controls">
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
</style>