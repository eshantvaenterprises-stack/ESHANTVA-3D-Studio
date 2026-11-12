import type { LucideIcon } from 'lucide-react';
import {
  Box,
  Boxes,
  Briefcase,
  FileBox,
  FileText,
  FlaskConical,
  GraduationCap,
  FileImage,
  Layers3,
  MapPin,
  PackageSearch,
  PencilRuler,
  RefreshCw,
  Ruler,
  ScanLine,
  Shapes,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { retailVisibility } from '@/config/retailVisibility';

export type AboutStartingPoint = {
  label: string;
  icon: LucideIcon;
};

export type AboutAudience = {
  id: 'students' | 'makers' | 'researchers' | 'businesses';
  eyebrow: string;
  title: string;
  description: string;
  examples: string[];
  icon: LucideIcon;
};

export type PrototypeValue = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const aboutStartingPoints: AboutStartingPoint[] = [
  { label: 'Product need', icon: PackageSearch },
  { label: 'File', icon: FileBox },
  { label: 'Sketch', icon: PencilRuler },
  { label: 'Drawing', icon: FileText },
  { label: 'Dimensions', icon: Ruler },
  { label: 'Reference', icon: FileImage },
  { label: 'Existing part', icon: Wrench },
  { label: 'Idea', icon: Shapes },
  { label: 'Quantity requirement', icon: Boxes },
];

export const aboutAudiences: AboutAudience[] = [
  {
    id: 'students',
    eyebrow: 'STUDENTS & YOUNG INNOVATORS',
    title: 'A place to begin building.',
    description: 'School, college and technical projects do not always begin with finished CAD. A sketch, reference, dimensions or simple concept can be enough to start discussing the next physical step.',
    examples: ['Science and technical models', 'Electronics enclosures', 'Demonstration parts', 'Mechanism concepts', 'Prototype shells', 'Project components'],
    icon: GraduationCap,
  },
  {
    id: 'makers',
    eyebrow: 'INDEPENDENT INNOVATORS & MAKERS',
    title: 'Move a practical idea off the screen and onto the table.',
    description: 'An independent build may begin with a mechanism, electronics project, design concept or practical problem even when a complete workshop or production setup is not available.',
    examples: ['Experimental builds', 'Electronics projects', 'Practical problem-solving parts', 'Early design concepts'],
    icon: Wrench,
  },
  {
    id: 'researchers',
    eyebrow: 'RESEARCHERS & PROTOTYPE BUILDERS',
    title: 'Use physical versions to examine the next question.',
    description: 'Selected concept models, prototype housings, physical mock-ups, test parts and demonstration models can help make geometry and layout easier to examine during iteration.',
    examples: ['Concept models', 'Prototype housings', 'Physical mock-ups', 'Selected test parts', 'Demonstration models', 'Iterative versions'],
    icon: FlaskConical,
  },
  {
    id: 'businesses',
    eyebrow: 'SMALL BUSINESSES & PRODUCT BUILDERS',
    title: 'Building a product can start with one useful physical version.',
    description: 'A business may need one enclosure, housing, mount, prototype shell, presentation model or selected custom component before deciding what the next production step should be.',
    examples: ['Enclosure or housing', 'Cover or mount', 'Prototype shell', 'Presentation model', 'Selected custom component', 'Early small batch'],
    icon: Briefcase,
  },
];

export const prototypeValues: PrototypeValue[] = [
  { title: 'Shape', description: 'Examine how the object looks and feels in physical form.', icon: Shapes },
  { title: 'Fit', description: 'Check whether selected components or dimensions appear to fit as intended.', icon: ScanLine },
  { title: 'Layout', description: 'Review how selected elements are placed and arranged physically.', icon: Layers3 },
  { title: 'Enclosure', description: 'Explore how electronics or components may be housed in a selected form.', icon: Box },
  { title: 'Presentation', description: 'Turn an abstract idea into something that can be demonstrated physically.', icon: FileImage },
  { title: 'Iteration', description: 'Use one version to identify geometry or practical changes for the next.', icon: RefreshCw },
];

export const ecosystemNeeds = [
  'Electronics',
  'Software',
  'Specialist design',
  'Testing',
  'Certification',
  'Other manufacturing methods',
  'Other professional expertise',
] as const;

export const clearExpectations = [
  'Not every custom request is automatically accepted.',
  'Not every material is suitable for every product or use.',
  'Some requirements need additional review or information.',
  'Selected functional or complex requests may need clearer dimensions, files or intended-use details.',
  'Production begins only after the applicable acceptance, approval and payment conditions are completed.',
] as const;

export const innovationSteps = [
  { step: '01', label: 'Think', description: 'Start with the problem, idea or requirement you want to explore.' },
  { step: '02', label: 'Build', description: 'Create an appropriate first physical version when the requirement is accepted.' },
  { step: '03', label: 'Check', description: 'Examine form, fit, layout or presentation against the intended purpose.' },
  { step: '04', label: 'Improve', description: 'Use what the physical version reveals to guide the next change.' },
] as const;

const allAboutRouteCards = [
  { label: 'Shop', title: 'I want an existing product.', copy: 'Browse products that already have a defined customer route.', href: '/shop', icon: Box },
  { label: 'Custom', title: 'I have a file, drawing, reference, idea or specific requirement.', copy: 'Submit what you have so the requirement can be reviewed.', href: '/custom-order', icon: PencilRuler },
  { label: 'Bulk', title: 'I need a larger quantity.', copy: 'Start a larger-quantity enquiry for catalog, personalised or custom requirements.', href: '/bulk-order', icon: Boxes },
] as const;
export const aboutRouteCards = allAboutRouteCards.filter((card) => retailVisibility.isInternal || card.href !== '/shop');

export const aboutTrustPoints = [
  { label: 'Verified identity', copy: 'Public business information comes from the site-wide business identity configuration.', icon: ShieldCheck },
  { label: 'Local base', copy: 'Based in Biswanath, Assam, with online routes for selected requirements.', icon: MapPin },
] as const;
