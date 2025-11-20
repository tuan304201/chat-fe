<script setup>
import { ref, reactive } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

const isLogin = ref(true); // Toggle giữa Login và Register
const isLoading = ref(false);
const errorMessage = ref("");

// Form data
const formData = reactive({
  username: "",
  password: "",
  displayName: "", // Chỉ dùng cho Register
});

// Xử lý submit form
const handleSubmit = async () => {
  errorMessage.value = "";
  isLoading.value = true;

  try {
    if (isLogin.value) {
      // Logic Đăng nhập
      await authStore.login(formData.username, formData.password);
      router.push("/"); // Chuyển hướng về trang Chat
    } else {
      // Logic Đăng ký
      await authStore.register({
        username: formData.username,
        password: formData.password,
        displayName: formData.displayName,
      });
      // Đăng ký xong thì tự động chuyển sang chế độ đăng nhập hoặc đăng nhập luôn (tùy logic store)
      // Ở đây giả sử register xong cần login lại:
      isLogin.value = true;
      errorMessage.value = "Đăng ký thành công! Hãy đăng nhập.";
      // Reset form password
      formData.password = "";
    }
  } catch (err) {
    errorMessage.value = err.toString();
  } finally {
    isLoading.value = false;
  }
};

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  errorMessage.value = "";
  formData.username = "";
  formData.password = "";
  formData.displayName = "";
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md transform transition-all">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-blue-600 mb-2">Zalo Clone</h1>
        <p class="text-gray-500">
          {{ isLogin ? "Đăng nhập để kết nối bạn bè" : "Tạo tài khoản mới miễn phí" }}
        </p>
      </div>

      <div
        v-if="errorMessage"
        class="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-lg border border-red-200 flex items-center"
      >
        ⚠️ {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div v-if="!isLogin" class="space-y-1">
          <label class="text-sm font-medium text-gray-700">Tên hiển thị</label>
          <input
            v-model="formData.displayName"
            type="text"
            required
            placeholder="Ví dụ: Nguyễn Văn A"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-gray-700">Tên đăng nhập</label>
          <input
            v-model="formData.username"
            type="text"
            required
            placeholder="Nhập username..."
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-gray-700">Mật khẩu</label>
          <input
            v-model="formData.password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-6"
        >
          <span
            v-if="isLoading"
            class="animate-spin mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4"
          ></span>
          {{ isLogin ? "Đăng nhập" : "Đăng ký" }}
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-gray-600">
        {{ isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?" }}
        <button @click="toggleMode" class="text-blue-600 font-semibold hover:underline ml-1">
          {{ isLogin ? "Đăng ký ngay" : "Đăng nhập ngay" }}
        </button>
      </div>
    </div>
  </div>
</template>
