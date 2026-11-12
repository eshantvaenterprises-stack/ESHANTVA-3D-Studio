import {
  Box, Boxes, FileBox, FileImage, Lightbulb, PackageCheck, PencilRuler,
  Ruler, Shapes, Sparkles, Wrench,
} from 'lucide-react';
import type { ServiceIconName } from '@/types/service';

const icons = {
  box: Box,
  sparkles: Sparkles,
  pencil: PencilRuler,
  prototype: Shapes,
  wrench: Wrench,
  batch: Boxes,
  file: FileBox,
  ruler: Ruler,
  image: FileImage,
  idea: Lightbulb,
  product: PackageCheck,
} satisfies Record<ServiceIconName, typeof Box>;

export function ServiceIcon({ name, size = 22 }: { name: ServiceIconName; size?: number }) {
  const Icon = icons[name];
  return <Icon size={size} strokeWidth={1.65} aria-hidden="true" />;
}
