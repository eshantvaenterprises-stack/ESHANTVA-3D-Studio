export type SampleProduct = {
  id: string;
  name: string;
  descriptor: string;
  image: string;
  alt: string;
  customisable: boolean;
  isSample: true;
};

export const sampleProducts: SampleProduct[] = [
  {
    id: 'SAMPLE-001',
    name: 'Desk Organiser — Sample',
    descriptor: 'Ready-design category placeholder',
    image: '/images/products/sample-organiser.svg',
    alt: 'Development placeholder illustration of a geometric desk organiser',
    customisable: false,
    isSample: true,
  },
  {
    id: 'SAMPLE-002',
    name: 'Nameplate — Sample',
    descriptor: 'Personalised-product placeholder',
    image: '/images/products/sample-nameplate.svg',
    alt: 'Development placeholder illustration of a personalised nameplate',
    customisable: true,
    isSample: true,
  },
  {
    id: 'SAMPLE-003',
    name: 'Cable Guide — Sample',
    descriptor: 'Functional-product placeholder',
    image: '/images/products/sample-guide.svg',
    alt: 'Development placeholder illustration of a functional cable guide',
    customisable: false,
    isSample: true,
  },
  {
    id: 'SAMPLE-004',
    name: 'Decor Object — Sample',
    descriptor: 'Decorative-product placeholder',
    image: '/images/products/sample-decor.svg',
    alt: 'Development placeholder illustration of a small decorative object',
    customisable: true,
    isSample: true,
  },
  {
    id: 'SAMPLE-005',
    name: 'Utility Bracket — Sample',
    descriptor: 'Reviewed-request placeholder',
    image: '/images/products/sample-bracket.svg',
    alt: 'Development placeholder illustration of a utility bracket',
    customisable: false,
    isSample: true,
  },
  {
    id: 'SAMPLE-006',
    name: 'Key Tag — Sample',
    descriptor: 'Custom-text product placeholder',
    image: '/images/products/sample-keytag.svg',
    alt: 'Development placeholder illustration of a custom key tag',
    customisable: true,
    isSample: true,
  },
];
