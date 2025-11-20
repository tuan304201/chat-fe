<script setup>
import { ref, onMounted, nextTick, computed } from "vue";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import { useInfiniteScroll } from "@vueuse/core";
import { Icon } from "@iconify/vue";
import MessageBubble from "@/components/chat/MessageBubble.vue";
import Sidebar from "@/components/layout/Sidebar.vue";

const chatStore = useChatStore();
const authStore = useAuthStore();
const userStore = useUserStore();

const msgContainer = ref(null);
const msgInput = ref("");
const replyingTo = ref(null);

// --- LOGIC ---

// Lấy avatar tự động
const getAvatar = (user) => {
  if (user?.avatarUrl) return user.avatarUrl;
  const name = user?.displayName || "U";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
};

const partner = computed(() => {
  const conv = chatStore.currentConversation;
  if (!conv || conv.type === "group") return null;
  const myId = authStore.user.id;
  const member = conv.members.find((m) => {
    const uId = m.userId?._id || m.userId;
    return uId !== myId;
  });
  return member && typeof member.userId === "object" ? member.userId : null;
});

const relationship = computed(() => {
  if (!partner.value) return "FRIEND";
  return userStore.getRelationship(partner.value._id);
});

const canChat = computed(() => {
  if (relationship.value === "FRIEND") return true;
  // Kiểm tra xem mình đã gửi tin nhắn nào chưa
  const myMsgCount = chatStore.messages.filter((m) => m.sender._id === authStore.user.id).length;
  return myMsgCount < 1;
});

// --- ACTIONS ---

const handleSendFriendRequest = async () => {
  if (!partner.value) return;
  try {
    await userStore.sendFriendRequest(partner.value._id);
  } catch (e) {
    alert(e);
  }
};

const handleAcceptRequest = async () => {
  const reqId = userStore.getRequestId(partner.value._id);
  if (reqId) {
    await userStore.acceptFriendRequest(reqId);
    // Fix lỗi: Load lại data ngay lập tức để mở khóa chat
    await userStore.initData();
  }
};

const handleSend = async () => {
  if (!msgInput.value.trim()) return;
  try {
    await chatStore.sendMessage({
      type: "text",
      text: msgInput.value,
      replyToId: replyingTo.value?._id,
    });
    msgInput.value = "";
    replyingTo.value = null;
    scrollToBottom();
  } catch (err) {
    alert("Gửi thất bại: " + err);
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight;
  });
};

onMounted(async () => {
  chatStore.connectSocket();
  await userStore.initData();
});

useInfiniteScroll(
  msgContainer,
  async () => {
    if (chatStore.isLoadingMessages || !chatStore.messages.length || !chatStore.hasMoreMessages) return;
    if (msgContainer.value.scrollTop > 50) return;
    const oldScrollHeight = msgContainer.value.scrollHeight;
    const oldestMsg = chatStore.messages[0];
    await chatStore.fetchMessages(chatStore.currentConversationId, oldestMsg._id);
    nextTick(() => {
      msgContainer.value.scrollTop = msgContainer.value.scrollHeight - oldScrollHeight;
    });
  },
  { direction: "top", distance: 20 },
);

const onRecall = (id) => chatStore.socket.emit("message:recall", { messageId: id });
const onReact = (id, emoji) => chatStore.socket.emit("message:react", { messageId: id, emoji });
const onReply = (msg) => {
  replyingTo.value = msg;
  nextTick(() => document.getElementById("chatInput").focus());
};
</script>

<template>
  <div class="flex h-screen bg-white overflow-hidden font-sans">
    <Sidebar />

    <div class="flex-1 flex flex-col min-w-0 relative bg-[#eef0f1]">
      <div
        v-if="!chatStore.currentConversationId"
        class="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white"
      >
        <div class="mb-4 opacity-80">
          <Icon icon="logos:google-chat" class="text-9xl opacity-20 grayscale" />
        </div>
        <h2 class="text-xl font-medium text-gray-700">Chào mừng đến với Zalo Clone</h2>
        <p class="text-sm mt-2 text-gray-400">Khám phá những tiện ích hỗ trợ làm việc và trò chuyện</p>
      </div>

      <template v-else>
        <div
          class="h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between shadow-sm shrink-0 z-10"
        >
          <div class="flex items-center gap-3">
            <img
              :src="
                chatStore.currentConversation?.type === 'group'
                  ? getAvatar(chatStore.currentConversation)
                  : getAvatar(partner)
              "
              class="w-10 h-10 rounded-full border object-cover"
            />
            <div>
              <div class="font-bold text-[17px] text-gray-800 leading-tight">
                {{
                  chatStore.currentConversation?.type === "group"
                    ? chatStore.currentConversation.title
                    : partner?.displayName || "Đang tải..."
                }}
              </div>
              <div class="flex items-center gap-1.5 text-xs mt-0.5">
                <span v-if="relationship === 'FRIEND'" class="flex items-center gap-1 text-gray-500">
                  <Icon icon="mdi:account-check" class="text-blue-500 text-sm" /> Bạn bè
                </span>
                <span v-else class="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">Người lạ</span>

                <span class="text-gray-300">|</span>
                <span class="text-green-500 flex items-center gap-0.5"
                  ><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online</span
                >
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 text-gray-500">
            <button
              v-if="partner && relationship === 'NONE'"
              @click="handleSendFriendRequest"
              class="bg-blue-50 text-[#0091ff] px-3 py-1.5 rounded font-medium text-sm hover:bg-blue-100 transition flex items-center gap-1"
            >
              <Icon icon="mdi:account-plus" /> Kết bạn
            </button>
            <button class="hover:bg-gray-100 p-2 rounded"><Icon icon="mdi:magnify" class="text-xl" /></button>
            <button class="hover:bg-gray-100 p-2 rounded"><Icon icon="mdi:video-outline" class="text-xl" /></button>
            <button class="hover:bg-gray-100 p-2 rounded"><Icon icon="mdi:dock-right" class="text-xl" /></button>
          </div>
        </div>

        <div
          v-if="relationship === 'SENT'"
          class="bg-blue-50 p-3 flex items-center justify-between px-6 border-b border-blue-100 text-sm text-blue-800"
        >
          <div class="flex items-center gap-2">
            <Icon icon="mdi:clock-time-four-outline" class="text-lg" />
            Lời mời kết bạn đang chờ phản hồi.
          </div>
          <button class="font-medium hover:underline">Thu hồi</button>
        </div>

        <div
          v-if="relationship === 'RECEIVED'"
          class="absolute top-20 left-4 right-4 bg-white p-4 shadow-lg rounded-lg border border-blue-200 z-20 flex items-center gap-4 animate-fade-in-down"
        >
          <img :src="getAvatar(partner)" class="w-12 h-12 rounded-full border" />
          <div class="flex-1">
            <div class="font-bold text-gray-800 text-sm">Xin chào, mình là {{ partner?.displayName }}</div>
            <div class="text-sm text-gray-500">Kết bạn với mình nhé!</div>
          </div>
          <div class="flex gap-2">
            <button
              @click="handleAcceptRequest"
              class="bg-[#0091ff] text-white px-4 py-1.5 rounded hover:bg-blue-600 font-medium text-sm"
            >
              Đồng ý
            </button>
            <button class="bg-gray-100 text-gray-600 px-4 py-1.5 rounded hover:bg-gray-200 font-medium text-sm">
              Bỏ qua
            </button>
          </div>
        </div>

        <div ref="msgContainer" class="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
          <div v-if="chatStore.isLoadingMessages" class="text-center py-2 text-gray-400">
            <span class="animate-spin">⏳</span>
          </div>

          <MessageBubble
            v-for="msg in chatStore.messages"
            :key="msg._id"
            :message="msg"
            @recall="onRecall"
            @react="onReact"
            @reply="onReply"
          />

          <div
            v-if="!canChat && relationship !== 'FRIEND'"
            class="bg-white p-3 rounded-md shadow-sm text-center text-sm text-gray-500 mx-auto max-w-md my-4 border"
          >
            Bạn chưa thể gửi tin nhắn cho người này. <br />
            <span
              v-if="relationship === 'NONE'"
              class="text-blue-600 cursor-pointer font-medium hover:underline"
              @click="handleSendFriendRequest"
            >
              Gửi lời mời kết bạn ngay
            </span>
            <span v-else>Vui lòng chờ đối phương chấp nhận.</span>
          </div>
        </div>

        <div class="bg-white border-t border-gray-200 shrink-0 pb-2">
          <div class="h-10 flex items-center px-2 gap-1 border-b border-gray-100 mb-1">
            <button class="p-2 hover:bg-gray-100 rounded text-gray-600" title="Sticker">
              <Icon icon="mdi:sticker-emoji" class="text-xl" />
            </button>
            <button class="p-2 hover:bg-gray-100 rounded text-gray-600" title="Gửi Ảnh">
              <Icon icon="mdi:image-outline" class="text-xl" />
            </button>
            <button class="p-2 hover:bg-gray-100 rounded text-gray-600" title="Đính kèm File">
              <Icon icon="mdi:paperclip" class="text-xl" />
            </button>
            <button class="p-2 hover:bg-gray-100 rounded text-gray-600" title="Chụp màn hình">
              <Icon icon="mdi:monitor-screenshot" class="text-xl" />
            </button>
            <div class="flex-1"></div>
            <button class="p-2 hover:bg-gray-100 rounded text-gray-600">
              <Icon icon="mdi:format-font" class="text-xl" />
            </button>
          </div>

          <div
            v-if="replyingTo"
            class="px-4 py-2 bg-gray-50 flex justify-between items-center text-sm border-l-4 border-[#0091ff] mx-4 mb-2 rounded-r shadow-sm"
          >
            <div><span class="font-bold text-gray-700">Đang trả lời:</span> {{ replyingTo.text || "[File]" }}</div>
            <button @click="replyingTo = null" class="text-gray-400 hover:text-red-500">
              <Icon icon="mdi:close" />
            </button>
          </div>

          <div class="flex gap-2 px-3 items-end">
            <div class="flex-1 relative bg-white">
              <input
                id="chatInput"
                v-model="msgInput"
                @keyup.enter="handleSend"
                type="text"
                :disabled="!canChat"
                :placeholder="
                  canChat ? 'Nhập tin nhắn tới ' + (partner?.displayName || '...') : 'Tính năng bị giới hạn'
                "
                class="w-full max-h-32 overflow-y-auto outline-none text-[15px] text-gray-800 placeholder-gray-400 bg-transparent py-2 px-1"
              />
            </div>
            <div class="flex gap-2 pb-1">
              <button class="p-2 text-gray-500 hover:bg-gray-100 rounded">
                <Icon icon="mdi:emoticon-outline" class="text-2xl" />
              </button>

              <button
                v-if="!msgInput"
                class="p-2 text-gray-500 hover:bg-gray-100 rounded"
                @click="
                  msgInput = '👍';
                  handleSend();
                "
              >
                <Icon icon="mdi:thumb-up-outline" class="text-2xl" />
              </button>

              <button
                v-else
                @click="handleSend"
                class="p-2 text-[#0091ff] hover:bg-blue-50 rounded font-bold uppercase text-sm flex items-center"
              >
                GỬI <Icon icon="mdi:send" class="ml-1" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cdd0d3;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #aeb1b5;
}
</style>
