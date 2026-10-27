/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import '@payloadcms/next/css'
import { headers as getHeaders } from 'next/headers.js'
import type { ServerFunctionClient } from 'payload'
import { getPayload } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { formatServerError, isNextRouterError } from '@/lib/serverErrorLogger'
import { importMap } from './admin/importMap.js'
import './custom.scss'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = async ({ children }: Args) => {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config, importMap })
    await payload.auth({ headers })
    return (
      <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
        {children}
      </RootLayout>
    )
  } catch (err: unknown) {
    if (isNextRouterError(err)) {
      throw err
    }
    const detail = formatServerError('AdminRootLayout', err)
    return (
      <html lang="fr">
        <body style={{ padding: '2rem', fontFamily: 'monospace', background: '#111', color: '#f87171', margin: 0 }}>
          <h2 style={{ color: '#fff' }}>Diagnostic Erreur Serveur (Admin Layout)</h2>
          <p style={{ color: '#ccc' }}>Ce détail a également été écrit dans <code>server-error.log</code> à la racine du CMS :</p>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#1e1e1e', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
            {detail}
          </pre>
        </body>
      </html>
    )
  }
}

export default Layout
