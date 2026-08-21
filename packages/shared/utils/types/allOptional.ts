/** Shallow partial: every key of T becomes optional (writes / patches). */
export type AllOptional<T> = {
    [K in keyof T]?: T[K];
};
