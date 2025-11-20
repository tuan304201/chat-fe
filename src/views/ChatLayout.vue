<script setup>
import { onMounted, ref, nextTick, watch } from "vue";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import MessageBubble from "@/components/chat/MessageBubble.vue";
import { useInfiniteScroll } from "@vueuse/core";

const chatStore = useChatStore();
const authStore = useAuthStore();
const msgContainer = ref(null);
const msgInput = ref("");
const replyingTo = ref(null);

// 1. Khởi tạo dữ liệu
onMounted(async () => {
  chatStore.connectSocket();
  await chatStore.fetchConversations();
});

// 2. Chọn hội thoại
const selectConversation = async (convId) => {
  if (chatStore.currentConversationId === convId) return;
  await chatStore.fetchMessages(convId);
  scrollToBottom();
};

// 3. Gửi tin nhắn
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
    alert("Lỗi gửi tin: " + err);
  }
};

// 4. Scroll logic
const scrollToBottom = () => {
  nextTick(() => {
    if (msgContainer.value) {
      msgContainer.value.scrollTop = msgContainer.value.scrollHeight;
    }
  });
};

// Infinite Scroll (Load tin nhắn cũ khi cuộn lên trên)
useInfiniteScroll(
  msgContainer,
  async () => {
    if (chatStore.isLoadingMessages || !chatStore.messages.length) return;

    const oldScrollHeight = msgContainer.value.scrollHeight;
    const oldestMsg = chatStore.messages[0]; // Tin nhắn đầu tiên hiện tại

    const newMsgs = await chatStore.fetchMessages(chatStore.currentConversationId, oldestMsg._id);

    if (newMsgs?.length) {
      // Giữ vị trí scroll sau khi load thêm
      nextTick(() => {
        msgContainer.value.scrollTop = msgContainer.value.scrollHeight - oldScrollHeight;
      });
    }
  },
  { direction: "top", distance: 50 }, // Kích hoạt khi cách đỉnh 50px
);

// Xử lý sự kiện từ MessageBubble
const onRecall = (id) => chatStore.socket.emit("message:recall", { messageId: id });
const onReact = (id, emoji) => chatStore.socket.emit("message:react", { messageId: id, emoji });
const onReply = (msg) => {
  replyingTo.value = msg;
  msgInput.value && nextTick(() => document.getElementById("chatInput").focus());
};
</script>

<template>
  <div class="flex h-screen bg-gray-100">
    <div class="w-80 bg-white border-r flex flex-col">
      <div class="p-4 border-b font-bold text-xl text-blue-600">Zalo Clone</div>
      <div class="overflow-y-auto flex-1">
        <div
          v-for="conv in chatStore.conversations"
          :key="conv._id"
          @click="selectConversation(conv._id)"
          :class="[
            'p-3 flex items-center gap-3 cursor-pointer hover:bg-blue-50 transition',
            chatStore.currentConversationId === conv._id ? 'bg-blue-100' : '',
          ]"
        >
          <img :src="conv.avatar || 'https://via.placeholder.com/50'" class="w-12 h-12 rounded-full object-cover" />
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate">{{ conv.title || "Chat riêng" }}</div>
            <div class="text-sm text-gray-500 truncate">
              {{ conv.lastMessage?.isRecalled ? "Tin nhắn thu hồi" : conv.lastMessage?.text || "Bắt đầu trò chuyện" }}
            </div>
          </div>
        </div>
      </div>
      <div class="p-4 border-t">
        <button @click="authStore.logout()" class="w-full py-2 text-red-500 hover:bg-red-50 rounded">Đăng xuất</button>
      </div>
    </div>

    <div class="flex-1 flex flex-col min-w-0">
      <template v-if="chatStore.currentConversationId">
        <div class="h-16 border-b bg-white flex items-center px-6 shadow-sm z-10">
          <span class="font-bold text-lg">{{ chatStore.currentConversation?.title || "Cuộc trò chuyện" }}</span>
        </div>

        <div ref="msgContainer" class="flex-1 overflow-y-auto p-6 bg-[#eef0f1]">
          <div v-if="chatStore.isLoadingMessages" class="text-center text-gray-400 text-xs py-2">
            Đang tải tin nhắn cũ...
          </div>

          <MessageBubble
            v-for="msg in chatStore.messages"
            :key="msg._id"
            :message="msg"
            @recall="onRecall"
            @react="onReact"
            @reply="onReply"
          />
        </div>

        <div class="bg-white p-4 border-t">
          <div
            v-if="replyingTo"
            class="mb-2 p-2 bg-gray-100 rounded flex justify-between items-center border-l-4 border-blue-500"
          >
            <div class="text-sm text-gray-600">
              Đang trả lời: <span class="font-medium text-black">{{ replyingTo.text }}</span>
            </div>
            <button @click="replyingTo = null" class="text-gray-400 hover:text-red-500">✕</button>
          </div>

          <div class="flex gap-2">
            <input
              id="chatInput"
              v-model="msgInput"
              @keyup.enter="handleSend"
              type="text"
              placeholder="Nhập tin nhắn..."
              class="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:border-blue-500 bg-gray-50"
            />
            <button
              @click="handleSend"
              class="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition font-medium"
            >
              Gửi
            </button>
          </div>
        </div>
      </template>

      <div v-else class="flex-1 flex items-center justify-center text-gray-400 flex-col">
        <div class="text-6xl mb-4">💬</div>
        <div>Chọn một cuộc hội thoại để bắt đầu</div>
      </div>
    </div>
  </div>
</template>
