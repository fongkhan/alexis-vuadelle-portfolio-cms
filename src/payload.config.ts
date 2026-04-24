import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Projects } from './collections/Projects'
import { Profile } from './globals/Profile'
import { HomePage } from './globals/HomePage'
import { AboutPage } from './globals/AboutPage'
import { ProjectsPage } from './globals/ProjectsPage'
import { seoPlugin } from '@payloadcms/plugin-seo'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const dbUri = process.env.DATABASE_URI || ''
const isPostgres = dbUri.startsWith('postgres') || dbUri.startsWith('postgresql')

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Projects],
  globals: [Profile, HomePage, AboutPage, ProjectsPage],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'fallback-secret-key',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: isPostgres 
    ? postgresAdapter({
        pool: {
          connectionString: dbUri,
        },
      })
    : sqliteAdapter({
        client: {
          url: dbUri || `file:${path.resolve(dirname, '../../payload.db')}`,
        },
      }),
  sharp,
  plugins: [
    seoPlugin({
      collections: ['projects'],
      globals: ['home-page', 'about-page', 'projects-page'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => {
        return doc?.title ? `${doc.title} | Alexis Vuadelle` : 'Alexis Vuadelle | Portfolio'
      },
      generateDescription: ({ doc }) => {
        return doc?.description || 'Portfolio of Alexis Vuadelle, Developer based in France.'
      },
      generateImage: ({ doc }) => {
         return doc?.featuredImage || null
      },
      generateURL: ({ doc, collectionSlug }) => {
        const url = 'https://alexis-vuadelle.com'
        if (collectionSlug === 'projects' && doc?.slug) {
           return `${url}/projects/${doc.slug}`
        }
        return url
      }
    })
  ],
})
