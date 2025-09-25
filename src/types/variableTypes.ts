// src/types/variableTypes.ts

export interface Variable {
  type: string;
  value: string | number | boolean | null;
  loaded_data?: any; // This will not be sent from the API, but used client-side
  is_loaded?: boolean; // This will not be sent from the API, but used client-side
}

export interface VariableMap {
  [name: string]: Variable;
}