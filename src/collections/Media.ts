import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // Generate WebP versions automatically using Sharp
    formatOptions: {
      format: 'webp',
      options: {
        quality: 80,
      },
    },
    // Generate responsive sizes for different devices
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: undefined, // Auto height to maintain aspect ratio
        formatOptions: { format: 'webp', options: { quality: 75 } },
      },
      {
        name: 'card',
        width: 768,
        height: undefined,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'hero',
        width: 1200,
        height: undefined,
        formatOptions: { format: 'webp', options: { quality: 85 } },
      },
    ],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  },
}
