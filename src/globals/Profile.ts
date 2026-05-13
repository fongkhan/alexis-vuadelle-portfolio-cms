import type { GlobalConfig } from 'payload'
import { triggerWebhook } from '../hooks/triggerWebhook'

export const Profile: GlobalConfig = {
  slug: 'profile',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [triggerWebhook],
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
    {
      name: 'twitchLink',
      type: 'text',
    },
    {
      name: 'youtubeLink',
      type: 'text',
    },
    {
      name: 'cvFile',
      label: 'CV (PDF)',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Uploadez votre CV au format PDF. Un bouton "Télécharger mon CV" apparaîtra sur la page d\'accueil.',
      },
    },
  ],
}
