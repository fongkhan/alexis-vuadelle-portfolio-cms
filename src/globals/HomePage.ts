import type { GlobalConfig } from 'payload'
import { triggerWebhook } from '../hooks/triggerWebhook'
import { createBackgroundParallaxFields } from '../fields/backgroundParallaxFields'

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
      defaultValue:
        "Je suis développeur spécialisé dans la création d'applications web interactives et performantes, ainsi que dans le développement de projets personnels qui résolvent des problèmes concrets.",
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
          fields: createBackgroundParallaxFields({
            imageFieldName: 'siteBackgroundImage',
            imageLabel: "Image d'arrière-plan globale",
            imageDescription:
              "Remplace les formes floues (blobs) par une image d'arrière-plan sur tout le site.",
            parallaxFieldName: 'siteEnableParallax',
            parallaxLabel: 'Activer le Parallaxe global',
            rateFieldName: 'siteParallaxRate',
            opacityFieldName: 'siteBackgroundOverlayOpacity',
            defaultOpacity: 80,
          }),
        },
      ],
    },
  ],
}
