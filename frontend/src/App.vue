<script setup lang="ts">
import { ref } from 'vue'
import ProfileCard from './components/ProfileCard.vue'
import PhotoCarousel from './components/PhotoCarousel.vue'
import ProfileEditor from './components/ProfileEditor.vue'
import PhotoManager from './components/PhotoManager.vue'

const editing = ref(false)
const hasUnsavedChanges = ref(false)
const managingPhotos = ref(false)

function togglePhotos() {
  managingPhotos.value = !managingPhotos.value
}

function toggleEditing() {
  if (
    editing.value &&
    hasUnsavedChanges.value &&
    !window.confirm('资料尚未保存，确定放弃修改并返回主页吗？')
  ) {
    return
  }

  hasUnsavedChanges.value = false
  editing.value = !editing.value
}
const profileVersion = ref(0)

function handleSaved() {
  profileVersion.value += 1
}
</script>

<template>
  <main class="page">
    <nav class="toolbar" aria-label="内容管理">
  <button
    v-if="!managingPhotos"
    type="button"
    @click="toggleEditing"
  >
    {{ editing ? '返回主页' : '编辑个人资料' }}
  </button>

  <button
    v-if="!editing"
    type="button"
    @click="togglePhotos"
  >
    {{ managingPhotos ? '关闭照片管理' : '管理照片' }}
  </button>
</nav>

    <ProfileEditor
      v-if="editing"
      @saved="handleSaved"
      @dirty="hasUnsavedChanges = $event"
    />

    <PhotoManager v-else-if="managingPhotos" />

    <template v-else>
      <ProfileCard :key="profileVersion" />
      <PhotoCarousel />
    </template>
  </main>
</template>

<style scoped>
.page {
  display: grid;
  gap: 24px;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 40px 20px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar button {
  padding: 10px 18px;
  border: 1px solid #dfe6dc;
  border-radius: 12px;
  background: #fff;
  color: #28664f;
  cursor: pointer;
}

.toolbar button:focus-visible {
  outline: 3px solid #28664f;
  outline-offset: 3px;
}
</style>