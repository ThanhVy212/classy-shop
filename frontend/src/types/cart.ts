export interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
}

export interface Cart {
  _id?: string;
  user?: string;
  guestId?: string;
  products: CartItem[];
  totalPrice: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddCartItemPayload {
  productId: string;
  quantity: number;
  size: string;
  color: string;
  guestId?: string;
}

export interface UpdateCartItemPayload {
  productId: string;
  quantity: number;
  size: string;
  color: string;
  guestId?: string;
}

export interface DeleteCartItemPayload {
  productId: string;
  size: string;
  color: string;
  guestId?: string;
}

export interface MergeCartPayload {
  guestId: string;
}
