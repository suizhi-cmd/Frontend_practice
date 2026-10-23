<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

interface Photo {
  src: string;
  title: string;
}

const photos = ref<Photo[]>([]);
const loading = ref(true);
const error = ref("");

const currentIndex = ref(0);
const paused = ref(false);

const currentPhoto = computed(() => photos.value[currentIndex.value]);

function changePhoto(step: number) {
  if (photos.value.length === 0) return;

  currentIndex.value =
    (currentIndex.value + step + photos.value.length) % photos.value.length;
}

let timer: ReturnType<typeof setInterval> | undefined;
let active = true;

onMounted(async () => {
  try {
    const response = await fetch("/api/photos", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("读取照片失败，请确认后端正常运行。");
    }

    const data: unknown = await response.json();

    if (
      !Array.isArray(data) ||
      !data.every(
        (photo) =>
          photo !== null &&
          typeof photo === "object" &&
          typeof photo.src === "string" &&
          typeof photo.title === "string",
      )
    ) {
      throw new Error("照片列表格式不正确。");
    }

    photos.value = data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "读取照片失败。";
  } finally {
    loading.value = false;
  }

  // 异步读取结束前，组件可能已被移除
  if (!active || photos.value.length < 2) return;

  timer = setInterval(() => {
    if (!paused.value) changePhoto(1);
  }, 4000);
});

onUnmounted(() => {
  active = false;
  if (timer !== undefined) clearInterval(timer);
});
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
      <img :src="currentPhoto.src" :alt="currentPhoto.title" />
      <figcaption>{{ currentPhoto.title }}</figcaption>
    </figure>

    <div v-if="photos.length > 1" class="thumbnails" aria-label="选择照片">
      <button
        v-for="(photo, index) in photos"
        :key="photo.src"
        type="button"
        class="thumbnail"
        :class="{ selected: currentIndex === index }"
        :aria-label="`查看第 ${index + 1} 张：${photo.title}`"
        :aria-pressed="currentIndex === index"
        @click="
          currentIndex = index;
          paused = true;
        "
      >
        <img :src="photo.src" alt="" loading="lazy" />
      </button>
    </div>

    <div v-if="photos.length > 0" class="controls">
      <button type="button" @click="changePhoto(-1)">上一张</button>
      <span>{{ currentIndex + 1 }} / {{ photos.length }}</span>
      <button type="button" @click="changePhoto(1)">下一张</button>
      <button type="button" :aria-pressed="paused" @click="paused = !paused">
        {{ paused ? "继续播放" : "暂停播放" }}
      </button>
    </div>
  </section>
</template>

<style scoped>
/* 轮播卡片与主图 */
.carousel {
  min-width: 0;
  padding: 16px;
  background: #fff;
  border: 1px solid #dfe6dc;
  border-radius: 24px;
  box-shadow: 0 12px 28px #26452c0b;
}
h2 {
  margin: 0 0 14px;
  font-size: 20px;
}
figure {
  margin: 0;
}
img {
  display: block;
  width: 100%;
  height: clamp(240px, 28vw, 360px);
  object-fit: contain;
  background: #edf1e9;
  border-radius: 12px;
}
figcaption {
  padding: 12px 0;
  color: #294b36;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
/* 前后切换与播放控制 */
.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
button {
  padding: 7px 12px;
  border: 1px solid #bcccaf;
  border-radius: 20px;
  background: #ffffff70;
  color: #42623b;
  font-size: 13px;
  cursor: pointer;
}
button:hover {
  background: #dfead8;
}
button:focus-visible {
  outline: 3px solid #28664f;
  outline-offset: 3px;
}
/* 缩略图 */
.thumbnails {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 6px 4px 12px;
  margin-bottom: 10px;
}
.thumbnail {
  flex: 0 0 76px;
  padding: 3px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: #edf1e9;
  cursor: pointer;
}
.thumbnail img {
  display: block;
  width: 100%;
  height: 54px;
  object-fit: contain;
  border-radius: 5px;
}
.thumbnail:hover,
.thumbnail.selected {
  background: #dfe8d7;
}
.thumbnail.selected {
  border-color: #28664f;
}
.thumbnail:focus-visible {
  outline: 3px solid #b8794f;
  outline-offset: 2px;
}
/* 手机：只调整主图，保留缩略图尺寸 */
@media (max-width: 760px) {
  figure > img {
    height: 280px;
  }
}
</style>
