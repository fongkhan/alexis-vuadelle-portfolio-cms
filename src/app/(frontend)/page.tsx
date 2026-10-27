import { headers as getHeaders } from 'next/headers.js'
import Image from 'next/image'
import { getPayload } from 'payload'
import React from 'react'

import { formatServerError, isNextRouterError } from '@/lib/serverErrorLogger'
import config from '@/payload.config'
import './styles.css'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  try {
    const headers = await getHeaders()
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })
    const { user } = await payload.auth({ headers })

    return (
      <div className="home">
        <div className="content">
          <picture>
            <source srcSet="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg" />
            <Image
              alt="Payload Logo"
              height={65}
              src="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg"
              width={65}
            />
          </picture>
          {!user && <h1>Welcome to your new project.</h1>}
          {user && <h1>Welcome back, {user.email}</h1>}
          <div className="links">
            <a
              className="admin"
              href={payloadConfig.routes.admin}
              rel="noopener noreferrer"
              target="_blank"
            >
              Go to admin panel
            </a>
            <a
              className="docs"
              href="https://payloadcms.com/docs"
              rel="noopener noreferrer"
              target="_blank"
            >
              Documentation
            </a>
          </div>
        </div>
        <div className="footer">
          <p>Payload CMS Backend — Alexis Vuadelle Portfolio</p>
        </div>
      </div>
    )
  } catch (err: unknown) {
    if (isNextRouterError(err)) {
      throw err
    }
    const detail = formatServerError('HomePage', err)
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#111', color: '#f87171', minHeight: '100vh' }}>
        <h2 style={{ color: '#fff' }}>Diagnostic Erreur Serveur (HomePage)</h2>
        <p style={{ color: '#ccc' }}>Ce détail a également été écrit dans <code>server-error.log</code> à la racine du CMS :</p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#1e1e1e', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
          {detail}
        </pre>
      </div>
    )
  }
}
