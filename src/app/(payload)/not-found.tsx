import Link from 'next/link'
import React from 'react'

export const dynamic = 'force-dynamic'

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
      <h1>404 - CMS Page Not Found</h1>
      <p>The CMS page you are looking for does not exist.</p>
      <Link href="/admin" style={{ marginTop: '20px', color: '#0070f3', textDecoration: 'underline' }}>
        Return to Admin
      </Link>
    </div>
  )
}
