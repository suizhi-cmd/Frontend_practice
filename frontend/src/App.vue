<script setup lang="ts">
import ProfileCard from './components/ProfileCard.vue'
import PhotoCarousel from './components/PhotoCarousel.vue'
</script>

<template>
  <main class="page">
    <ProfileCard />
    <PhotoCarousel />
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
</style>