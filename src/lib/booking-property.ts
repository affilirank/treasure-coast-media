/**
 * Facts the agent verified against county property appraiser records before booking.
 * Shared between the public booking form (client) and the booking store (server).
 */
export type BookingPropertyDetails = {
  street: string;
  city: string;
  zipCode: string;
  beds: string;
  baths: string;
  sqft: string;
  lotSize: string;
  yearBuilt: string;
  propertyType: string;
  source: string;
  confirmed: boolean;
};

export const emptyPropertyDetails: BookingPropertyDetails = {
  street: "",
  city: "",
  zipCode: "",
  beds: "",
  baths: "",
  sqft: "",
  lotSize: "",
  yearBuilt: "",
  propertyType: "",
  source: "",
  confirmed: false,
};
