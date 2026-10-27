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
        {
          label: 'Animations & Effets',
          fields: [
            {
              name: 'animationPreset',
              label: "Style d'animations au défilement",
              type: 'select',
              defaultValue: 'dynamic',
              options: [
                {
                  label: 'Dynamique (Flou + Zoom + Glissement fluide)',
                  value: 'dynamic',
                },
                {
                  label: 'Classique (Fondu et glissement doux)',
                  value: 'smooth',
                },
                {
                  label: 'Énergique (Effet rebond / Spring + 3D)',
                  value: 'playful',
                },
                {
                  label: 'Minimal (Animations très subtiles)',
                  value: 'minimal',
                },
              ],
              admin: {
                description:
                  "Définit le style global des animations d'apparition des sections et des cartes sur le site.",
              },
            },
            {
              name: 'enableCardTilt',
              label: 'Effet 3D Tilt & Halo lumineux sur les cartes projets',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description:
                  "Incline légèrement les cartes en 3D et affiche un halo lumineux suivant le curseur de la souris.",
              },
            },
            {
              name: 'enableScrollProgress',
              label: 'Barre de progression de lecture en haut de page',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description:
                  'Affiche une fine barre dégradée tout en haut de la fenêtre indiquant la progression du scroll.',
              },
            },
          ],
        },
      ],
    },
  ],
}
