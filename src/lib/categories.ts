import {
  Armchair,
  Baby,
  Bike,
  BookOpen,
  Car,
  Dog,
  Dumbbell,
  Gamepad2,
  Gift,
  Guitar,
  Hammer,
  Home,
  Laptop,
  type LucideIcon,
  Shirt,
  Sprout,
} from "lucide-react";

export interface Category {
  slug: string;
  name: string;
  icon: LucideIcon;
}

export const CATEGORIES: Category[] = [
  { slug: "vehicles", name: "Vehicles", icon: Car },
  { slug: "property-rentals", name: "Property Rentals", icon: Home },
  { slug: "apparel", name: "Apparel", icon: Shirt },
  { slug: "electronics", name: "Electronics", icon: Laptop },
  { slug: "entertainment", name: "Entertainment", icon: BookOpen },
  { slug: "family", name: "Family", icon: Baby },
  { slug: "free-stuff", name: "Free Stuff", icon: Gift },
  { slug: "garden-outdoor", name: "Garden & Outdoor", icon: Sprout },
  { slug: "hobbies", name: "Hobbies", icon: Bike },
  { slug: "home-goods", name: "Home Goods", icon: Armchair },
  { slug: "home-improvement", name: "Home Improvement", icon: Hammer },
  { slug: "musical-instruments", name: "Musical Instruments", icon: Guitar },
  { slug: "pet-supplies", name: "Pet Supplies", icon: Dog },
  { slug: "sporting-goods", name: "Sporting Goods", icon: Dumbbell },
  { slug: "toys-games", name: "Toys & Games", icon: Gamepad2 },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryName(slug: string): string {
  return getCategory(slug)?.name ?? slug;
}
