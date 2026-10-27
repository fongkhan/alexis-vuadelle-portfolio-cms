import dotenv from 'dotenv'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor, UploadFeature } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'

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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Ensure .env is loaded from the CMS project root even if Passenger starts from another cwd
dotenv.config({ path: path.resolve(dirname, '../.env') })
dotenv.config()

const databaseUri =
  process.env.DATABASE_URL ||
  process.env.DATABASE_URI ||
  'postgresql://postgres:postgres@127.0.0.1:5432/portfolio'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Projects],
  globals: [Profile, HomePage, AboutPage],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures.filter((f) => f.key !== 'upload'),
      UploadFeature({
        collections: {
          media: {
            fields: [
              {
                name: 'position',
                type: 'select',
                options: [
                  { label: 'Normal (Pleine largeur)', value: 'default' },
                  { label: 'Flottant à Gauche', value: 'left' },
                  { label: 'Flottant à Droite', value: 'right' },
                ],
                defaultValue: 'default',
                admin: {
                  description: "Position de l'image par rapport au texte",
                },
              },
              {
                name: 'size',
                type: 'select',
                options: [
                  { label: 'Petit (33%)', value: 'small' },
                  { label: 'Moyen (50%)', value: 'medium' },
                  { label: 'Grand (100%)', value: 'large' },
                ],
                defaultValue: 'large',
                admin: {
                  description: "Taille de l'image (important si flottante)",
                },
              },
              {
                name: 'caption',
                type: 'text',
                admin: {
                  description: "Légende optionnelle affichée sous l'image",
                },
              },
            ],
          },
        },
      }),
    ],
  }),
  secret: process.env.PAYLOAD_SECRET || 'fallback-secret-key',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseUri,
    },
    disableCreateDatabase: true,
    push: false,
  }),
  sharp,
  plugins: [
    seoPlugin({
      collections: ['projects'],
      globals: ['home-page', 'about-page'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) =>
        doc?.title
          ? `${doc.title} | Alexis Vuadelle`
          : 'Alexis Vuadelle | Portfolio',
      generateDescription: ({ doc }) =>
        doc?.description ||
        'Portfolio of Alexis Vuadelle, Developer based in France.',
      generateImage: ({ doc }) => doc?.featuredImage || null,
      generateURL: ({ doc, collectionSlug }) => {
        const url = 'https://alexis-vuadelle.com'
        if (collectionSlug === 'projects' && doc?.slug) {
          return `${url}/projects/${doc.slug}`
        }
        return url
      },
    }),
  ],
})
