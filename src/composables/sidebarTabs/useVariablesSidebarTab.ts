import { markRaw } from 'vue'

import VariablesSidebarTab from '@/components/sidebar/tabs/VariablesSidebarTab.vue'
import type { SidebarTabExtension } from '@/types/extensionTypes'

export const useVariablesSidebarTab = (): SidebarTabExtension => {
  return {
    id: 'variables',
    icon: 'pi pi-code',
    title: 'sideToolbar.variables',
    tooltip: 'sideToolbar.variables',
    label: 'sideToolbar.labels.variables',
    component: markRaw(VariablesSidebarTab),
    type: 'vue'
  }
}