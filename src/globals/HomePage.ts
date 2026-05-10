import type { GlobalConfig } from 'payload'
import { triggerWebhook } from '../hooks/triggerWebhook'

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Home Page',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [triggerWebhook],
  },
  fields: [
    {
      name: 'heroHeadline',
      type: 'text',
      required: true,
      defaultValue: 'Créons des projets ensemble',
    },
    {
      name: 'heroDescription',
      type: 'textarea',
      required: true,
      defaultValue: "Je suis développeur spécialisé dans la création d'applications web interactives et performantes, ainsi que dans le développement de projets personnels qui résolvent des problèmes concrets.",
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
      defaultValue: 'Projets',
    },
    {
      name: 'projectsSubtitle',
      type: 'text',
      required: true,
      defaultValue: 'Mes récents projets et réalisations.',
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Arrière-plan du site',
          fields: [
            {
              name: 'siteBackgroundImage',
              label: 'Image d\'arrière-plan globale',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Remplace les formes floues (blobs) par une image d\'arrière-plan sur tout le site.',
              },
            },
            {
              name: 'siteEnableParallax',
              label: 'Activer le Parallaxe global',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                condition: (data) => Boolean(data?.siteBackgroundImage),
              },
            },
            {
              name: 'siteParallaxRate',
              label: 'Taux de Parallaxe',
              type: 'number',
              min: 0,
              max: 100,
              defaultValue: 20,
              admin: {
                condition: (data) => Boolean(data?.siteBackgroundImage) && Boolean(data?.siteEnableParallax),
              },
            },
            {
              name: 'siteBackgroundOverlayOpacity',
              label: 'Opacité du voile blanc (%)',
              type: 'number',
              min: 0,
              max: 100,
              defaultValue: 80,
              admin: {
                description: 'Voile blanc pour garantir la lisibilité du texte (0 = image pure, 100 = blanc complet).',
                condition: (data) => Boolean(data?.siteBackgroundImage),
              },
            },
          ]
        }
      ]
    }
  ],
}
