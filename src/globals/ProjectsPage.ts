import type { GlobalConfig } from 'payload'

export const ProjectsPage: GlobalConfig = {
  slug: 'projects-page',
  label: 'Projects Page',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'All Projects',
    },
    {
      name: 'subtitle',
      type: 'text',
      required: true,
      defaultValue: 'A comprehensive list of my side projects, experiments, and applications.',
    },
  ],
}
