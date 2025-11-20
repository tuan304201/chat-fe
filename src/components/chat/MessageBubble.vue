<script setup>
import { computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { format } from "date-fns";

const props = defineProps(["message"]);
const emit = defineEmits(["reply", "recall", "react"]);
const authStore = useAuthStore();

const isMe = computed(() => props.message.sender._id === authStore.user.id);
const time = computed(() => format(new Date(props.message.createdAt), "HH:mm"));

const getFullUrl = (path) => {
  if (!path) return "";
  return path.startsWith("http") ? path : `http://localhost:5000${path}`;
};
</script>

<template>
  <div :class="['flex w-full mb-4 group', isMe ? 'justify-end' : 'justify-start']">
    <div v-if="!isMe" class="mr-2">
      <img
        :src="
          getFullUrl(message.sender.avatarUrl) ||
          'https://img.freepik.com/free-vector/smiling-young-man-illustration_1308-174669.jpg'
        "
        class="w-8 h-8 rounded-full object-cover border"
      />
    </div>

    <div class="max-w-[70%] relative">
      <div v-if="!isMe" class="text-xs text-gray-500 ml-1 mb-1">
        {{ message.sender.displayName }}
      </div>

      <div
        :class="[
          'relative p-3 rounded-2xl text-sm shadow-sm',
          isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border rounded-tl-none',
        ]"
      >
        <div v-if="message.isRecalled" class="italic opacity-60 text-xs flex items-center gap-1">
          <span class="icon-[mdi--block-helper]"></span> Tin nhắn đã được thu hồi
        </div>

        <div v-else>
          <div
            v-if="message.replyTo"
            :class="[
              'mb-2 p-2 rounded text-xs border-l-4',
              isMe ? 'bg-blue-700 border-blue-300' : 'bg-gray-100 border-gray-400',
            ]"
          >
            <div class="font-bold opacity-80">{{ isMe ? "Bạn" : "Người đó" }} đã trả lời:</div>
            <div class="truncate max-w-[150px]">
              {{ message.replyTo.isRecalled ? "Tin nhắn đã thu hồi" : message.replyTo.text || "[File]" }}
            </div>
          </div>

          <p v-if="message.type === 'text'" class="whitespace-pre-wrap leading-relaxed">{{ message.text }}</p>

          <img
            v-if="message.type === 'image'"
            :src="getFullUrl(message.fileUrl)"
            class="rounded-lg max-h-60 cursor-pointer hover:opacity-90 transition"
            @click="$emit('view-image', getFullUrl(message.fileUrl))"
          />

          <audio v-if="message.type === 'audio'" controls class="h-8 w-60 mt-1">
            <source :src="getFullUrl(message.fileUrl)" />
          </audio>
        </div>

        <div :class="['text-[10px] mt-1 text-right opacity-70', isMe ? 'text-blue-100' : 'text-gray-400']">
          {{ time }}
        </div>

        <div
          v-if="message.reactions?.length"
          class="absolute -bottom-3 right-2 bg-white rounded-full shadow px-1.5 py-0.5 flex -space-x-1 ring-1 ring-gray-100 z-10"
        >
          <span v-for="react in message.reactions.slice(0, 3)" :key="react._id" class="text-xs">{{ react.emoji }}</span>
          <span v-if="message.reactions.length > 3" class="text-[10px] text-gray-500 pl-1"
            >+{{ message.reactions.length - 3 }}</span
          >
        </div>
      </div>

      <div
        :class="[
          'absolute top-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity',
          isMe ? '-left-24' : '-right-24',
        ]"
      >
        <button
          @click="emit('react', message._id, '❤️')"
          class="p-1.5 hover:bg-gray-100 rounded-full text-lg transition"
        >
          ❤️
        </button>
        <button
          @click="emit('reply', message)"
          class="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition"
          title="Trả lời"
        >
          <span class="icon-[mdi--reply] w-4 h-4">↩️</span>
        </button>
        <button
          v-if="isMe && !message.isRecalled"
          @click="emit('recall', message._id)"
          class="p-1.5 hover:bg-red-50 text-red-500 rounded-full transition"
          title="Thu hồi"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>
