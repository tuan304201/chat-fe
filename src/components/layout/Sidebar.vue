<script setup>
import { ref, onMounted } from "vue";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import { watchDebounced } from "@vueuse/core";
import { Icon } from "@iconify/vue"; // Import Iconify

const chatStore = useChatStore();
const authStore = useAuthStore();
const userStore = useUserStore();

const activeMainTab = ref("message"); // 'message' | 'contact'
const searchQuery = ref("");
const showSearchResults = ref(false);

// --- HELPER FUNCTIONS ---

// Tạo avatar theo tên nếu không có ảnh (dùng ui-avatars)
const getAvatar = (userOrConv) => {
  if (userOrConv?.avatarUrl || userOrConv?.avatar) {
    return userOrConv.avatarUrl || userOrConv.avatar;
  }
  const name = userOrConv?.displayName || userOrConv?.title || "U";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
};

// Lấy tên và avatar hiển thị cho hội thoại
const getDisplayInfo = (conv) => {
  if (conv.type === "group") {
    return {
      name: conv.title || "Nhóm chưa đặt tên",
      avatar: getAvatar(conv),
    };
  }
  // Chat 1-1: Tìm người kia
  const myId = authStore.user.id;
  const partnerMember = conv.members.find((m) => {
    const uid = m.userId?._id || m.userId;
    return uid !== myId;
  });
  const partner = partnerMember?.userId;

  return {
    name: partner?.displayName || "Người dùng",
    avatar: getAvatar(partner),
  };
};

// Format thời gian kiểu Zalo
const formatTimeZalo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

// --- SEARCH & ACTIONS ---

watchDebounced(
  searchQuery,
  async (val) => {
    if (val.trim()) {
      await userStore.searchUsers(val);
      await userStore.fetchFriendRequests();
      showSearchResults.value = true;
    } else {
      showSearchResults.value = false;
    }
  },
  { debounce: 500 },
);

const handleStartChat = async (userId) => {
  try {
    await chatStore.createPrivateConversation(userId);
    searchQuery.value = "";
    showSearchResults.value = false;
  } catch (err) {
    console.error(err);
  }
};

const handleAddFriend = async (userId) => {
  await userStore.sendFriendRequest(userId);
  alert("Đã gửi lời mời!");
};

onMounted(async () => {
  await Promise.all([chatStore.fetchConversations(), userStore.initData()]);
});
</script>

<template>
  <div class="flex h-full bg-white select-none font-sans">
    <!-- LEFT ICON BAR -->
    <div class="w-[72px] bg-[#0a7cff] flex flex-col items-center py-4 text-white z-20">
      <!-- Avatar -->
      <img
        :src="getAvatar(authStore.user)"
        class="w-11 h-11 rounded-full border-2 border-white/40 cursor-pointer hover:opacity-90 object-cover"
      />

      <!-- Tabs -->
      <div class="flex flex-col gap-5 mt-6 w-full items-center">
        <button
          @click="activeMainTab = 'message'"
          :class="[
            'p-3 rounded-xl transition flex items-center justify-center w-11 h-11',
            activeMainTab === 'message' ? 'bg-[#0068ff]' : 'hover:bg-[#0068ff]/50',
          ]"
        >
          <Icon icon="mdi:message-processing" class="text-[26px]" />
        </button>

        <div class="relative w-full flex justify-center">
          <button
            @click="activeMainTab = 'contact'"
            :class="[
              'p-3 rounded-xl transition flex items-center justify-center w-11 h-11',
              activeMainTab === 'contact' ? 'bg-[#0068ff]' : 'hover:bg-[#0068ff]/50',
            ]"
          >
            <Icon icon="mdi:account-box-multiple" class="text-[26px]" />
          </button>
          <span
            v-if="userStore.friendRequests.incoming.length"
            class="absolute top-1 right-5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#0a7cff]"
          ></span>
        </div>
      </div>

      <!-- Bottom icons -->
      <div class="mt-auto flex flex-col gap-4 pb-3 items-center">
        <button class="p-2.5 hover:bg-[#0068ff]/60 rounded-xl text-white/90" title="Cài đặt">
          <Icon icon="mdi:cog-outline" class="text-[24px]" />
        </button>
        <button
          @click="authStore.logout()"
          class="p-2.5 hover:bg-[#0068ff]/60 rounded-xl text-white/90"
          title="Đăng xuất"
        >
          <Icon icon="mdi:logout" class="text-[24px]" />
        </button>
      </div>
    </div>

    <!-- MAIN SIDEBAR -->
    <div class="w-[340px] flex flex-col border-r border-gray-200 relative">
      <!-- Search Bar -->
      <div class="h-[64px] flex items-center px-4 border-b border-gray-200 bg-[#f3f5f6] gap-2 shrink-0">
        <div
          class="relative flex-1 bg-white rounded-lg text-gray-600 flex items-center h-10 px-2 shadow-sm ring-1 ring-gray-300 focus-within:ring-[#0a7cff]"
        >
          <Icon icon="mdi:magnify" class="ml-1 text-xl" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Tìm kiếm"
            class="w-full bg-transparent border-none outline-none text-[15px] px-2"
          />
        </div>
        <button class="p-2 text-gray-600 hover:bg-gray-200 rounded-lg">
          <Icon icon="mdi:account-plus" class="text-[20px]" />
        </button>
      </div>

      <!-- SEARCH RESULTS -->
      <div v-if="showSearchResults" class="absolute top-16 left-0 right-0 bottom-0 bg-white z-10 overflow-y-auto">
        <div v-if="userStore.isSearching" class="p-4 text-center text-sm text-gray-500">Đang tìm...</div>

        <div v-else-if="!userStore.searchResults.length" class="p-4 text-center text-sm text-gray-500">
          Không tìm thấy kết quả
        </div>

        <div v-else>
          <div class="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-100">KẾT QUẢ</div>

          <div
            v-for="user in userStore.searchResults"
            :key="user._id"
            class="flex items-center gap-3 px-4 py-3 hover:bg-[#e8f2ff] cursor-pointer border-b"
            @click="handleStartChat(user._id)"
          >
            <img :src="getAvatar(user)" class="w-11 h-11 rounded-full border object-cover" />

            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800">{{ user.displayName }}</div>
              <div class="text-xs text-gray-500">@{{ user.username }}</div>
            </div>

            <button
              v-if="userStore.getRelationship(user._id) === 'NONE'"
              @click.stop="handleAddFriend(user._id)"
              class="text-[#0a7cff] bg-[#e8f2ff] px-2 py-1 rounded text-xs font-medium hover:bg-[#d8e8ff]"
            >
              Kết bạn
            </button>
          </div>
        </div>
      </div>

      <!-- MESSAGE LIST -->
      <div v-if="activeMainTab === 'message'" class="flex-1 overflow-y-auto">
        <div v-if="!chatStore.conversations.length" class="p-6 text-center text-gray-400 text-sm">
          Bạn chưa có cuộc trò chuyện nào
        </div>

        <!-- Conversation item -->
        <div
          v-for="conv in chatStore.conversations"
          :key="conv._id"
          @click="chatStore.selectConversation(conv._id)"
          :class="[
            'flex px-4 py-3 gap-3 cursor-pointer transition-colors relative',
            chatStore.currentConversationId === conv._id ? 'bg-[#e8f2ff]' : 'hover:bg-gray-100',
          ]"
        >
          <img :src="getDisplayInfo(conv).avatar" class="w-12 h-12 rounded-full object-cover" />

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span class="text-[15px] font-medium text-gray-800 truncate max-w-[160px]">
                {{ getDisplayInfo(conv).name }}
              </span>
              <span class="text-[11px] text-gray-500">{{ formatTimeZalo(conv.updatedAt) }}</span>
            </div>

            <div class="text-[13px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
              <span v-if="conv.lastMessage?.sender === authStore.user?.id">Bạn:</span>
              <span :class="{ 'italic text-gray-400': conv.lastMessage?.isRecalled }">
                {{ conv.lastMessage?.isRecalled ? "Tin nhắn đã thu hồi" : conv.lastMessage?.text || "[Đính kèm]" }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- CONTACT TAB -->
      <div v-else-if="activeMainTab === 'contact'" class="flex-1 overflow-y-auto">
        <!-- Friend Requests -->
        <div v-if="userStore.friendRequests.incoming.length" class="mb-2">
          <div class="px-4 py-2 bg-gray-100 text-xs font-bold text-gray-600 border-y flex items-center gap-2">
            <Icon icon="mdi:account-clock" /> LỜI MỜI KẾT BẠN ({{ userStore.friendRequests.incoming.length }})
          </div>

          <div
            v-for="req in userStore.friendRequests.incoming"
            :key="req._id"
            class="px-4 py-3 hover:bg-gray-100 border-b"
          >
            <div class="flex items-center gap-3 mb-2">
              <img :src="getAvatar(req.from)" class="w-10 h-10 rounded-full object-cover" />
              <span class="text-sm font-medium">{{ req.from.displayName }}</span>
            </div>

            <div class="flex gap-2 pl-12">
              <button
                @click="userStore.acceptFriendRequest(req._id)"
                class="bg-[#e8f2ff] text-[#0a7cff] text-xs font-medium px-3 py-1.5 rounded hover:bg-[#d8e8ff]"
              >
                Đồng ý
              </button>
              <button
                @click="userStore.declineFriendRequest(req._id)"
                class="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1.5 rounded hover:bg-gray-200"
              >
                Bỏ qua
              </button>
            </div>
          </div>
        </div>

        <!-- Friends List -->
        <div class="px-4 py-2 bg-gray-100 text-xs font-bold text-gray-600 border-y flex items-center gap-2">
          <Icon icon="mdi:account-check" /> BẠN BÈ ({{ userStore.friends.length }})
        </div>

        <div
          v-for="friend in userStore.friends"
          :key="friend._id"
          class="px-4 py-3 flex items-center gap-3 hover:bg-gray-100 cursor-pointer border-b"
          @click="handleStartChat(friend._id)"
        >
          <img :src="getAvatar(friend)" class="w-10 h-10 rounded-full object-cover" />
          <span class="text-sm font-medium">{{ friend.displayName }}</span>
          <div class="ml-auto text-gray-400">
            <Icon icon="mdi:message-text-outline" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cdd0d3;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
</style>
