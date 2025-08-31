// Utility functions for safe data validation and conversion

export function safeNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    return defaultValue;
  }
  
  return num;
}

export function safeString(value: any, defaultValue: string = ''): string {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  return String(value);
}

export function safeDate(value: any): string | null {
  if (!value || value === 'null' || value === 'undefined') {
    return null;
  }
  
  // If it's already a valid date string, return it
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return value;
  }
  
  return null;
}

export function logRequestData(endpoint: string, data: any): void {
  console.log(`📝 ${endpoint} request data:`, {
    ...data,
    // Show which fields are problematic
    _validation: {
      hasNaN: Object.entries(data).filter(([key, value]) => 
        typeof value === 'number' && isNaN(value)
      ),
      hasUndefined: Object.entries(data).filter(([key, value]) => 
        value === undefined
      ),
      hasNull: Object.entries(data).filter(([key, value]) => 
        value === null
      )
    }
  });
}
