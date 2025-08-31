// Client-side security utilities

// XSS Protection for client-side rendering
export function sanitizeForDisplay(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Input validation for forms
export const clientValidators = {
  required: (value: any, fieldName: string = 'Ce champ'): string | null => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} est requis`;
    }
    return null;
  },

  email: (email: string): string | null => {
    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Format d\'email invalide';
    }
    if (email.length > 255) {
      return 'Email trop long (max 255 caractères)';
    }
    return null;
  },

  phone: (phone: string): string | null => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\s/g, '');
    const phoneRegex = /^(\+33|0)[1-9](\d{8})$/;
    if (!phoneRegex.test(cleanPhone)) {
      return 'Format de téléphone invalide (ex: 01 23 45 67 89)';
    }
    return null;
  },

  price: (price: number | string): string | null => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) {
      return 'Prix invalide';
    }
    if (numPrice < 0) {
      return 'Le prix ne peut pas être négatif';
    }
    if (numPrice > 999999.99) {
      return 'Prix trop élevé (max 999,999.99)';
    }
    return null;
  },

  quantity: (quantity: number | string): string | null => {
    const numQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;
    if (isNaN(numQuantity) || !Number.isInteger(numQuantity)) {
      return 'Quantité invalide';
    }
    if (numQuantity < 0) {
      return 'La quantité ne peut pas être négative';
    }
    if (numQuantity > 999999) {
      return 'Quantité trop élevée (max 999,999)';
    }
    return null;
  },

  text: (text: string, minLength: number = 1, maxLength: number = 255): string | null => {
    if (!text) return null;
    if (text.length < minLength) {
      return `Minimum ${minLength} caractère(s) requis`;
    }
    if (text.length > maxLength) {
      return `Maximum ${maxLength} caractères autorisés`;
    }
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        return 'Contenu non autorisé détecté';
      }
    }
    return null;
  },

  barcode: (barcode: string): string | null => {
    if (!barcode) return null;
    if (!/^[A-Za-z0-9]{6,20}$/.test(barcode)) {
      return 'Code-barres invalide (6-20 caractères alphanumériques)';
    }
    return null;
  }
};

// Form validation helper
export function validateForm(data: Record<string, any>, rules: Record<string, any[]>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  Object.entries(rules).forEach(([field, validators]) => {
    const value = data[field];
    
    for (const validator of validators) {
      let error: string | null = null;
      
      if (typeof validator === 'function') {
        error = validator(value);
      } else if (typeof validator === 'object' && validator.fn) {
        error = validator.fn(value, ...(validator.args || []));
      }
      
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Secure local storage wrapper
export const secureStorage = {
  set: (key: string, value: any): void => {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  get: (key: string): any | null => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const data = JSON.parse(item);
      
      // Check if expired
      if (data.expires && Date.now() > data.expires) {
        localStorage.removeItem(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
};

// API request wrapper with security
export async function secureApiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };

  // Add authentication if available
  const authData = secureStorage.get('auth');
  if (authData && authData.token) {
    defaultHeaders['Authorization'] = `Bearer ${authData.token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  // Validate and sanitize request body
  if (config.body && typeof config.body === 'string') {
    try {
      const bodyData = JSON.parse(config.body);
      const sanitizedData = sanitizeRequestData(bodyData);
      config.body = JSON.stringify(sanitizedData);
    } catch (error) {
      console.warn('Failed to sanitize request body:', error);
    }
  }

  return fetch(url, config);
}

// Sanitize data before sending to API
function sanitizeRequestData(data: any): any {
  if (typeof data === 'string') {
    return data.trim().substring(0, 1000); // Limit string length
  }

  if (typeof data === 'number') {
    return Number.isFinite(data) ? data : 0;
  }

  if (Array.isArray(data)) {
    return data.slice(0, 100).map(sanitizeRequestData); // Limit array size
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    Object.keys(data).slice(0, 50).forEach(key => { // Limit object keys
      if (typeof key === 'string' && key.length <= 100) {
        sanitized[key] = sanitizeRequestData(data[key]);
      }
    });
    return sanitized;
  }

  return data;
}

// Error handling for API responses
export async function handleApiResponse<T>(response: Response): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  try {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data || data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur de communication avec le serveur'
    };
  }
}

// Security event logging (client-side)
export function logClientSecurityEvent(
  event: string,
  details: any,
  severity: 'low' | 'medium' | 'high' = 'medium'
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  console.warn(`[CLIENT SECURITY ${severity.toUpperCase()}]`, logEntry);

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to security monitoring endpoint
    secureApiRequest('/api/security/log', {
      method: 'POST',
      body: JSON.stringify(logEntry)
    }).catch(error => {
      console.warn('Failed to log security event:', error);
    });
  }
}

// Content Security Policy violation handler
export function setupCSPViolationHandler(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('securitypolicyviolation', (event) => {
      logClientSecurityEvent('csp_violation', {
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        originalPolicy: event.originalPolicy
      }, 'high');
    });
  }
}
