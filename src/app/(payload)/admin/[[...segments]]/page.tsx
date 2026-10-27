/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import type { Metadata } from 'next'
import React from 'react'

import { formatServerError, isNextRouterError } from '@/lib/serverErrorLogger'
import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = async ({ params, searchParams }: Args): Promise<Metadata> => {
  try {
    return await generatePageMetadata({ config, params, searchParams })
  } catch (err: unknown) {
    if (isNextRouterError(err)) {
      throw err
    }
    formatServerError('generateMetadata', err)
    return { title: 'Payload Admin' }
  }
}

const Page = async ({ params, searchParams }: Args) => {
  try {
    return await RootPage({ config, params, searchParams, importMap })
  } catch (err: unknown) {
    if (isNextRouterError(err)) {
      throw err
    }
    const detail = formatServerError('AdminRootPage', err)
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#111', color: '#f87171' }}>
        <h2 style={{ color: '#fff' }}>Diagnostic Erreur Serveur (Admin Page)</h2>
        <p style={{ color: '#ccc' }}>Ce détail a également été écrit dans <code>server-error.log</code> à la racine du CMS :</p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#1e1e1e', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
          {detail}
        </pre>
      </div>
    )
  }
}

export default Page
