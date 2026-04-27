import type { GlobalConfig } from 'payload'
import { triggerWebhook } from '../hooks/triggerWebhook'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  label: 'About Page',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [triggerWebhook],
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
