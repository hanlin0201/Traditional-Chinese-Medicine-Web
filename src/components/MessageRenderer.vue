<script setup>
import InquiryOptions from './InquiryOptions.vue'
import PrescriptionCard from './PrescriptionCard.vue'

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['inquiry-option', 'save-plan'])

function isUser() {
  return props.message.role === 'user'
}

function isAssistantText() {
  return props.message.role === 'assistant' && props.message.content != null
}

function isInquiry() {
  return props.message.type === 'inquiry'
}

function isPrescription() {
  return props.message.type === 'prescription'
}

function onInquirySelect(option) {
  emit('inquiry-option', option)
}

function onSavePlan() {
  emit('save-plan', props.message.pendingTag)
}
</script>

<template>
  <div
    v-if="isUser()"
    class="flex justify-end"
  >
    <div class="max-w-[85%] px-3 py-2 rounded-xl bg-sandalwood/15 text-sandalwood text-sm">
      {{ message.content }}
    </div>
  </div>

  <div
    v-else-if="isAssistantText()"
    class="flex justify-start"
  >
    <div class="max-w-[85%] px-3 py-2 rounded-xl bg-white border border-sandalwood/15 shadow-paper text-sandalwood/95 text-sm">
      {{ message.content }}
    </div>
  </div>

  <div
    v-else-if="isInquiry()"
    class="flex justify-start"
  >
    <InquiryOptions
      :text="message.text"
      :options="message.options"
      @select="onInquirySelect"
    />
  </div>

  <div
    v-else-if="isPrescription()"
    class="flex justify-start"
  >
    <PrescriptionCard
      :diagnosis-result="message.diagnosis_result"
      :summary="message.summary"
      :recipes="message.recipes"
      :acupoints="message.acupoints"
      :lifestyle="message.lifestyle"
      @save-plan="onSavePlan"
    />
  </div>
</template>
