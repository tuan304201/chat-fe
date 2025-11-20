// src/stores/userStore.js
import { defineStore } from "pinia";
import axiosClient from "@/api/axiosClient";

export const useUserStore = defineStore("user", {
  state: () => ({
    searchResults: [],
    friendRequests: {
      incoming: [], // Lời mời gửi đến mình
      outgoing: [], // Lời mời mình gửi đi
    },
    friends: [],
    isSearching: false,
  }),

  getters: {
    // Helper: Kiểm tra quan hệ với 1 user (để hiển thị nút Kết bạn/Đã gửi)
    getRelationship: (state) => (targetId) => {
      if (state.friends.some((f) => f._id === targetId)) return "FRIEND";
      if (state.friendRequests.outgoing.some((r) => r.to === targetId || r.to._id === targetId)) return "SENT";
      if (state.friendRequests.incoming.some((r) => r.from._id === targetId)) return "RECEIVED";
      return "NONE";
    },

    // Helper: Lấy ID lời mời để chấp nhận/hủy
    getRequestId: (state) => (targetId) => {
      const req = state.friendRequests.incoming.find((r) => r.from._id === targetId);
      return req ? req._id : null;
    },
  },

  actions: {
    // 1. Tìm kiếm user
    async searchUsers(query) {
      if (!query) {
        this.searchResults = [];
        return;
      }
      this.isSearching = true;
      try {
        const { data } = await axiosClient.get(`/users/search?q=${query}`);
        this.searchResults = data.users;
      } catch (error) {
        console.error(error);
      } finally {
        this.isSearching = false;
      }
    },

    // 2. Lấy danh sách bạn bè & lời mời
    async fetchFriends() {
      try {
        const { data } = await axiosClient.get("/users/friends");
        this.friends = data.friends;
      } catch (e) {
        console.error(e);
      }
    },

    async fetchFriendRequests() {
      try {
        const { data } = await axiosClient.get("/friends/requests");
        this.friendRequests.incoming = data.incoming;
        this.friendRequests.outgoing = data.outgoing;
      } catch (error) {
        console.error(error);
      }
    },

    async initData() {
      await Promise.all([this.fetchFriends(), this.fetchFriendRequests()]);
    },

    // 3. Các hành động kết bạn
    async sendFriendRequest(userId) {
      try {
        // Quan trọng: Phải gửi object { toId: userId }
        // Nếu bạn viết axiosClient.post(url, userId) là SAI vì backend nhận req.body.toId
        const { data } = await axiosClient.post("/friends/send", {
          toId: userId,
        });

        // Cập nhật state ngay lập tức để nút bấm đổi trạng thái
        this.friendRequests.outgoing.push(data.request);
        return true;
      } catch (error) {
        // Log lỗi ra để dễ debug
        console.error("Send Request Error:", error);
        throw error.response?.data?.message || "Lỗi gửi lời mời";
      }
    },

    // --- ĐÂY LÀ HÀM BẠN ĐANG THIẾU ---
    async acceptFriendRequest(requestId) {
      try {
        await axiosClient.post("/friends/accept", { requestId });
        // Load lại dữ liệu để cập nhật danh sách bạn bè
        await this.initData();
        return true;
      } catch (error) {
        throw error.response?.data?.message || "Lỗi";
      }
    },

    async declineFriendRequest(requestId) {
      try {
        await axiosClient.post("/friends/decline", { requestId });
        this.friendRequests.incoming = this.friendRequests.incoming.filter((r) => r._id !== requestId);
      } catch (error) {
        console.error(error);
      }
    },
  },
});
