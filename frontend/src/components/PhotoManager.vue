<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Photo {
  src: string
  title: string
}

const photos = ref<Photo[]>([])
const password = ref('')
const loading = ref(true)
const saving = ref(false)
const status = ref('正在读取照片…')

onMounted(async () => {
  try {
    const response = await fetch('/api/photos', {
      cache: 'no-store',
    })

    if (!response.ok) throw new Error('读取照片失败。')

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
      throw new Error('照片清单格式不正确。')
    }

    photos.value = data
    status.value = ''
  } catch (error) {
    status.value =
      error instanceof Error ? error.message : '读取失败，请刷新重试。'
  } finally {
    loading.value = false
  }
})

function movePhoto(index: number, step: number) {
  const target = index + step
  const photo = photos.value[index]

  if (!photo || target < 0 || target >= photos.value.length) return

  photos.value.splice(index, 1)
  photos.value.splice(target, 0, photo)
}

function removePhoto(index: number) {
  if (window.confirm('确定移出轮播吗？图片文件不会删除，保存后生效。')) {
    photos.value.splice(index, 1)
  }
}

async function savePhotos() {
  if (saving.value) return

  saving.value = true
  status.value = '正在保存…'

  try {
    const response = await fetch('/api/photos', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Edit-Password': password.value,
      },
      body: JSON.stringify(photos.value),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '保存失败。')
    }

    password.value = ''
    status.value = '保存成功！关闭管理界面后，轮播会重新加载。'
  } catch (error) {
    status.value =
      error instanceof Error ? error.message : '保存失败，请重试。'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="manager">
    <h2>管理照片</h2>
    <p>修改说明、调整顺序或移出轮播后，需要点击保存。</p>

    <form v-if="!loading" @submit.prevent="savePhotos">
      <fieldset :disabled="saving">
        <legend>轮播清单</legend>

        <p v-if="photos.length === 0">当前清单没有照片。</p>

        <article
          v-for="(photo, index) in photos"
          :key="photo.src"
          class="photo-item"
        >
          <img :src="photo.src" :alt="photo.title">

          <div class="photo-info">
            <label :for="`photo-title-${index}`">照片说明</label>
            <input
              :id="`photo-title-${index}`"
              v-model="photo.title"
              maxlength="100"
              required
            >

            <div class="actions">
              <button
                type="button"
                :disabled="index === 0"
                @click="movePhoto(index, -1)"
              >
                上移
              </button>

              <button
                type="button"
                :disabled="index === photos.length - 1"
                @click="movePhoto(index, 1)"
              >
                下移
              </button>

              <button
                type="button"
                class="danger"
                @click="removePhoto(index)"
              >
                移出轮播
              </button>
            </div>
          </div>
        </article>

        <label for="photo-password">编辑密码</label>
        <input
          id="photo-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        >

        <button class="save" type="submit">
          {{ saving ? '正在保存…' : '保存照片清单' }}
        </button>
      </fieldset>
    </form>

    <p role="status">{{ status }}</p>
  </section>
</template>

<style scoped>
.manager {
  padding: 28px;
  background: #fff;
  border: 1px solid #dfe6dc;
  border-radius: 24px;
}

h2 {
  margin-top: 0;
}

fieldset {
  min-width: 0;
  margin: 20px 0;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 16px;
  font-weight: 700;
}

.photo-item {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 20px;
  padding: 18px 0;
  border-top: 1px solid #dfe6dc;
}

img {
  width: 100%;
  height: 120px;
  object-fit: contain;
  border-radius: 12px;
  background: #edf1e9;
}

.photo-info {
  min-width: 0;
}

label {
  display: block;
  font-weight: 600;
}

input {
  width: 100%;
  margin: 8px 0 14px;
  padding: 12px;
  border: 1px solid #dfe6dc;
  border-radius: 10px;
  background: #fafbf7;
  color: #203d35;
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

input:focus-visible,
button:focus-visible {
  outline: 3px solid #91b897;
  outline-offset: 2px;
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
  .manager {
    padding: 20px;
  }

  .photo-item {
    grid-template-columns: 1fr;
  }

  img {
    height: 190px;
  }
}
</style>