import { NextRequest, NextResponse } from 'next/server';

// Security headers for all responses
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );
  
  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
  
  return response;
}

// Rate limiting storage (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(
  clientIP: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitMap.delete(key);
    }
  }
  
  const current = rateLimitMap.get(clientIP);
  
  if (!current || current.resetTime < windowStart) {
    // New window
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  current.count++;
  return { allowed: true, remaining: maxRequests - current.count };
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-vercel-forwarded-for');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  if (remoteAddr) {
    return remoteAddr.split(',')[0].trim();
  }
  
  return 'unknown';
}

// Validate request method and headers
function validateRequest(request: NextRequest): { valid: boolean; error?: string } {
  const method = request.method;
  const contentType = request.headers.get('content-type');
  const userAgent = request.headers.get('user-agent');
  
  // Check for missing user agent (potential bot)
  if (!userAgent) {
    return { valid: false, error: 'Missing user agent' };
  }
  
  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    if (!contentType || !contentType.includes('application/json')) {
      return { valid: false, error: 'Invalid content type' };
    }
  }
  
  // Check for suspicious patterns in URL
  const url = request.url;
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempt
    /union.*select/i,  // SQL injection
    /exec\(/i,  // Code execution
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      return { valid: false, error: 'Suspicious request pattern' };
    }
  }
  
  return { valid: true };
}

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const url = request.url;
  const method = request.method;
  
  // Skip middleware for static files and Next.js internals
  if (
    url.includes('/_next/') ||
    url.includes('/favicon.ico') ||
    url.includes('/api/_next') ||
    url.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }
  
  // Validate request
  const validation = validateRequest(request);
  if (!validation.valid) {
    console.warn(`[SECURITY] Blocked suspicious request from ${clientIP}: ${validation.error}`);
    return new NextResponse('Bad Request', { status: 400 });
  }
  
  // Apply rate limiting for API routes
  if (url.includes('/api/')) {
    const { allowed, remaining } = rateLimit(clientIP, 200, 10 * 60 * 1000); // 200 requests per 10 minutes
    
    if (!allowed) {
      console.warn(`[SECURITY] Rate limit exceeded for ${clientIP}`);
      return new NextResponse(JSON.stringify({
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 600
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '600', // 10 minutes
          'X-RateLimit-Limit': '200',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 600)
        }
      });
    }
    
    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', '200');
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + 600));
    
    // Add security headers
    const secureResponse = addSecurityHeaders(response);
    
    // Add performance headers
    const duration = Date.now() - startTime;
    secureResponse.headers.set('X-Response-Time', `${duration}ms`);
    
    // Log API access
    console.log(`[API] ${method} ${url} - ${clientIP} - ${duration}ms`);
    
    return secureResponse;
  }
  
  // For non-API routes, just add security headers
  const response = NextResponse.next();
  const secureResponse = addSecurityHeaders(response);
  
  // Add performance headers
  const duration = Date.now() - startTime;
  secureResponse.headers.set('X-Response-Time', `${duration}ms`);
  
  return secureResponse;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
