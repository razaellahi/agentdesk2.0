import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Show an error toast once per failure, and again if a later refresh fails. */
export function useQueryError(isError: boolean, message: string) {
  const shown = useRef(false);
  useEffect(() => {
    if (!isError) {
      shown.current = false;
      return;
    }
    if (shown.current) return;
    shown.current = true;
    toast.error(message);
  }, [isError, message]);
}
