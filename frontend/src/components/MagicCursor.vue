<template>
  <div class="magic-cursor-follower" :class="{ 'hovered': isHovered }" :style="followerStyle"></div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';

export default {
  setup() {
    // Начальная позиция - середина экрана
    const posX = ref(window.innerWidth / 2);
    const posY = ref(window.innerHeight / 2);
    const mouseX = ref(window.innerWidth / 2);
    const mouseY = ref(window.innerHeight / 2);

    const isHovered = ref(false);

    // Плавное следование
    const updatePosition = () => {
      const dt = 0.15; // Скорость
      posX.value += (mouseX.value - posX.value) * dt;
      posY.value += (mouseY.value - posY.value) * dt;
      requestAnimationFrame(updatePosition);
    };

    const handleMouseMove = (e) => {
      mouseX.value = e.clientX;
      mouseY.value = e.clientY;

      // Проверка наведения на интерактивные элементы
      const target = e.target;
      if (
         target.tagName === 'A' ||
         target.tagName === 'BUTTON' ||
         target.closest('a') ||
         target.closest('button') ||
         target.closest('.ant-btn') ||
         target.classList.contains('cursor-hover')
      ) {
        isHovered.value = true;
      } else {
        isHovered.value = false;
      }
    };

    onMounted(() => {
      window.addEventListener('mousemove', handleMouseMove);
      requestAnimationFrame(updatePosition);
    });

    onUnmounted(() => {
      window.removeEventListener('mousemove', handleMouseMove);
    });

    const followerStyle = computed(() => ({
      transform: `translate3d(${posX.value}px, ${posY.value}px, 0)`
    }));

    return { followerStyle, isHovered };
  }
}
</script>

<style scoped>
.magic-cursor-follower {
  position: fixed;
  top: -15px;
  left: -15px;
  width: 30px;
  height: 30px;
  border: 2px solid #764ba2;
  border-radius: 50%;
  z-index: 99999;
  pointer-events: none;
  transition: width 0.3s, height 0.3s, background-color 0.3s, border-color 0.3s, top 0.3s, left 0.3s;
}

.magic-cursor-follower.hovered {
  width: 50px;
  height: 50px;
  top: -25px;
  left: -25px;
  background-color: rgba(118, 75, 162, 0.1);
  border-color: #6366f1;
}
</style>