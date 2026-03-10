export type ModalState<T> =
  | { type: 'closed' }
  | { type: 'adding' }
  | { type: 'editing'; item: T }
  | { type: 'deleting'; item: T }
  | { type: 'adjusting'; item: T }
