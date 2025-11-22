<template>
  <div class="particles-container">
    <div v-for="n in 15" :key="n" class="particle"></div>
  </div>
</template>

<style scoped>
.particles-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
  opacity: 0.4;
  animation: float linear infinite;
}

.particle:nth-child(odd) {
  border-width: 0 20px 35px 20px;
  border-color: transparent transparent rgba(102, 126, 234, 0.2) transparent;
}
.particle:nth-child(even) {
  width: 20px; height: 20px;
  border: none;
  background: rgba(118, 75, 162, 0.15);
  transform: rotate(45deg);
}

.particle:nth-child(1) { left: 10%; top: 100%; animation-duration: 15s; animation-delay: 0s; transform: scale(1.2); }
.particle:nth-child(2) { left: 20%; top: 100%; animation-duration: 12s; animation-delay: 2s; transform: scale(0.8) rotate(45deg); }
.particle:nth-child(3) { left: 35%; top: 100%; animation-duration: 18s; animation-delay: 4s; }
.particle:nth-child(4) { left: 50%; top: 100%; animation-duration: 20s; animation-delay: 0s; transform: scale(1.5); }
.particle:nth-child(5) { left: 65%; top: 100%; animation-duration: 14s; animation-delay: 1s; }
.particle:nth-child(6) { left: 80%; top: 100%; animation-duration: 16s; animation-delay: 3s; }
.particle:nth-child(7) { left: 90%; top: 100%; animation-duration: 19s; animation-delay: 5s; }
.particle:nth-child(8) { left: 5%; top: 100%; animation-duration: 13s; animation-delay: 6s; }
.particle:nth-child(9) { left: 15%; top: 100%; animation-duration: 17s; animation-delay: 2s; }
.particle:nth-child(10) { left: 45%; top: 100%; animation-duration: 22s; animation-delay: 1s; }
.particle:nth-child(11) { left: 55%; top: 100%; animation-duration: 15s; animation-delay: 3s; }
.particle:nth-child(12) { left: 70%; top: 100%; animation-duration: 18s; animation-delay: 0s; }
.particle:nth-child(13) { left: 85%; top: 100%; animation-duration: 12s; animation-delay: 4s; }
.particle:nth-child(14) { left: 25%; top: 100%; animation-duration: 16s; animation-delay: 2s; }
.particle:nth-child(15) { left: 75%; top: 100%; animation-duration: 20s; animation-delay: 1s; }

@keyframes float {
  0% { transform: translateY(0) rotate(0deg); opacity: 0; }
  10% { opacity: 0.5; }
  90% { opacity: 0.5; }
  100% { transform: translateY(-120vh) rotate(360deg); opacity: 0; }
}
</style>