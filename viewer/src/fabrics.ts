export const fabrics = {
  cotton: {
    name: 'Mid-weight cotton weave', short: 'Cotton weave', color: '#bcc5a2',
    weight: 180, thickness: 0.45, roughness: 0.94, bump: 0.16,
    stretch: 'Low', description: 'A matte, woven surface with a fine crosshatch.',
  },
  softshell: {
    name: 'Winter softshell', short: 'Winter softshell', color: '#506e80',
    weight: 320, thickness: 2.5, roughness: 0.72, bump: 0.06,
    stretch: 'Slight', description: 'A dense outer face with a soft, thicker backing.',
  },
} as const;
export type FabricId = keyof typeof fabrics;
