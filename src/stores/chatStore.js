import { defineStore } from "pinia";
import axiosClient from "@/api/axiosClient";
import { io } from "socket.io-client";
import { useAuthStore } from "./authStore";

export const useChatStore = defineStore("chat", {
  state: () => ({
    socket: null,
    conversations: [],
    currentConversationId: null,
    messages: [], // Danh sách tin nhắn hiện tại
    onlineUsers: [],
    isConnected: false,
    isLoadingMessages: false,
  }),

  getters: {
    currentConversation: (state) => state.conversations.find((c) => c._id === state.currentConversationId),
  },

  actions: {
    // 1. Kết nối Socket
    connectSocket() {
      const authStore = useAuthStore();
      if (this.socket?.connected) return;

      this.socket = io("http://localhost:5000", {
        auth: { token: authStore.accessToken },
        transports: ["websocket"],
      });

      this.socket.on("connect", () => {
        this.isConnected = true;
        console.log("Socket connected");
      });

      this.socket.on("user:online", (userId) => {
        /* Logic user online */
      });

      // Lắng nghe tin nhắn mới
      this.socket.on("message:new", (msg) => {
        this.handleNewMessage(msg);
      });

      // Lắng nghe sự kiện thu hồi
      this.socket.on("message:recalled", ({ messageId, conversationId }) => {
        if (this.currentConversationId === conversationId) {
          const msg = this.messages.find((m) => m._id === messageId);
          if (msg) {
            msg.isRecalled = true;
            msg.text = null;
            msg.fileUrl = null;
          }
        }
        // Cập nhật lastMessage trong danh sách conversation
        const conv = this.conversations.find((c) => c._id === conversationId);
        if (conv && conv.lastMessage?._id === messageId) {
          conv.lastMessage.text = "Tin nhắn đã thu hồi";
        }
      });

      // Lắng nghe reaction
      this.socket.on("message:reaction_updated", ({ messageId, conversationId, reactions }) => {
        if (this.currentConversationId === conversationId) {
          const msg = this.messages.find((m) => m._id === messageId);
          if (msg) msg.reactions = reactions;
        }
      });
    },

    // 2. API Calls
    async fetchConversations() {
      const { data } = await axiosClient.get("/conversations");
      this.conversations = data.conversations;
    },

    async fetchMessages(conversationId, cursor = null) {
      if (!cursor) this.messages = []; // Reset nếu load lần đầu
      this.isLoadingMessages = true;
      try {
        const params = cursor ? { cursor, limit: 20 } : { limit: 20 };
        const { data } = await axiosClient.get(`/messages/${conversationId}`, { params });

        if (cursor) {
          // Load more (prepend)
          this.messages = [...data.messages.reverse(), ...this.messages];
        } else {
          // Load first time
          this.messages = data.messages.reverse();
          this.currentConversationId = conversationId;
          // Join room socket
          this.socket?.emit("conversation:join", { conversationId });
        }
        return data.messages; // Trả về để UI biết còn data không
      } finally {
        this.isLoadingMessages = false;
      }
    },

    async sendMessage({ type, text, fileUrl, replyToId }) {
      if (!this.currentConversationId) return;

      // Gửi qua Socket để nhanh nhất (Optimistic UI có thể làm sau)
      return new Promise((resolve, reject) => {
        this.socket.emit(
          "message:send",
          {
            conversationId: this.currentConversationId,
            type,
            text,
            fileUrl,
            replyToId,
          },
          (response) => {
            if (response.success) resolve(response.message);
            else reject(response.message);
          },
        );
      });
    },

    // 3. Helper xử lý tin nhắn realtime
    handleNewMessage(msg) {
      // Nếu đang mở đoạn chat này -> push vào mảng messages
      if (msg.conversationId === this.currentConversationId) {
        this.messages.push(msg);
        // Auto scroll sẽ xử lý ở Component
      }

      // Cập nhật lastMessage trong danh sách hội thoại
      const convIdx = this.conversations.findIndex((c) => c._id === msg.conversationId);
      if (convIdx > -1) {
        const conv = this.conversations[convIdx];
        conv.lastMessage = msg;
        conv.updatedAt = new Date().toISOString();
        // Đưa lên đầu danh sách
        this.conversations.splice(convIdx, 1);
        this.conversations.unshift(conv);
      }
    },
  },
});
