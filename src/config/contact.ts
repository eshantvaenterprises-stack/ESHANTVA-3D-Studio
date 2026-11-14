export const contactConfig = {
  publicEmail: 'contact@eshantva3d.co.in',
  sourceLabel: 'ESHANTVA Website',
  sourceCode: 'ESHANTVA-WEB',
  // Founder-approved public business contact handles, not recruitment channels.
  // Username live-activation and end-to-end chat are not verified by the site.
  whatsappUsername: '@ESHANTVA_3D_Studio',
  whatsappChatUrl: 'https://wa.me/ESHANTVA_3D_Studio',
  whatsappUsernameVerified: false,
  whatsappPublicContactEnabled: true,
  arattaiUsername: '@eshantva3dstudio',
  arattaiChatUrl: 'https://aratt.ai/message/@eshantva3dstudio',
  arattaiDownloadUrl: 'https://www.arattai.in/download.html',
  limits: {
    nameMaxLength: 120,
    emailMaxLength: 254,
    referenceMaxLength: 80,
    messageMinLength: 10,
    messageMaxLength: 3000,
    appointmentNotesMaxLength: 1500,
  },
  appointment: {
    anchor: 'appointment',
    periods: ['morning', 'afternoon', 'evening', 'specific_time'] as const,
  },
} as const;

export type AppointmentPeriod = typeof contactConfig.appointment.periods[number];
