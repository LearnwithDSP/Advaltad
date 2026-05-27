export interface MenuItem {
  label: string;
  href: string;
  description?: string;
  iconName?: string;
}

export interface MegaCategory {
  title: string;
  items: MenuItem[];
}

export interface NavigationMenu {
  [key: string]: {
    label: string;
    hasMega: boolean;
    columns?: MegaCategory[];
    href: string;
  };
}

export interface ProgramCard {
  id: string;
  title: string;
  description: string;
  category: string;
  impactMetric: string;
  iconName: string;
  image: string;
}

export interface ImpactStory {
  id: string;
  title: string;
  excerpt: string;
  fullStory: string;
  location: string;
  tag: string;
  author: string;
  date: string;
  image: string;
}

export interface DonationTier {
  amount: number;
  label: string;
  description: string;
  impactStatement: string;
}
