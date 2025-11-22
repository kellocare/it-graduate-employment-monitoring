<template>
  <div class="video-room-wrapper">
    <!-- Контейнер для видео -->
    <div ref="root" class="video-container"></div>

    <!-- Кнопка выхода -->
    <div class="custom-controls">
       <a-button
         type="primary"
         danger
         shape="round"
         size="large"
         @click="leaveRoom"
         class="exit-btn"
       >
         📴 Завершить звонок и вернуться
       </a-button>
    </div>
  </div>
</template>

<script>
import { onMounted, ref, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

export default {
  setup() {
    const route = useRoute();
    const router = useRouter();
    const root = ref(null);
    let zp = null;

    const leaveRoom = () => {
       // 1. Пытаемся уничтожить экземпляр (на всякий случай)
      if (zp) {
        try {
          zp.destroy();
        } catch (e) {
        }
      }

      // 2. ЖЕСТКИЙ ВЫХОД
      // Используем window.location.href вместо router.push.
      // Это перезагрузит страницу, гарантированно уберет черный экран,
      // выключит камеру и вернет кликабельность меню.
      window.location.href = '/messages';
    };

    onMounted(() => {
      const roomId = route.params.roomId;

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/login');
        return;
      }
      const user = JSON.parse(userStr);

      // Уникальный ID + рандом, чтобы не выкидывало
      const userId = user.id.toString() + '_' + Math.floor(Math.random() * 10000);
      const userName = (user.first_name || 'User') + ' ' + (user.last_name || '');

      // --- ТВОИ КЛЮЧИ ---
      const appID = 218194908; // Замени на свой
      const serverSecret = "3f718a07062e4114883dfb0fc6d197e1"; // Замени на свой
      // ------------------

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomId, userId, userName);

      zp = ZegoUIKitPrebuilt.create(kitToken);

      zp.joinRoom({
        container: root.value,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
        showPreJoinView: false,
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: true,
        showScreenSharingButton: true,
        showLeaveRoomConfirmDialog: false,
        showUserList: false,

        // Если пользователь нажал на красную трубку самого Zego интерфейса
        onLeaveRoom: () => {
          window.location.href = '/messages';
        }
      });
    });

    onBeforeUnmount(() => {
      if (zp) {
        try {
          zp.destroy();
        } catch (e) {
        }
      }
    });

    return {root, leaveRoom};
  },
};
</script>

<style scoped>
.video-room-wrapper {
  width: 100%;
  height: calc(100vh - 64px); /* Высота минус навбар */
  position: relative;
  background: #000; /* Черный фон, пока видео грузится */
}

.video-container {
  width: 100%;
  height: 100%;
}

.custom-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10000; /* Очень высокий индекс */
  pointer-events: auto; /* Разрешаем клики */
}

.exit-btn {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  font-weight: bold;
  border: 2px solid white;
}
</style>