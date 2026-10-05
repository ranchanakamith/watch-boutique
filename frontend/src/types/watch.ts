// 1. The interface for an individual watch
// 1. The interface for an individual watch
export interface Watch {
  id: number;
  title: string;
  description: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  brand: string;
  category: string;
  thumbnail: string;
  images: string[];
}

// Paginated product API response.
export interface WatchResponse {
  products: Watch[];
  total: number;
  skip: number;
  limit: number;
}
