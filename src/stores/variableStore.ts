import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { VariableMap } from '@/types/variableTypes'
import { api } from '@/scripts/api'

export const useVariableStore = defineStore('variables', () => {
  const variables = ref<VariableMap>({})
  const isLoaded = ref<boolean>(false)

  /**
   * Fetches all variables from the backend API
   */
  async function fetchVariables(): Promise<void> {
    try {
      const response = await api.fetchApi('/variables')
      if (!response.ok) {
        throw new Error(`Failed to fetch variables: ${response.statusText}`)
      }
      variables.value = await response.json()
      isLoaded.value = true
    } catch (error) {
      console.error('Failed to fetch variables:', error)
      isLoaded.value = false
      throw error
    }
  }

  /**
   * Creates a new variable on the backend
   * @param name The name of the variable
   * @param type The type of the variable
   * @param value The initial value of the variable
   */
  async function createVariable(name: string, type: string, value: any): Promise<void> {
    try {
      const response = await api.fetchApi('/variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, value })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create variable')
      }
      
      // Refresh the local state after creation
      await fetchVariables()
    } catch (error) {
      console.error('Error creating variable:', error)
      throw error // Re-throw for the component to handle
    }
  }

  /**
   * Updates the value of an existing variable
   * @param name The name of the variable to update
   * @param value The new value for the variable
   */
  async function updateVariableValue(name: string, value: any): Promise<void> {
    try {
      // Optimistically update the local state for a faster UI response
      if (variables.value[name]) {
        variables.value[name].value = value
        variables.value[name].is_loaded = false // Mark as not loaded until confirmed by backend
      }
      
      const response = await api.fetchApi(`/variables/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update variable')
      }
      
      // No need to re-fetch, the WebSocket event will confirm the preload
    } catch (error) {
      console.error(`Error updating variable ${name}:`, error)
      await fetchVariables() // Revert optimistic update on error
      throw error
    }
  }

  /**
   * Deletes a variable from the backend
   * @param name The name of the variable to delete
   */
  async function deleteVariable(name: string): Promise<void> {
    try {
      const response = await api.fetchApi(`/variables/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete variable')
      }
      
      // Remove from local state
      delete variables.value[name]
    } catch (error) {
      console.error(`Error deleting variable ${name}:`, error)
      throw error
    }
  }

  /**
   * Action to be called by the WebSocket listener when a variable is preloaded
   * @param name The name of the variable that was preloaded
   */
  function confirmVariablePreloaded(name: string): void {
    if (variables.value[name]) {
      variables.value[name].is_loaded = true
    }
  }

  /**
   * Handles variable-preloaded WebSocket events
   */
  function handleVariablePreloaded(event: CustomEvent): void {
    const data = event.detail
    if (data && data.name) {
      confirmVariablePreloaded(data.name)
    }
  }

  /**
   * Binds variable-related WebSocket event listeners
   */
  function bindVariableEvents(): void {
    api.addEventListener('variable-preloaded', handleVariablePreloaded)
  }

  /**
   * Unbinds variable-related WebSocket event listeners
   */
  function unbindVariableEvents(): void {
    api.removeEventListener('variable-preloaded', handleVariablePreloaded)
  }

  return {
    variables,
    isLoaded,
    fetchVariables,
    createVariable,
    updateVariableValue,
    deleteVariable,
    confirmVariablePreloaded,
    bindVariableEvents,
    unbindVariableEvents
  }
})