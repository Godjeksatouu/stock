"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

interface DebugAuthProps {
  children: React.ReactNode
}

export default function DebugAuth({ children }: DebugAuthProps) {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [showDebug, setShowDebug] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    console.log('🐛 DebugAuth: Component mounted', { pathname })
    
    const userData = localStorage.getItem("user")
    const info = {
      pathname,
      hasUserData: !!userData,
      userData: userData ? JSON.parse(userData) : null,
      timestamp: new Date().toISOString()
    }
    
    setDebugInfo(info)
    console.log('🐛 DebugAuth: Debug info', info)
    
    // Show debug panel if there's an issue
    if (pathname.includes('/dashboard') && !userData) {
      setShowDebug(true)
      console.log('🚨 DebugAuth: Dashboard access without user data!')
    }
  }, [pathname])

  if (showDebug) {
    return (
      <div className="min-h-screen bg-red-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">🐛 Debug Auth Panel</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Current State</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      localStorage.removeItem('user')
                      router.push('/')
                    }}
                    className="block w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Clear Storage & Go Home
                  </button>
                  
                  <button
                    onClick={() => router.push('/login?stock=renaissance')}
                    className="block w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Go to Login
                  </button>
                  
                  <button
                    onClick={() => setShowDebug(false)}
                    className="block w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Hide Debug & Continue
                  </button>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="block w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Expected Flow</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>User logs in → API returns success</li>
                <li>Login page stores user data in localStorage</li>
                <li>User is redirected to dashboard</li>
                <li>RoleGuard/CaissierLayout checks localStorage</li>
                <li>If valid → show dashboard, if not → redirect to home</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
