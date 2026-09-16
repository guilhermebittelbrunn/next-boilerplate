import { reportRequestError } from "@repo/shared/utils/helpers/requestErrorReporter";
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError =
    reportRequestError;
