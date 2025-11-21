<template>
  <div class="video-room-wrapper">
    <div ref="root" class="video-container"></div>

    <!-- Кнопка выхода с высоким z-index -->
    <div class="custom-controls">
       <a-button type="primary" danger shape="round" size="large" @click="leaveRoom">
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
       if (zp) zp.destroy();
       router.push('/messages'); // Возвращаемся в чат
    };

    onMounted(() => {
      const roomId = route.params.roomId;
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/login');
        return;
      }
      const user = JSON.parse(userStr);

      // Уникальный ID для каждой сессии, чтобы не выкидывало
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
        scenario: {mode: ZegoUIKitPrebuilt.OneONoneCall},
        showPreJoinView: false,
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: true,
        showScreenSharingButton: true,
        showLeaveRoomConfirmDialog: false,
        showUserList: false,
        // Если пользователь нажал красную кнопку Zego
        onLeaveRoom: () => {
          router.push('/messages');
        }
      });
    });

    onBeforeUnmount(() => {
      if (zp) zp.destroy();
    });

    return {root, leaveRoom};
  },
};
</script>

<style scoped>
.video-room-wrapper {
  width: 100%;
  height: calc(100vh - 64px);
  position: relative;
  background: #000;
}

.video-container {
  width: 100%;
  height: 100%;
}

.custom-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 99999; /* Очень высокий индекс, чтобы быть поверх видео */
}
</style>