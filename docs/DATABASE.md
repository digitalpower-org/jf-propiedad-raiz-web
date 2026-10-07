# Database Schema & Value Objects - Cloud Firestore

## 1. Colección: `properties`
```typescript
type PropertyStatus = 'ACTIVE' | 'HIDDEN' | 'DELETED';
type OfferType = 'SALE' | 'RENT';
type PropertyType = 
  | 'HOUSE' 
  | 'URBAN_LOT' 
  | 'RURAL_LOT' 
  | 'FARM' 
  | 'COMMERCIAL_SPACE' 
  | 'OFF_PLAN_PROJECT' 
  | 'RIGHTS_TRANSFER';

type NearbyCategory = 
  | 'transport' | 'education' | 'health' | 'shopping'
  | 'nature' | 'entertainment' | 'sports' | 'services';

type NearbyPoint = {
  category: NearbyCategory;
  title: string;
  description?: string;
  distance?: string;
};

interface PropertyDocument {
  id: string;
  code: string;
  title: string;
  slug: string;
  offerType: OfferType;
  propertyType: PropertyType;
  price: number;
  administrationFee?: number;
  propertyTax?: number;
  stratum: number;
  constructionAgeYears?: number;
  builtAreaM2: number;
  landAreaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  municipality: string;
  neighborhood: string;
  addressApprox?: string;
  description: string;
  finishesDescription?: string;
  constructionType?: string;
  nearbyPoints: NearbyPoint[];
  images: string[]; // Cloudflare R2 URLs
  videoUrl?: string;
  tour360Url?: string;
  status: PropertyStatus;
  createdAt: string;
  updatedAt: string;
}