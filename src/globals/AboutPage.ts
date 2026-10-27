import type { GlobalConfig } from 'payload'
import { triggerWebhook } from '../hooks/triggerWebhook'
import { createBackgroundParallaxFields } from '../fields/backgroundParallaxFields'

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
    ...createBackgroundParallaxFields({
      imageFieldName: 'backgroundImage',
      imageLabel: "Image d'arrière-plan",
      imageDescription: 'Image optionnelle affichée en arrière-plan de la section "About".',
      parallaxFieldName: 'enableParallax',
      parallaxLabel: "Activer l'effet Parallaxe",
      rateFieldName: 'parallaxRate',
      opacityFieldName: 'backgroundOverlayOpacity',
      defaultOpacity: 60,
    }),
  ],
}
