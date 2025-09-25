<template>
  <SidebarTabTemplate :title="$t('sideToolbar.variables')">
    <template #tool-buttons>
      <Button
        v-tooltip.bottom="$t('g.refresh')"
        icon="pi pi-refresh"
        severity="secondary"
        text
        @click="handleRefresh"
      />
      <Button
        v-tooltip.bottom="$t('variablePanel.createVariable')"
        icon="pi pi-plus"
        severity="secondary"
        text
        @click="isCreateFormVisible = true"
      />
    </template>
    
    <template #header>
      <!-- Creation Form -->
      <div v-if="isCreateFormVisible" class="p-4 border-b bg-(--p-surface-0)">
        <h3 class="text-sm font-semibold mb-3">{{ $t('variablePanel.createNewVariable') }}</h3>
        <form @submit.prevent="handleCreateVariable" class="space-y-3">
          <div>
            <label class="block text-xs font-medium mb-1">{{ $t('variablePanel.variableName') }}</label>
            <InputText
              v-model="newVar.name"
              :placeholder="$t('variablePanel.variableNamePlaceholder')"
              class="w-full"
              size="small"
              required
            />
          </div>
          
          <div>
            <label class="block text-xs font-medium mb-1">{{ $t('variablePanel.variableType') }}</label>
            <Select
              v-model="newVar.type"
              :options="variableTypeOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              size="small"
            />
          </div>
          
          <div class="flex gap-2">
            <Button
              type="submit"
              :label="$t('g.save')"
              size="small"
              class="flex-1"
              :loading="isCreating"
            />
            <Button
              :label="$t('g.cancel')"
              severity="secondary"
              size="small"
              class="flex-1"
              @click="cancelCreate"
            />
          </div>
        </form>
      </div>
    </template>

    <template #body>
      <div v-if="!variableStore.isLoaded" class="p-4 text-center">
        <ProgressSpinner size="small" />
        <p class="text-sm text-(--p-text-muted-color) mt-2">
          {{ $t('variablePanel.loadingVariables') }}
        </p>
      </div>

      <div v-else-if="Object.keys(variableStore.variables).length === 0" class="p-4 text-center">
        <i class="pi pi-info-circle text-2xl text-(--p-text-muted-color) mb-2"></i>
        <p class="text-sm text-(--p-text-muted-color)">
          {{ $t('variablePanel.noVariables') }}
        </p>
        <Button
          :label="$t('variablePanel.createFirstVariable')"
          size="small"
          class="mt-2"
          @click="isCreateFormVisible = true"
        />
      </div>

      <div v-else class="p-2">
        <div
          v-for="(variable, name) in variableStore.variables"
          :key="name"
          class="variable-item border rounded-lg p-3 mb-2 bg-(--p-surface-50)"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm">{{ name }}</span>
              <Tag
                :value="variable.type"
                severity="info"
                class="text-xs"
              />
            </div>
            <div class="flex items-center gap-2">
              <span
                v-if="variable.is_loaded"
                class="text-green-500 text-xs"
                :title="$t('variablePanel.loadedTooltip')"
              >
                <i class="pi pi-check-circle"></i>
              </span>
              <Button
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
                @click="confirmDelete(name)"
              />
            </div>
          </div>

          <!-- Value Input Control -->
          <div class="mt-2">
            <label class="block text-xs font-medium mb-1">{{ $t('variablePanel.value') }}</label>
            
            <!-- String/Int/Float/Boolean inputs -->
            <InputText
              v-if="['STRING', 'INT', 'FLOAT'].includes(variable.type)"
              :model-value="String(variable.value || '')"
              :type="getInputType(variable.type)"
              class="w-full"
              size="small"
              @blur="updateValue(name, $event.target.value, variable.type)"
            />
            
            <ToggleSwitch
              v-else-if="variable.type === 'BOOLEAN'"
              :model-value="Boolean(variable.value)"
              class="mt-1"
              @change="updateValue(name, $event.value, variable.type)"
            />
            
            <!-- Model selection dropdowns -->
            <Select
              v-else-if="variable.type === 'CHECKPOINT'"
              :model-value="variable.value"
              :options="checkpointList"
              class="w-full"
              size="small"
              :placeholder="$t('variablePanel.selectCheckpoint')"
              @change="updateValue(name, $event.value, variable.type)"
            />
            
            <Select
              v-else-if="variable.type === 'VAE'"
              :model-value="variable.value"
              :options="vaeList"
              class="w-full"
              size="small"
              :placeholder="$t('variablePanel.selectVAE')"
              @change="updateValue(name, $event.value, variable.type)"
            />
            
            <Select
              v-else-if="variable.type === 'LORA'"
              :model-value="variable.value"
              :options="loraList"
              class="w-full"
              size="small"
              :placeholder="$t('variablePanel.selectLora')"
              @change="updateValue(name, $event.value, variable.type)"
            />
            
            <!-- Fallback for unknown types -->
            <InputText
              v-else
              :model-value="String(variable.value || '')"
              class="w-full"
              size="small"
              @blur="updateValue(name, $event.target.value, variable.type)"
            />
          </div>
        </div>
      </div>
    </template>
  </SidebarTabTemplate>

  <!-- Delete Confirmation Dialog -->
  <ConfirmDialog />
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import ToggleSwitch from 'primevue/toggleswitch'
import { useConfirm } from 'primevue/useconfirm'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import SidebarTabTemplate from '@/components/sidebar/tabs/SidebarTabTemplate.vue'
import { api } from '@/scripts/api'
import { useVariableStore } from '@/stores/variableStore'

const { t: $t } = useI18n()
const confirm = useConfirm()
const variableStore = useVariableStore()

// Form state
const isCreateFormVisible = ref(false)
const isCreating = ref(false)
const newVar = ref({
  name: '',
  type: 'STRING'
})

// Model lists for dropdowns
const checkpointList = ref<string[]>([])
const vaeList = ref<string[]>([])
const loraList = ref<string[]>([])

// Variable type options for creation form
const variableTypeOptions = computed(() => [
  { label: $t('variablePanel.types.string'), value: 'STRING' },
  { label: $t('variablePanel.types.int'), value: 'INT' },
  { label: $t('variablePanel.types.float'), value: 'FLOAT' },
  { label: $t('variablePanel.types.boolean'), value: 'BOOLEAN' },
  { label: $t('variablePanel.types.checkpoint'), value: 'CHECKPOINT' },
  { label: $t('variablePanel.types.vae'), value: 'VAE' },
  { label: $t('variablePanel.types.lora'), value: 'LORA' }
])

onMounted(async () => {
  // Load variables if not already loaded
  if (!variableStore.isLoaded) {
    await variableStore.fetchVariables()
  }
  
  // Load model lists for dropdowns
  await loadModelLists()
})

async function loadModelLists() {
  try {
    const nodeDefs = await api.getNodeDefs()
    
    // Get checkpoint list
    if (nodeDefs.CheckpointLoaderSimple?.input?.required?.ckpt_name) {
      checkpointList.value = nodeDefs.CheckpointLoaderSimple.input.required.ckpt_name[0] || []
    }
    
    // Get VAE list
    if (nodeDefs.VAELoader?.input?.required?.vae_name) {
      vaeList.value = nodeDefs.VAELoader.input.required.vae_name[0] || []
    }
    
    // Get LoRA list
    if (nodeDefs.LoraLoader?.input?.required?.lora_name) {
      loraList.value = nodeDefs.LoraLoader.input.required.lora_name[0] || []
    }
  } catch (error) {
    console.error('Failed to load model lists:', error)
  }
}

async function handleRefresh() {
  await Promise.all([
    variableStore.fetchVariables(),
    loadModelLists()
  ])
}

async function handleCreateVariable() {
  if (!newVar.value.name.trim()) {
    return
  }
  
  isCreating.value = true
  try {
    await variableStore.createVariable(
      newVar.value.name.trim(),
      newVar.value.type,
      getDefaultValue(newVar.value.type)
    )
    cancelCreate()
  } catch (error: any) {
    // TODO: Show toast notification
    console.error('Failed to create variable:', error)
    alert(error.message || 'Failed to create variable')
  } finally {
    isCreating.value = false
  }
}

function cancelCreate() {
  isCreateFormVisible.value = false
  newVar.value = { name: '', type: 'STRING' }
}

function getDefaultValue(type: string) {
  switch (type) {
    case 'STRING':
      return ''
    case 'INT':
      return 0
    case 'FLOAT':
      return 0.0
    case 'BOOLEAN':
      return false
    case 'CHECKPOINT':
    case 'VAE':
    case 'LORA':
      return null
    default:
      return null
  }
}

function getInputType(variableType: string): string {
  switch (variableType) {
    case 'INT':
    case 'FLOAT':
      return 'number'
    default:
      return 'text'
  }
}

function updateValue(name: string, value: any, type: string) {
  let finalValue = value
  
  // Type coercion
  if (type === 'INT') {
    finalValue = parseInt(value, 10)
    if (isNaN(finalValue)) finalValue = 0
  } else if (type === 'FLOAT') {
    finalValue = parseFloat(value)
    if (isNaN(finalValue)) finalValue = 0.0
  } else if (type === 'BOOLEAN') {
    finalValue = Boolean(value)
  }
  
  variableStore.updateVariableValue(name, finalValue)
}

function confirmDelete(name: string) {
  confirm.require({
    message: $t('variablePanel.deleteConfirmMessage', { name }),
    header: $t('variablePanel.deleteConfirmHeader'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: $t('g.cancel'),
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: $t('g.delete'),
      severity: 'danger'
    },
    accept: () => {
      variableStore.deleteVariable(name)
    }
  })
}
</script>

<style scoped>
.variable-item {
  transition: all 0.2s ease;
}

.variable-item:hover {
  background-color: var(--p-surface-100);
}

:deep(.p-tag) {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
}

:deep(.p-progressspinner) {
  width: 2rem;
  height: 2rem;
}
</style>