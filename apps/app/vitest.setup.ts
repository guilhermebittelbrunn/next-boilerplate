import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// With `globals` off, Testing Library finds no global `afterEach` to register its own
// cleanup, so without this every test file would have to remember to unmount.
afterEach(cleanup);
