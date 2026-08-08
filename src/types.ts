export interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  specifications: Record<string, string>;
  images: string[];
  category_id: string;
  category_slug?: string;
  source_price?: number;
  selling_price: number;
  compare_at_price: number | null;
  stock_count: number;
  in_stock: boolean;
  is_featured: boolean;
  rating: number;
  rating_count: number;
  tags: string[];
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image: string;
  quantity: number;
  selling_price: number;
  selected_variant?: string;
}

export type OrderStatus = 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'upi' | 'razorpay' | 'card' | 'cod';
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface TrackingEvent {
  status: OrderStatus;
  description: string;
  occurred_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  promo_code?: string;
  shipping_fee: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  tracking_number?: string;
  courier_name?: string;
  tracking_events: TrackingEvent[];
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  pendingOrdersCount: number;
  todaySales: number;
  categorySales: { name: string; value: number }[];
  revenueTrend: { date: string; amount: number; count: number }[];
  paymentDistribution: { name: string; value: number }[];
}

export interface FilterOptions {
  category: string;
  search: string;
  tag: string;
  minPrice: number;
  maxPrice: number;
  sort: 'newest' | 'price_asc' | 'price_desc' | 'rating';
}
