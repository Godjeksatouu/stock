import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  CreateSaleRequest,
  Sale,
  SaleWithItems,
  Stock,
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  Fournisseur,
  CreateFournisseurRequest,
  UpdateFournisseurRequest,
  Achat,
  AchatWithItems,
  CreateAchatRequest,
  Invoice
} from './types';

const API_BASE = '/api';

// Generic API call function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // Check if response is ok
    if (!response.ok) {
      console.error(`API call failed: ${response.status} ${response.statusText}`);
      console.error(`Endpoint: ${endpoint}`);
      console.error(`Method: ${options.method || 'GET'}`);

      // Try to get error details from response
      try {
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);

        // Try to parse as JSON to get structured error
        try {
          const errorData = JSON.parse(errorText);
          return {
            success: false,
            error: errorData.error || `Server error: ${response.status} ${response.statusText}`,
          };
        } catch {
          // If not JSON, return the text
          return {
            success: false,
            error: errorText || `Server error: ${response.status} ${response.statusText}`,
          };
        }
      } catch {
        return {
          success: false,
          error: `Server error: ${response.status} ${response.statusText}`,
        };
      }
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('API response is not JSON:', contentType);
      const text = await response.text();
      console.error('Response text:', text.substring(0, 200));
      return {
        success: false,
        error: 'Server returned non-JSON response',
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call error:', error);
    return {
      success: false,
      error: 'Network error occurred',
    };
  }
}

// Authentication API
export const authApi = {
  login: (credentials: LoginRequest) =>
    apiCall<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  logout: () =>
    apiCall<null>('/auth/logout', {
      method: 'POST',
    }),

  validate: (userId: number) =>
    apiCall<LoginResponse>('/auth/validate', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
};

// Stocks API
export const stocksApi = {
  getAll: () => apiCall<Stock[]>('/stocks'),
};

// Clients API
export const clientsApi = {
  getAll: (stockId?: string, includeInactive?: boolean) => {
    const params = new URLSearchParams();
    if (stockId) params.append('stockId', stockId);
    if (includeInactive) params.append('includeInactive', 'true');
    return apiCall<Client[]>(`/clients?${params.toString()}`);
  },

  create: (client: CreateClientRequest) =>
    apiCall<{ id: number }>('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    }),

  update: (client: UpdateClientRequest) =>
    apiCall<null>('/clients', {
      method: 'PUT',
      body: JSON.stringify(client),
    }),

  delete: (id: number) =>
    apiCall<null>(`/clients?id=${id}`, {
      method: 'DELETE',
    }),
};

// Fournisseurs API
export const fournisseursApi = {
  getAll: (stockId?: string, includeInactive?: boolean) => {
    const params = new URLSearchParams();
    if (stockId) params.append('stockId', stockId);
    if (includeInactive) params.append('includeInactive', 'true');
    return apiCall<Fournisseur[]>(`/fournisseurs?${params.toString()}`);
  },

  create: (fournisseur: CreateFournisseurRequest) =>
    apiCall<{ id: number }>('/fournisseurs', {
      method: 'POST',
      body: JSON.stringify(fournisseur),
    }),

  update: (fournisseur: UpdateFournisseurRequest) =>
    apiCall<null>('/fournisseurs', {
      method: 'PUT',
      body: JSON.stringify(fournisseur),
    }),

  delete: (id: number) =>
    apiCall<null>(`/fournisseurs?id=${id}`, {
      method: 'DELETE',
    }),
};

// Achats API
export const achatsApi = {
  getAll: (stockId?: string) => {
    const params = new URLSearchParams();
    if (stockId) params.append('stockId', stockId);
    return apiCall<Achat[]>(`/achats?${params.toString()}`);
  },

  getById: (id: number, includeItems?: boolean) => {
    const params = new URLSearchParams();
    params.append('id', id.toString());
    if (includeItems) params.append('includeItems', 'true');
    return apiCall<AchatWithItems>(`/achats?${params.toString()}`);
  },

  create: (achat: CreateAchatRequest) =>
    apiCall<{ id: number }>('/achats', {
      method: 'POST',
      body: JSON.stringify(achat),
    }),

  update: (achat: { id: number; payment_status?: string; delivery_date?: string; notes?: string }) =>
    apiCall<null>('/achats', {
      method: 'PUT',
      body: JSON.stringify(achat),
    }),
};

// Enhanced Sales API
export const salesApi = {
  getAll: (stockId?: string) => {
    const params = new URLSearchParams();
    if (stockId) params.append('stockId', stockId);
    return apiCall<Sale[]>(`/sales?${params.toString()}`);
  },

  getById: (id: number) =>
    apiCall<SaleWithItems>(`/sales/${id}`),

  create: (sale: any) =>
    apiCall<{ id: number }>('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    }),

  search: (query: string, stockId?: string, type: 'all' | 'barcode' | 'client' = 'all') => {
    const params = new URLSearchParams();
    params.append('q', query);
    if (stockId) params.append('stockId', stockId);
    params.append('type', type);
    return apiCall<Sale[]>(`/sales/search?${params.toString()}`);
  },
};

// Returns API
export const returnsApi = {
  getAll: (stockId?: string) => {
    const params = new URLSearchParams();
    if (stockId) params.append('stockId', stockId);
    return apiCall<any[]>(`/returns?${params.toString()}`);
  },

  getById: (id: number) =>
    apiCall<any>(`/returns/${id}`),

  create: (returnData: any) =>
    apiCall<{ id: number; balance_adjustment: number }>('/returns', {
      method: 'POST',
      body: JSON.stringify(returnData),
    }),

  update: (id: number, data: { status: string; notes?: string }) =>
    apiCall<null>(`/returns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiCall<null>(`/returns/${id}`, {
      method: 'DELETE',
    }),
};

// Stock Movements API
export const stockMovementsApi = {
  getAll: (stockId?: string, toStockId?: string) => {
    const params = new URLSearchParams();
    if (stockId) params.append('stockId', stockId);
    if (toStockId) params.append('toStockId', toStockId);
    return apiCall<any[]>(`/stock-movements?${params.toString()}`);
  },

  getById: (id: number) =>
    apiCall<any>(`/stock-movements/${id}`),

  create: (movementData: any) =>
    apiCall<{ id: number; movement_number: string }>('/stock-movements', {
      method: 'POST',
      body: JSON.stringify(movementData),
    }),

  confirm: (id: number, requesting_stock_id?: string) =>
    apiCall<null>(`/stock-movements/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'confirm', requesting_stock_id }),
    }),

  claim: (id: number, claim_message: string, requesting_stock_id?: string) =>
    apiCall<null>(`/stock-movements/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'claim', claim_message, requesting_stock_id }),
    }),

  getReceived: (stockId: string) => {
    const params = new URLSearchParams();
    params.append('toStockId', stockId);
    params.append('type', 'received');
    return apiCall<any[]>(`/stock-movements?${params.toString()}`);
  },
};

// Invoices API
export const invoicesApi = {
  getAll: (stockId?: string) => {
    const params = new URLSearchParams();
    if (stockId) params.append('stockId', stockId);
    return apiCall<Invoice[]>(`/invoices?${params.toString()}`);
  },

  create: (invoice: any) =>
    apiCall<{ id: number; invoice_number: string }>('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    }),

  update: (invoice: { id: number; payment_status?: string; due_date?: string; notes?: string }) =>
    apiCall<null>('/invoices', {
      method: 'PUT',
      body: JSON.stringify(invoice),
    }),
};

// Products API
export const productsApi = {
  getAll: (stockId?: string) => {
    const params = stockId ? `?stockId=${stockId}` : '';
    return apiCall<Product[]>(`/products${params}`);
  },

  getById: (id: number) =>
    apiCall<Product>(`/products/${id}`),

  create: (product: CreateProductRequest) =>
    apiCall<{ id: number }>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),

  update: (id: number, product: UpdateProductRequest) =>
    apiCall<null>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    }),

  delete: (id: number) =>
    apiCall<null>(`/products/${id}`, {
      method: 'DELETE',
    }),

  searchByBarcode: (barcode: string) =>
    apiCall<Product | null>(`/products/search?barcode=${encodeURIComponent(barcode)}`),

  searchByReference: (reference: string) =>
    apiCall<Product | null>(`/products/search?reference=${encodeURIComponent(reference)}`),
};

// Statistics API
export const statisticsApi = {
  get: (stockId?: string, period = 7) => {
    const params = new URLSearchParams();
    if (stockId) params.append('stockId', stockId);
    params.append('period', period.toString());
    
    return apiCall<any>(`/statistics?${params.toString()}`);
  },
};
