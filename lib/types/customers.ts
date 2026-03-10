export type CustomerTableRow = {
  id: number;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type CustomerMutationResponse = {
  id: number;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  updatedAt: string;
};
