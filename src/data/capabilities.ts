export const capabilities = [
  { name: 'Custom', status: 'Request-based', index: '01', href: '/services#custom-3d-printing' },
  { name: 'Design', status: 'Selected requests', index: '02', href: '/services#design-support' },
  { name: 'Prototype', status: 'Review required', index: '03', href: '/services#prototyping' },
  { name: 'Engineering', status: 'Selected requirements', index: '04', href: '/services#functional-parts' },
  { name: 'Manufacturing', status: 'Small-batch, case-by-case', index: '05', href: '/services#small-batch' },
] as const;
