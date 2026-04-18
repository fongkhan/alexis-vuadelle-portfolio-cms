import type { GlobalConfig } from 'payload'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  label: 'About Page',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'About Me.',
    },
    {
      name: 'subtitle',
      type: 'text',
      required: true,
      defaultValue: 'Get to know more about my background and my journey in tech.',
    },
    {
      name: 'content',
      type: 'richText',
    },
  ],
}
