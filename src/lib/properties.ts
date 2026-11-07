import { formatPrice } from "@/lib/format";

export type ListingType = "SALE" | "RENT";

export type PropertyAgent = { profileId?: string | null; name: string; phone: string | null; verified: boolean; agency?: string | null; image?: string | null };

export type Property = {
  slug: string;
  title: string;
  location: string;
  city: string;
  price: number;
  currency: string;
  priceLabel: string;
  listingType: ListingType;
  status: "For sale" | "For rent";
  beds: number;
  baths: number;
  area: number;
  unit: string;
  kind: string;
  image: string;
  featured?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  reference?: string;
  description?: string;
  parking?: number;
  features?: string[];
  images?: { url: string; alt: string }[];
  agent?: PropertyAgent | null;
  publishedAt?: string | null;
  isDemo?: boolean;
};

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;

type DemoSeed = Omit<Property, "priceLabel" | "status" | "image" | "location" | "isDemo"> & { locality: string; gallery: string[] };

const DEMO_NOTE = "This is an illustrative demonstration listing, not a real property.";

const seeds: DemoSeed[] = [
  {
    slug: "willow-house", reference: "EH-DEMO-0001", title: "The Willow House", locality: "DHA Phase 6", city: "Lahore",
    price: 84_500_000, currency: "PKR", listingType: "SALE", beds: 5, baths: 6, area: 4200, unit: "sq ft", kind: "House", parking: 2, featured: true,
    description: `A calm, contemporary family house arranged around a sheltered pool terrace. Double-height living spaces open onto the garden, while the upper floor holds four generous bedrooms with private baths.\n\n${DEMO_NOTE}`,
    features: ["Private pool", "Landscaped garden", "Double-height living room", "Covered parking", "Servant quarters", "Solar-ready roof"],
    gallery: ["photo-1600596542815-ffad4c1539a9", "photo-1600607687939-ce8a6c25118c", "photo-1616594039964-ae9021a400a0", "photo-1600566752355-35792bedcfea", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "garden-residence", reference: "EH-DEMO-0002", title: "Garden Residence", locality: "E-7", city: "Islamabad",
    price: 125_000_000, currency: "PKR", listingType: "SALE", beds: 4, baths: 5, area: 3600, unit: "sq ft", kind: "House", parking: 2, featured: true,
    description: `Set beneath a mature tree on a quiet lane, this timber-clad residence pairs warm materials with wide glazing toward a level lawn. The kitchen and family room form one bright space at the heart of the home.\n\n${DEMO_NOTE}`,
    features: ["Mature garden", "Open-plan kitchen", "Floor-to-ceiling glazing", "Study", "Guest suite", "Backup power"],
    gallery: ["photo-1600607688969-a5bfcd646154", "photo-1600210492493-0946911123ea", "photo-1600607687644-c7171b42498f", "photo-1502005229762-cf1b2da7c5d6", "photo-1600566753086-00f18fb6b3ea"],
  },
  {
    slug: "corner-apartment", reference: "EH-DEMO-0003", title: "The Corner Apartment", locality: "Clifton Block 4", city: "Karachi",
    price: 285_000, currency: "PKR", listingType: "RENT", beds: 3, baths: 3, area: 1850, unit: "sq ft", kind: "Apartment", parking: 1,
    description: `A light-filled corner apartment with a relaxed living room, separate dining area and three well-proportioned bedrooms. The building offers secure parking and a staffed lobby.\n\n${DEMO_NOTE}`,
    features: ["Corner unit", "Staffed lobby", "Lift access", "Reserved parking", "Fitted kitchen"],
    gallery: ["photo-1600210492486-724fe5c67fb0", "photo-1618221195710-dd6b41faaea6", "photo-1616594039964-ae9021a400a0", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "olive-courtyard", reference: "EH-DEMO-0004", title: "Olive Courtyard", locality: "Bahria Town", city: "Lahore",
    price: 64_500_000, currency: "PKR", listingType: "SALE", beds: 4, baths: 4, area: 3100, unit: "sq ft", kind: "House", parking: 2, featured: true,
    description: `A crisp, modern home with a timber entrance volume and a private inner courtyard. Living areas are oriented for afternoon light and cross-ventilation.\n\n${DEMO_NOTE}`,
    features: ["Inner courtyard", "Timber detailing", "Rooftop terrace", "Family lounge", "Covered parking"],
    gallery: ["photo-1600566753190-17f0baa2a6c3", "photo-1600566753086-00f18fb6b3ea", "photo-1600607687644-c7171b42498f", "photo-1600566752355-35792bedcfea"],
  },
  {
    slug: "skyline-penthouse", reference: "EH-DEMO-0005", title: "Skyline Penthouse", locality: "F-11", city: "Islamabad",
    price: 490_000, currency: "PKR", listingType: "RENT", beds: 3, baths: 3, area: 2200, unit: "sq ft", kind: "Apartment", parking: 2,
    description: `A top-floor apartment with a glazed living room that opens to a terrace pool. Clean finishes, generous storage and views toward the Margalla Hills.\n\n${DEMO_NOTE}`,
    features: ["Terrace pool", "Hill views", "Private lift lobby", "Two parking bays", "Central air conditioning"],
    gallery: ["photo-1600573472550-8090b5e0745e", "photo-1600607687920-4e2a09cf159d", "photo-1616594039964-ae9021a400a0", "photo-1618221195710-dd6b41faaea6"],
  },
  {
    slug: "stone-pine-villa", reference: "EH-DEMO-0006", title: "Stone & Pine Villa", locality: "DHA Phase 8", city: "Karachi",
    price: 198_000_000, currency: "PKR", listingType: "SALE", beds: 6, baths: 7, area: 5600, unit: "sq ft", kind: "Villa", parking: 3, featured: true,
    description: `A substantial villa with layered terraces, a long infinity pool and formal and informal living rooms. The upper levels hold six bedrooms, each with its own bath.\n\n${DEMO_NOTE}`,
    features: ["Infinity pool", "Formal drawing room", "Home office", "Three-car garage", "Staff quarters", "Rooftop lounge"],
    gallery: ["photo-1580587771525-78b9dba3b914", "photo-1600607687939-ce8a6c25118c", "photo-1600210492493-0946911123ea", "photo-1600607687644-c7171b42498f", "photo-1600566752355-35792bedcfea"],
  },
  {
    slug: "gulberg-townhouse", reference: "EH-DEMO-0007", title: "Gulberg Townhouse", locality: "Gulberg III", city: "Lahore",
    price: 42_000_000, currency: "PKR", listingType: "SALE", beds: 3, baths: 3, area: 2100, unit: "sq ft", kind: "Townhouse", parking: 1, featured: true,
    description: `A compact contemporary townhouse with a timber-clad facade, a small private lawn and an efficient three-bedroom plan close to schools and shops.\n\n${DEMO_NOTE}`,
    features: ["Private lawn", "Modern kitchen", "Rooftop access", "Walk to amenities"],
    gallery: ["photo-1600047509807-ba8f99d2cdde", "photo-1600210492486-724fe5c67fb0", "photo-1600607687644-c7171b42498f"],
  },
  {
    slug: "hillside-family-home", reference: "EH-DEMO-0008", title: "Hillside Family Home", locality: "DHA Phase 2", city: "Islamabad",
    price: 350_000, currency: "PKR", listingType: "RENT", beds: 4, baths: 4, area: 3000, unit: "sq ft", kind: "House", parking: 2,
    description: `A bright white family home with a pool terrace, open living spaces and a separate guest bedroom on the ground floor.\n\n${DEMO_NOTE}`,
    features: ["Pool terrace", "Guest bedroom", "Garden", "Two parking bays"],
    gallery: ["photo-1613490493576-7fde63acd811", "photo-1618221195710-dd6b41faaea6", "photo-1616594039964-ae9021a400a0"],
  },
];

/** Demonstration listings used only in development when PostgreSQL is unavailable. */
export const properties: Property[] = seeds.map(({ locality, gallery, ...p }, index) => ({
  ...p,
  location: `${locality}, ${p.city}`,
  priceLabel: formatPrice(p.price, p.currency, p.listingType),
  status: p.listingType === "RENT" ? "For rent" : "For sale",
  image: photo(gallery[0]),
  images: gallery.map((id, i) => ({ url: photo(id), alt: `${p.title}, demonstration photo ${i + 1}` })),
  publishedAt: new Date(Date.UTC(2026, 9, 28 - index)).toISOString(),
  agent: null,
  isDemo: true,
}));

export const demoSeeds = seeds.map(({ gallery, ...p }) => ({ ...p, gallery: gallery.map(photo) }));
