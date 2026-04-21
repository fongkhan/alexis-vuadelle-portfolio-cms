import Link from 'next/link'
import React from 'react'

export default function NotFound() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link href="/" style={{ marginTop: '20px', color: '#0070f3', textDecoration: 'underline' }}>
        Return Home
      </Link>
    </div>
  )
}
