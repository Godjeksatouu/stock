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
      // Remove common browser extension attributes
      const selectors = [
        '[bis_skin_checked]',
        '[data-lastpass-icon-root]',
        '[data-1p-ignore]',
        '[data-bitwarden-watching]',
        '[data-dashlane-rid]',
        '[data-dashlane-observed]'
      ]

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach(element => {
          const attributeName = selector.slice(1, -1) // Remove [ and ]
          element.removeAttribute(attributeName)
        })
      })
    }

    // Run cleanup multiple times to catch extensions that add attributes later
    cleanupBrowserExtensionAttributes()
    setTimeout(cleanupBrowserExtensionAttributes, 50)
    setTimeout(cleanupBrowserExtensionAttributes, 100)
    setTimeout(cleanupBrowserExtensionAttributes, 200)
    setTimeout(cleanupBrowserExtensionAttributes, 500)

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
        if (mutation.type === 'attributes') {
          const target = mutation.target as Element
          const attributeName = mutation.attributeName

          // Remove known browser extension attributes
          const extensionAttributes = [
            'bis_skin_checked',
            'data-lastpass-icon-root',
            'data-1p-ignore',
            'data-bitwarden-watching',
            'data-dashlane-rid',
            'data-dashlane-observed'
          ]

          if (attributeName && extensionAttributes.includes(attributeName)) {
            target.removeAttribute(attributeName)
          }
        }
      })
    })

    // Start observing with expanded attribute filter
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [
        'bis_skin_checked',
        'data-lastpass-icon-root',
        'data-1p-ignore',
        'data-bitwarden-watching',
        'data-dashlane-rid',
        'data-dashlane-observed'
      ],
      subtree: true
    })

    // Cleanup observer on unmount
    return () => {
      observer.disconnect()
    }
  }, [isMounted])

  return null
}
