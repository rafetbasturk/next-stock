export type MutationResponse = {
  success: true;
};

export type MutationResponseWithId = MutationResponse & {
  id: number;
};
