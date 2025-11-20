import { defineStore } from "pinia";
import { io } from "socket.io-client";
import { useAuthStore } from "./authStore";

export const useSocketStore = defineStore("socket", {
  state: () => ({
    socket: null,
    isConnected: false,
    onlineUsers: [], // Lưu danh sách user online nhận từ event 'user:online'
  }),
  actions: {
    connect() {
      const authStore = useAuthStore();
      if (this.socket?.connected) return;

      this.socket = io("http://localhost:5000", {
        auth: {
          token: authStore.accessToken, // Backend middleware yêu cầu cái này
        },
        transports: ["websocket"], // Bắt buộc dùng websocket để tối ưu
      });

      this.socket.on("connect", () => {
        this.isConnected = true;
        console.log("Socket connected:", this.socket.id);
      });

      this.socket.on("disconnect", () => {
        this.isConnected = false;
      });

      // Lắng nghe các event global như user online/offline
      this.socket.on("user:online", ({ userId }) => {
        if (!this.onlineUsers.includes(userId)) this.onlineUsers.push(userId);
      });
    },
    disconnect() {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
    },
  },
});
