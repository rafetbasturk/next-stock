import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { toast } from "sonner";
import { createSelectors } from "./utils";

export type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  successMessage?: string;
  onConfirm?: () => Promise<void> | void;
};

type ConfirmState = {
  isOpen: boolean;
  isLoading: boolean;
  options: ConfirmOptions;
  resolver?: (result: boolean) => void;
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
  closeConfirm: (result: boolean) => void;
};

const confirmDialogStoreBase = createWithEqualityFn<ConfirmState>()(
  (set, get) => ({
    isOpen: false,
    isLoading: false,
    options: {},
    resolver: undefined,
    openConfirm: (options) => {
      return new Promise<boolean>((resolve) => {
        set({ isOpen: true, options, resolver: resolve });
      });
    },

    closeConfirm: (result) => {
      const { resolver, options } = get();
      if (resolver) resolver(result);
      set({
        isOpen: false,
        options: {},
        resolver: undefined,
        isLoading: false,
      });

      // Success toast if provided
      if (result && options.successMessage) {
        toast.success(options.successMessage);
      }
    },
  }),
  shallow
);

export const useConfirmDialogStore = createSelectors(confirmDialogStoreBase);
