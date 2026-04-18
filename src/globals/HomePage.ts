import type { GlobalConfig } from 'payload'

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Home Page',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'heroHeadline',
      type: 'text',
      required: true,
      defaultValue: 'Building Digital Solutions',
    },
    {
      name: 'heroDescription',
      type: 'textarea',
      required: true,
      defaultValue: "I'm a developer focusing on creating interactive, high-performance web applications and side projects that solve real problems.",
    },
    {
      name: 'profilePicture',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'projectsTitle',
      type: 'text',
      required: true,
      defaultValue: 'Selected Work',
    },
    {
      name: 'projectsSubtitle',
      type: 'text',
      required: true,
      defaultValue: 'A showcase of my recent side projects and development exploits.',
    },
  ],
}
