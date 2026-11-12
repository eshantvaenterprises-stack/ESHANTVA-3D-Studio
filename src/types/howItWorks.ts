export type CustomerPathId = 'shop' | 'custom' | 'bulk';

export type JourneyStep = {
  step: string;
  title: string;
  description: string;
};

export type CustomerPath = {
  id: CustomerPathId;
  index: string;
  eyebrow: string;
  title: string;
  shortTitle: string;
  summary: string;
  href: string;
  anchor: string;
  icon: 'shoppingBag' | 'pencilRuler' | 'boxes';
  steps: JourneyStep[];
};

export type RouteDecision = {
  situation: string;
  route: string;
  href: string;
};

