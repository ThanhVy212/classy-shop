export type DiscountType = "percentage" | "fixed";

export interface DiscountCode {
  _id: string;
  code: string;
  description?: string;
  type: DiscountType;
  value: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  isActive: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountValidation {
  _id?: string;
  code: string;
  description?: string;
  type: DiscountType;
  value: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  discountAmount: number;
}

export interface CreateDiscountPayload {
  code: string;
  description?: string;
  type: DiscountType;
  value: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  isActive?: boolean;
}
