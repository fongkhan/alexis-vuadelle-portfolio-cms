import type { Field } from 'payload'

interface BackgroundParallaxOptions {
  imageFieldName: string
  imageLabel: string
  imageDescription: string
  parallaxFieldName: string
  parallaxLabel: string
  rateFieldName: string
  opacityFieldName: string
  defaultOpacity: number
}

export function createBackgroundParallaxFields({
  imageFieldName,
  imageLabel,
  imageDescription,
  parallaxFieldName,
  parallaxLabel,
  rateFieldName,
  opacityFieldName,
  defaultOpacity,
}: BackgroundParallaxOptions): Field[] {
  return [
    {
      name: imageFieldName,
      label: imageLabel,
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: imageDescription,
      },
    },
    {
      name: parallaxFieldName,
      label: parallaxLabel,
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Si activé, l\'image d\'arrière-plan aura un effet de défilement parallaxe.',
        condition: (data) => Boolean(data?.[imageFieldName]),
      },
    },
    {
      name: rateFieldName,
      label: 'Taux de Parallaxe (Vitesse)',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 20,
      admin: {
        description:
          'Vitesse de déplacement de l\'image (0 = fixe, 100 = rapide). Valeur recommandée : 20-30.',
        condition: (data) =>
          Boolean(data?.[imageFieldName]) && Boolean(data?.[parallaxFieldName]),
      },
    },
    {
      name: opacityFieldName,
      label: 'Opacité du voile blanc (%)',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: defaultOpacity,
      admin: {
        description:
          'Voile blanc pour garantir la lisibilité du texte (0 = image pure, 100 = blanc complet).',
        condition: (data) => Boolean(data?.[imageFieldName]),
      },
    },
  ]
}
