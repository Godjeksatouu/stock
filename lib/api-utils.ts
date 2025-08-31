// Global API utility functions to prevent fetchData errors

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: string
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
}

export async function apiCall<T = any>(
  endpoint: string, 
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const { method = 'GET', body, headers = {} } = options

    console.log(`🌐 API Call: ${method} ${endpoint}`, body ? { body } : '')

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body)
    }

    const response = await fetch(endpoint, config)
    
    let data: ApiResponse<T>
    
    try {
      data = await response.json()
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError)
      return {
        success: false,
        error: 'Invalid response format from server'
      }
    }

    if (!response.ok) {
      console.error(`❌ API Error ${response.status}:`, data)
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        details: data.details
      }
    }

    console.log('✅ API Success:', data)
    return data

  } catch (error) {
    console.error('❌ Network error:', error)
    return {
      success: false,
      error: 'Network error - please check your connection',
      details: error instanceof Error ? error.message : String(error)
    }
  }
}

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string) => 
    apiCall<T>(endpoint, { method: 'GET' }),
    
  post: <T = any>(endpoint: string, body: any) => 
    apiCall<T>(endpoint, { method: 'POST', body }),
    
  put: <T = any>(endpoint: string, body: any) => 
    apiCall<T>(endpoint, { method: 'PUT', body }),
    
  delete: <T = any>(endpoint: string) => 
    apiCall<T>(endpoint, { method: 'DELETE' })
}

// Global fetchData function to prevent ReferenceError
export async function fetchData<T = any>(
  endpoint: string, 
  options: ApiOptions = {}
): Promise<T> {
  const response = await apiCall<T>(endpoint, options)
  
  if (!response.success) {
    throw new Error(response.error || 'API call failed')
  }
  
  return response.data as T
}

// Make fetchData globally available
if (typeof window !== 'undefined') {
  (window as any).fetchData = fetchData
  (window as any).api = api
  (window as any).apiCall = apiCall
}
