// API Security middleware and utilities

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, validateRequest, logSecurityEvent, validators } from './security';

// Security headers for API responses
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  
  return response;
}

// API request validation and security checks
export async function validateApiRequest(
  request: NextRequest,
  options: {
    requireAuth?: boolean;
    allowedMethods?: string[];
    rateLimit?: { maxRequests: number; windowMs: number };
    validateBody?: boolean;
  } = {}
): Promise<{ valid: boolean; error?: string; clientIP?: string }> {
  
  const { valid, errors, clientIP } = validateRequest(request);
  
  if (!valid) {
    logSecurityEvent('Invalid request', { errors, url: request.url }, 'medium');
    return { valid: false, error: errors.join(', '), clientIP };
  }
  
  // Method validation
  if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
    logSecurityEvent('Method not allowed', { method: request.method, url: request.url }, 'low');
    return { valid: false, error: 'Method not allowed', clientIP };
  }
  
  // Rate limiting
  if (options.rateLimit) {
    const { allowed, remaining } = rateLimit(
      clientIP, 
      options.rateLimit.maxRequests, 
      options.rateLimit.windowMs
    );
    
    if (!allowed) {
      logSecurityEvent('Rate limit exceeded', { clientIP, url: request.url }, 'high');
      return { valid: false, error: 'Rate limit exceeded', clientIP };
    }
  }
  
  // Body validation for POST/PUT requests
  if (options.validateBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const body = await request.clone().json();
      
      // Basic body validation
      if (!body || typeof body !== 'object') {
        return { valid: false, error: 'Invalid request body', clientIP };
      }
      
      // Check for suspicious patterns in body
      const bodyStr = JSON.stringify(body);
      if (bodyStr.length > 100000) { // 100KB limit
        return { valid: false, error: 'Request body too large', clientIP };
      }
      
    } catch (error) {
      return { valid: false, error: 'Invalid JSON in request body', clientIP };
    }
  }
  
  return { valid: true, clientIP };
}

// Secure API response wrapper
export function createSecureApiResponse<T>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse {
  const response = NextResponse.json({
    success: status < 400,
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    message,
    timestamp: new Date().toISOString()
  }, { status });
  
  return addSecurityHeaders(response);
}

// Input sanitization for API endpoints
export function sanitizeApiInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .substring(0, 1000); // Limit length
  }
  
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : 0;
  }
  
  if (Array.isArray(input)) {
    return input.slice(0, 100).map(sanitizeApiInput); // Limit array size
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    Object.keys(input).slice(0, 50).forEach(key => { // Limit object keys
      if (typeof key === 'string' && key.length <= 100) {
        sanitized[key] = sanitizeApiInput(input[key]);
      }
    });
    return sanitized;
  }
  
  return input;
}

// Validate specific data types for API endpoints
export const apiValidators = {
  product: (data: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.length < 1 || data.name.length > 255) {
      errors.push('Nom du produit invalide');
    }
    
    if (!validators.price(data.price)) {
      errors.push('Prix invalide');
    }
    
    if (!validators.quantity(data.quantity)) {
      errors.push('Quantité invalide');
    }
    
    if (data.reference && (typeof data.reference !== 'string' || data.reference.length > 100)) {
      errors.push('Référence invalide');
    }
    
    return { valid: errors.length === 0, errors };
  },
  
  client: (data: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.length < 1 || data.name.length > 255) {
      errors.push('Nom du client invalide');
    }
    
    if (data.email && !validators.email(data.email)) {
      errors.push('Email invalide');
    }
    
    if (data.phone && !validators.phone(data.phone)) {
      errors.push('Téléphone invalide');
    }
    
    return { valid: errors.length === 0, errors };
  },
  
  sale: (data: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!data.user_id || !Number.isInteger(data.user_id) || data.user_id <= 0) {
      errors.push('ID utilisateur invalide');
    }
    
    if (!data.stock_id || !Number.isInteger(data.stock_id) || data.stock_id <= 0) {
      errors.push('ID stock invalide');
    }
    
    if (!Array.isArray(data.items) || data.items.length === 0) {
      errors.push('Articles de vente invalides');
    } else {
      data.items.forEach((item: any, index: number) => {
        if (!Number.isInteger(item.product_id) || item.product_id <= 0) {
          errors.push(`Article ${index + 1}: ID produit invalide`);
        }
        if (!validators.quantity(item.quantity)) {
          errors.push(`Article ${index + 1}: Quantité invalide`);
        }
        if (!validators.price(item.unit_price)) {
          errors.push(`Article ${index + 1}: Prix unitaire invalide`);
        }
      });
    }
    
    return { valid: errors.length === 0, errors };
  }
};

// Authentication validation for API endpoints
export function validateAuthToken(request: NextRequest): { valid: boolean; userId?: number; role?: string } {
  // For now, we're using localStorage on client side
  // In production, implement proper JWT or session tokens
  
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { valid: false };
  }
  
  // Basic token validation (implement proper JWT validation in production)
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(atob(token));
    
    if (decoded.expiresAt && decoded.expiresAt < Date.now()) {
      return { valid: false };
    }
    
    return { 
      valid: true, 
      userId: decoded.userId, 
      role: decoded.role 
    };
  } catch {
    return { valid: false };
  }
}

// Log API access for security monitoring
export function logApiAccess(
  request: NextRequest,
  response: NextResponse,
  userId?: number,
  duration?: number
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    status: response.status,
    userId,
    duration,
    userAgent: request.headers.get('user-agent'),
    clientIP: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
  };
  
  console.log('[API ACCESS]', logEntry);
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Implement API monitoring integration
  }
}
