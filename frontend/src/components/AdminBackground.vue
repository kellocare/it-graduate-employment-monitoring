<template>
  <div class="animated-bg">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
    <div class="glass-overlay"></div>
  </div>
</template>

<style scoped>
.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #f3f4f6; /* Базовый серый */
  z-index: -1; /* Уводим на самый задний план */
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px); /* Сильное размытие для эффекта "меш-градиента" */
  opacity: 0.6;
  animation: float 10s infinite ease-in-out alternate;
}

/* Фиолетовый шар */
.blob-1 {
  top: -10%;
  left: -10%;
  width: 500px;
  height: 500px;
  background: #8b5cf6;
  animation-duration: 12s;
}

/* Синий шар */
.blob-2 {
  bottom: -10%;
  right: -10%;
  width: 600px;
  height: 600px;
  background: #3b82f6;
  animation-duration: 15s;
  animation-delay: -2s;
}

/* Розовый шар */
.blob-3 {
  top: 40%;
  left: 40%;
  width: 400px;
  height: 400px;
  background: #ec4899;
  animation-duration: 18s;
  animation-delay: -5s;
}

/* Легкая сетка или шум поверх (опционально) */
.glass-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(5px);
}

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, 40px) scale(1.1); }
  100% { transform: translate(-20px, -20px) scale(0.9); }
}
</style>