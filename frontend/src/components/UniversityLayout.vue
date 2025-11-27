<template>
  <div class="university-layout">
    <!-- Сюда Vue будет подставлять Dashboard.vue или Students.vue -->
    <router-view />
  </div>
</template>

<script>
export default {
  name: "UniversityLayout"
}
</script>

<style scoped>
.university-layout {
  width: 100%;
  height: 100%;
}
</style>