import type { GlobalConfig } from 'payload'

export const Profile: GlobalConfig = {
  slug: 'profile',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'githubLink',
      type: 'text',
    },
    {
      name: 'linkedinLink',
      type: 'text',
    },
    {
      name: 'email',
      type: 'text',
    },
  ],
}
