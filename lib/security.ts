// Security utilities for production readiness

import { NextRequest } from 'next/server';

// XSS Protection - Sanitize HTML content
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';

  // Basic HTML sanitization
  return dirty
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/&/g, '&amp;');
}

// Sanitize input for safe database storage
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, 1000); // Limit length
}

// Input validation utilities
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  },

  password: (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }
    
    return { valid: errors.length === 0, errors };
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^(\+33|0)[1-9](\d{8})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  price: (price: number): boolean => {
    return price >= 0 && price <= 999999.99 && Number.isFinite(price);
  },

  quantity: (quantity: number): boolean => {
    return Number.isInteger(quantity) && quantity >= 0 && quantity <= 999999;
  },

  barcode: (barcode: string): boolean => {
    return /^[A-Za-z0-9]{6,20}$/.test(barcode);
  },

  stockId: (stockId: string): boolean => {
    const validStocks = ['al-ouloum', 'renaissance', 'gros', 'super-admin'];
    return validStocks.includes(stockId);
  }
};

// Rate limiting utilities
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitMap.delete(key);
    }
  }
  
  const current = rateLimitMap.get(identifier);
  
  if (!current || current.resetTime < windowStart) {
    // New window
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }
  
  current.count++;
  return { allowed: true, remaining: maxRequests - current.count, resetTime: current.resetTime };
}

// CSRF Protection
export function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken && token.length === 64;
}

// SQL Injection Protection - Additional validation
export function validateSQLParams(params: any[]): boolean {
  return params.every(param => {
    if (typeof param === 'string') {
      // Check for common SQL injection patterns
      const sqlInjectionPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
        /(--|\/\*|\*\/|;)/,
        /(\b(OR|AND)\b.*=.*)/i
      ];
      
      return !sqlInjectionPatterns.some(pattern => pattern.test(param));
    }
    return true;
  });
}

// Request validation middleware
export function validateRequest(request: NextRequest): {
  valid: boolean;
  errors: string[];
  clientIP: string;
} {
  const errors: string[] = [];
  
  // Get client IP
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  // Check content type for POST/PUT requests
  const method = request.method;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      errors.push('Invalid content type');
    }
  }
  
  // Check for required headers
  const userAgent = request.headers.get('user-agent');
  if (!userAgent) {
    errors.push('Missing user agent');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    clientIP
  };
}

// Secure session management
export const sessionManager = {
  create: (userId: number, role: string, stockId?: string) => {
    const sessionData = {
      userId,
      role,
      stockId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      csrfToken: generateCSRFToken()
    };
    
    return {
      sessionToken: btoa(JSON.stringify(sessionData)),
      csrfToken: sessionData.csrfToken
    };
  },
  
  validate: (sessionToken: string): { valid: boolean; data?: any } => {
    try {
      const data = JSON.parse(atob(sessionToken));
      
      if (data.expiresAt < Date.now()) {
        return { valid: false };
      }
      
      return { valid: true, data };
    } catch {
      return { valid: false };
    }
  }
};

// Error logging for security events
export function logSecurityEvent(
  event: string, 
  details: any, 
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
  };
  
  console.warn(`[SECURITY ${severity.toUpperCase()}]`, logEntry);
  
  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Implement security monitoring integration
  }
}
