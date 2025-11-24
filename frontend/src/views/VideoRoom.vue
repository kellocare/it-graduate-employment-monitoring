<template>
  <!-- Обертка на весь экран -->
  <div class="video-room-fixed">

    <!-- Кнопка выхода (поверх видео) -->
    <div class="custom-controls">
       <a-button
         type="primary"
         danger
         shape="round"
         size="large"
         @click="leaveRoom"
         class="exit-btn"
       >
         <arrow-left-outlined /> Завершить звонок и вернуться
       </a-button>
    </div>

    <!-- Контейнер для ZegoCloud -->
    <div ref="root" class="video-container"></div>
  </div>
</template>

<script>
import { onMounted, ref, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { ArrowLeftOutlined } from '@ant-design/icons-vue';

export default {
  components: { ArrowLeftOutlined },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const root = ref(null);
    let zp = null;

    const leaveRoom = () => {
      if (zp) {
        try {
          zp.destroy();
        } catch (e) {
          console.error(e);
        }
      }
      // Жесткий редирект для гарантированного отключения камеры/микрофона
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
      // Генерируем уникальный ID пользователя для сессии
      const userId = user.id.toString() + '_' + Math.floor(Math.random() * 10000);
      const userName = (user.first_name || 'User') + ' ' + (user.last_name || '');

      // ТВОИ КЛЮЧИ
      const appID = 218194908;
      const serverSecret = "3f718a07062e4114883dfb0fc6d197e1";

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        roomId,
        userId,
        userName
      );

      zp = ZegoUIKitPrebuilt.create(kitToken);

      zp.joinRoom({
        container: root.value,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall, // Режим 1 на 1
        },
        showPreJoinView: false, // Сразу заходим без превью
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: true,
        showScreenSharingButton: true,
        showLeaveRoomConfirmDialog: false,
        showUserList: false,
        layout: "Auto",

        // Обработка выхода через интерфейс Zego
        onLeaveRoom: () => {
          window.location.href = '/messages';
        }
      });
    });

    onBeforeUnmount(() => {
      if (zp) {
        try {
          zp.destroy();
        } catch (e) {}
      }
    });

    return { root, leaveRoom };
  },
};
</script>

<style scoped>
/*
   ВАЖНО: position: fixed вырывает блок из потока.
   z-index: 9999 гарантирует, что видео будет ПОВЕРХ сайдбара и навбара.
*/
.video-room-fixed {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #000; /* Черный фон для кинотеатрального эффекта */
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.video-container {
  width: 100%;
  height: 100%;
}

.custom-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10000; /* Кнопка должна быть выше видео */
}

.exit-btn {
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(5px);
}
</style>