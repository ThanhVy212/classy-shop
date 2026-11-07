import api from "./api";
import type { ShippingAddress } from "../types/auth";

export interface AddressPayload {
  label?: string;
  fullName: string;
  phone: string;
  address: string;
  apartment?: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

type AddressesResponse = {
  message?: string;
  addresses: ShippingAddress[];
};

const extractAddresses = (data?: AddressesResponse): ShippingAddress[] =>
  Array.isArray(data?.addresses) ? data.addresses : [];

export const addressService = {
  async getAddresses(): Promise<ShippingAddress[]> {
    const response = await api.get<AddressesResponse>("/auth/addresses");
    return extractAddresses(response.data);
  },

  async createAddress(payload: AddressPayload): Promise<ShippingAddress[]> {
    const response = await api.post<AddressesResponse>(
      "/auth/addresses",
      payload
    );
    return extractAddresses(response.data);
  },

  async updateAddress(
    addressId: string,
    payload: Partial<AddressPayload>
  ): Promise<ShippingAddress[]> {
    const response = await api.patch<AddressesResponse>(
      `/auth/addresses/${addressId}`,
      payload
    );
    return extractAddresses(response.data);
  },

  async setDefaultAddress(addressId: string): Promise<ShippingAddress[]> {
    const response = await api.patch<AddressesResponse>(
      `/auth/addresses/${addressId}/default`
    );
    return extractAddresses(response.data);
  },

  async deleteAddress(addressId: string): Promise<ShippingAddress[]> {
    const response = await api.delete<AddressesResponse>(
      `/auth/addresses/${addressId}`
    );
    return extractAddresses(response.data);
  },
};

export default addressService;
