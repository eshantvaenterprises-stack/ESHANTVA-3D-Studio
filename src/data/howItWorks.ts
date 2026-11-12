import type { CustomerPath, RouteDecision } from '@/types/howItWorks';
import { retailVisibility } from '@/config/retailVisibility';

const allCustomerPaths: CustomerPath[] = [
  {
    id: 'shop',
    index: 'A',
    eyebrow: 'PATH A',
    title: 'Buying a Shop Product',
    shortTitle: 'Buying a Product',
    summary: 'Start with an existing product, choose the available options, review the order and continue through the applicable checkout or confirmation path.',
    href: '/shop',
    anchor: '#shop-path',
    icon: 'shoppingBag',
    steps: [
      { step: '01', title: 'Choose Product', description: 'Browse the Shop and open the product that fits your requirement.' },
      { step: '02', title: 'Select Options', description: 'Choose available size, colour, material or personalisation options where the product supports them.' },
      { step: '03', title: 'Add to Cart', description: 'Add the configured product and review the selected options and quantity before proceeding.' },
      { step: '04', title: 'Checkout & Payment', description: 'Where direct online checkout is enabled, follow the applicable checkout and payment path. Otherwise the order uses the applicable confirmation and payment route. Personalised or higher-value requirements may need review first.' },
      { step: '05', title: 'Preparation / Production', description: 'The accepted order moves forward according to the product type, configuration and applicable order conditions.' },
      { step: '06', title: 'Delivery / Pickup', description: 'Use Pan-India shipping, local pickup or another available delivery arrangement.' },
    ],
  },
  {
    id: 'custom',
    index: 'B',
    eyebrow: 'PATH B',
    title: 'Starting With a Custom Requirement',
    shortTitle: 'Creating Something Custom',
    summary: 'Start with a file, drawing, dimensions, image, reference or idea. The request is reviewed before pricing, acceptance or production is confirmed.',
    href: '/custom-order',
    anchor: '#custom-path',
    icon: 'pencilRuler',
    steps: [
      { step: '01', title: 'Submit What You Have', description: 'Share a file, drawing, dimensions, image, reference or a clear description of the result you need.' },
      { step: '02', title: 'Requirement Review', description: 'ESHANTVA checks whether the supplied information is sufficient for the next decision.' },
      { step: '03', title: 'Clarification if Needed', description: 'More dimensions, references, use details or other information may be requested.' },
      { step: '04', title: 'Feasibility & Quotation', description: 'Where the request can proceed, feasibility, pricing and applicable requirements are confirmed.' },
      { step: '05', title: 'Customer Approval', description: 'You review and accept the quotation, specification and relevant order terms.' },
      { step: '06', title: 'Payment', description: 'Payment follows the accepted order terms. Lower-value accepted orders require full payment; qualifying high-value terms may be agreed individually.' },
      { step: '07', title: 'Production', description: 'Production begins only after the applicable requirement, approval and payment conditions are complete.' },
      { step: '08', title: 'Delivery', description: 'The completed order follows the agreed pickup, local-delivery or shipping route.' },
    ],
  },
  {
    id: 'bulk',
    index: 'C',
    eyebrow: 'PATH C',
    title: 'Ordering a Larger Quantity',
    shortTitle: 'Ordering a Larger Quantity',
    summary: 'Bulk can begin from an existing Shop product, a personalised catalog product or a custom requirement. Quantity and commercial terms are reviewed before acceptance.',
    href: '/bulk-order',
    anchor: '#bulk-path',
    icon: 'boxes',
    steps: [
      { step: '01', title: 'Select / Describe', description: 'Choose an existing product, a personalised catalog product or describe a custom bulk requirement.' },
      { step: '02', title: 'Quantity & Customisation', description: 'Provide the requested quantity, configuration and any approved personalisation details.' },
      { step: '03', title: 'Submit Enquiry', description: 'Send the bulk enquiry with the information and references available.' },
      { step: '04', title: 'Review', description: 'Product, quantity, customisation, files and delivery requirements are assessed.' },
      { step: '05', title: 'Quotation / Terms', description: 'Pricing and applicable commercial terms are prepared according to the actual requirement.' },
      { step: '06', title: 'Customer Approval', description: 'You review and accept the quotation and applicable order terms.' },
      { step: '07', title: 'Payment', description: 'Lower-value accepted orders require full payment. Qualifying high-value orders may receive individually agreed terms.' },
      { step: '08', title: 'Production', description: 'The accepted order moves into production after the applicable approval and payment conditions are complete.' },
      { step: '09', title: 'Delivery', description: 'The order follows the agreed shipping, local-pickup or local-delivery arrangement.' },
    ],
  },
];
export const customerPaths = allCustomerPaths.filter((path) => retailVisibility.isInternal || path.id !== 'shop');

const allRouteDecisions: RouteDecision[] = [
  { situation: 'I want an existing product', route: 'Shop', href: '/shop' },
  { situation: 'I want to personalise a Shop product', route: 'Product Page', href: '/shop' },
  { situation: 'I have a 3D file, drawing, reference or idea', route: 'Custom Order', href: '/custom-order' },
  { situation: 'I need a replacement or functional request', route: 'Custom Order', href: '/custom-order' },
  { situation: 'I need a larger quantity', route: 'Bulk Order', href: '/bulk-order' },
];
export const routeDecisions = allRouteDecisions.filter((decision) => retailVisibility.isInternal || !decision.href.startsWith('/shop'));

