// Performance optimization utilities

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache for API responses
class SimpleCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private maxSize = 1000;

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000): void {
    // Clean expired entries if cache is getting full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// Global cache instance
export const apiCache = new SimpleCache();

// Cache key generators
export const cacheKeys = {
  products: (stockId?: string) => `products:${stockId || 'all'}`,
  clients: (stockId?: string) => `clients:${stockId || 'all'}`,
  sales: (stockId?: string, page: number = 1) => `sales:${stockId || 'all'}:${page}`,
  statistics: (stockId?: string, period: string = '7') => `stats:${stockId || 'all'}:${period}`,
  fournisseurs: (stockId?: string) => `fournisseurs:${stockId || 'all'}`,
  stock: (stockId: string) => `stock:${stockId}`,
  user: (userId: number) => `user:${userId}`
};

// Cache invalidation patterns
export const cacheInvalidation = {
  onProductChange: (stockId?: string) => {
    apiCache.delete(cacheKeys.products(stockId));
    apiCache.delete(cacheKeys.statistics(stockId));
  },
  
  onSaleChange: (stockId?: string) => {
    apiCache.delete(cacheKeys.sales(stockId));
    apiCache.delete(cacheKeys.statistics(stockId));
    // Clear all pages of sales
    for (let page = 1; page <= 10; page++) {
      apiCache.delete(cacheKeys.sales(stockId, page));
    }
  },
  
  onClientChange: (stockId?: string) => {
    apiCache.delete(cacheKeys.clients(stockId));
  },
  
  onFournisseurChange: (stockId?: string) => {
    apiCache.delete(cacheKeys.fournisseurs(stockId));
  }
};

// Performance monitoring
class PerformanceMonitor {
  private metrics = new Map<string, { count: number; totalTime: number; avgTime: number }>();

  startTimer(operation: string): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  private recordMetric(operation: string, duration: number): void {
    const existing = this.metrics.get(operation) || { count: 0, totalTime: 0, avgTime: 0 };
    
    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    
    this.metrics.set(operation, existing);
  }

  getMetrics(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    return Object.fromEntries(this.metrics.entries());
  }

  reset(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Database query optimization helpers
export const queryOptimization = {
  // Limit and offset for pagination
  paginate: (page: number = 1, limit: number = 50) => {
    const offset = Math.max(0, (page - 1) * limit);
    const safeLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page
    
    return { limit: safeLimit, offset };
  },

  // Build optimized WHERE clauses
  buildWhereClause: (filters: Record<string, any>): { clause: string; params: any[] } => {
    const conditions: string[] = [];
    const params: any[] = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && value.includes('%')) {
          conditions.push(`${key} LIKE ?`);
          params.push(value);
        } else {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      }
    });

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  },

  // Optimize SELECT queries
  selectFields: (table: string, fields?: string[]): string => {
    if (!fields || fields.length === 0) {
      return `${table}.*`;
    }
    
    return fields.map(field => `${table}.${field}`).join(', ');
  }
};

// Response compression and optimization
export function optimizeApiResponse(data: any): any {
  if (!data) return data;

  // Remove null/undefined values to reduce payload size
  if (Array.isArray(data)) {
    return data.map(optimizeApiResponse);
  }

  if (typeof data === 'object') {
    const optimized: any = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        optimized[key] = optimizeApiResponse(value);
      }
    });
    
    return optimized;
  }

  return data;
}

// Request deduplication
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// API response caching middleware
export function withCache<T>(
  cacheKey: string,
  ttlMs: number = 5 * 60 * 1000,
  fn: () => Promise<T>
): Promise<T> {
  return requestDeduplicator.deduplicate(cacheKey, async () => {
    // Check cache first
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    apiCache.set(cacheKey, result, ttlMs);
    
    return result;
  });
}

// Performance headers for API responses
export function addPerformanceHeaders(
  response: NextResponse,
  startTime: number,
  cacheHit: boolean = false
): NextResponse {
  const duration = Date.now() - startTime;
  
  response.headers.set('X-Response-Time', `${duration}ms`);
  response.headers.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
  response.headers.set('X-Timestamp', new Date().toISOString());
  
  return response;
}

// Memory usage monitoring
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
  cacheSize: number;
} {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const used = usage.heapUsed;
    const total = usage.heapTotal;
    
    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round((used / total) * 100),
      cacheSize: apiCache.getStats().size
    };
  }
  
  return { used: 0, total: 0, percentage: 0, cacheSize: 0 };
}

// Cleanup function for memory management
export function performCleanup(): void {
  // Clean expired cache entries
  apiCache.clear();
  
  // Reset performance metrics if they get too large
  const metrics = performanceMonitor.getMetrics();
  if (Object.keys(metrics).length > 1000) {
    performanceMonitor.reset();
  }
  
  console.log('[CLEANUP] Memory cleanup performed', getMemoryUsage());
}
