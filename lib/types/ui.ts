export type ActionMenuItem<TData> = {
  label: string;
  action: (item: TData) => void;
  isDestructive?: boolean;
  separatorAfter?: boolean;
};
