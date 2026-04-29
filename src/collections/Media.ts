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
    // Generate responsive sizes for different devices
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: undefined,
      },
      {
        name: 'card',
        width: 768,
        height: undefined,
      },
      {
        name: 'hero',
        width: 1200,
        height: undefined,
      },
    ],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  },
}
