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
    {
      name: 'backgroundImage',
      label: 'Image d\'arrière-plan',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Image optionnelle affichée en arrière-plan de la section "About".',
      },
    },
    {
      name: 'enableParallax',
      label: 'Activer l\'effet Parallaxe',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Si activé, l\'image d\'arrière-plan aura un effet de défilement parallaxe.',
        condition: (data) => Boolean(data?.backgroundImage),
      },
    },
    {
      name: 'backgroundOverlayOpacity',
      label: 'Opacité du voile blanc (%)',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 60,
      admin: {
        description: 'Ajuste la lisibilité du texte au-dessus de l\'image (0 = transparent, 100 = blanc complet).',
        condition: (data) => Boolean(data?.backgroundImage),
      },
    },
  ],
}
