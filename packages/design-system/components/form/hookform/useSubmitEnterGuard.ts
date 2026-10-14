import { type KeyboardEvent, useLayoutEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";

export function useSubmitEnterGuard() {
    const { formState } = useFormContext();
    const { isSubmitting, submitCount } = formState;
    const settlingRef = useRef(false);
    const seenSubmitCountRef = useRef(submitCount);

    // A mutation that lives in a provider above the form reaches its submit button one task
    // after the submit settles (React Query delivers state with setTimeout 0). Until then the
    // still-focused field would submit again on Enter, so it waits for a timer queued after it.
    useLayoutEffect(() => {
        if (submitCount === seenSubmitCountRef.current) {
            return;
        }
        seenSubmitCountRef.current = submitCount;
        settlingRef.current = true;
        const timer = setTimeout(() => {
            settlingRef.current = false;
        }, 0);
        return () => clearTimeout(timer);
    }, [submitCount]);

    return (event: KeyboardEvent<HTMLInputElement>) => {
        if (
            event.key === "Enter" &&
            !event.nativeEvent.isComposing &&
            (isSubmitting || settlingRef.current)
        ) {
            event.preventDefault();
        }
    };
}
