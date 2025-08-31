"use client"

import { useEffect, useState } from "react"

export default function SimpleDebug() {
  const [mounted, setMounted] = useState(false)
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    console.log('🔍 SimpleDebug: Component mounted')
    
    const data = localStorage.getItem("user")
    console.log('🔍 SimpleDebug: localStorage data:', data)

    if (data && data.trim() !== '') {
      try {
        const parsed = JSON.parse(data)
        setUserData(parsed)
        console.log('🔍 SimpleDebug: Parsed user data:', parsed)
      } catch (error) {
        console.error('🔍 SimpleDebug: Error parsing user data:', error)
        // Clear corrupted localStorage
        localStorage.removeItem('user')
      }
    } else {
      console.log('🔍 SimpleDebug: No user data found')
    }
  }, [])

  if (!mounted) {
    return null // Éviter l'hydratation mismatch
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
      wordBreak: 'break-all'
    }}>
      <div><strong>Debug Info:</strong></div>
      <div>Mounted: {mounted ? 'Yes' : 'No'}</div>
      <div>Has User Data: {userData ? 'Yes' : 'No'}</div>
      {userData && (
        <div>
          <div>Role: {userData.role}</div>
          <div>Stock ID: {userData.stockId}</div>
          <div>Email: {userData.email}</div>
        </div>
      )}
    </div>
  )
}
