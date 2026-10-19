<script setup lang="ts">
import { ref } from 'vue'
import ProfileCard from './components/ProfileCard.vue'
import PhotoCarousel from './components/PhotoCarousel.vue'
import ProfileEditor from './components/ProfileEditor.vue'

const editing = ref(false)
const profileVersion = ref(0)

function handleSaved() {
  profileVersion.value += 1
}
</script>

<template>
  <main class="page">
    <nav class="toolbar" aria-label="资料管理">
      <button type="button" @click="editing = !editing">
        {{ editing ? '返回主页' : '编辑个人资料' }}
      </button>
    </nav>

    <ProfileEditor
      v-if="editing"
      @saved="handleSaved"
    />

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