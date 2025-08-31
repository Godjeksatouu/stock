'use client'

import { useEffect, useState } from 'react'

export default function ClientScripts() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    // Clean up browser extension attributes that cause hydration issues
    const cleanupBrowserExtensionAttributes = () => {
      const elementsWithBisAttributes = document.querySelectorAll('[bis_skin_checked]')
      elementsWithBisAttributes.forEach(element => {
        element.removeAttribute('bis_skin_checked')
      })
    }

    // Run cleanup immediately and after a short delay
    cleanupBrowserExtensionAttributes()
    setTimeout(cleanupBrowserExtensionAttributes, 100)

    // Load scripts on client side to avoid hydration issues
    const scripts = [
      '/robust-fetchdata.js',
      '/dialog-accessibility-fix.js',
      '/minimal-popup-fix.js'
    ]

    scripts.forEach(src => {
      // Check if script is already loaded
      if (!document.querySelector(`script[src="${src}"]`)) {
        const script = document.createElement('script')
        script.src = src
        script.async = true
        document.head.appendChild(script)
      }
    })

    // Add the inline script functionality
    try {
      const userData = localStorage.getItem('user')
      if (userData && userData.trim() !== '') {
        JSON.parse(userData) // Test if the JSON is valid
      }
    } catch (error) {
      console.warn('Nettoyage localStorage corrompu:', error)
      localStorage.removeItem('user')
    }

    console.log('✅ Layout loaded with robust fixes')

    // Debug helper
    ;(window as any).testEndpoints = function() {
      console.log('🧪 Testing endpoint fixes...')
      ;(window as any).debugEndpoints()

      // Test with undefined
      console.log('Testing undefined endpoint...')
      ;(window as any).fetchData(undefined, { method: 'GET' })
        .then((data: any) => console.log('✅ Undefined endpoint fixed:', data))
        .catch((error: any) => console.log('⚠️ Undefined endpoint error:', error.message))
    }

    // Set up a mutation observer to clean up browser extension attributes as they're added
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'bis_skin_checked') {
          const target = mutation.target as Element
          target.removeAttribute('bis_skin_checked')
        }
      })
    })

    // Start observing
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['bis_skin_checked'],
      subtree: true
    })

    // Cleanup observer on unmount
    return () => {
      observer.disconnect()
    }
  }, [isMounted])

  return null
}
