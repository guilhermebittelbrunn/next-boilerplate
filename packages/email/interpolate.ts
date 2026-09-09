export type InterpolationVars = Record<string, string | number>;

/** Replaces `{key}` placeholders, leaving unknown ones untouched so a missing value never blanks a sentence. */
export const interpolate = (
    template: string,
    vars: InterpolationVars
): string =>
    template.replace(/\{(\w+)\}/g, (match, key: string) => {
        const value = vars[key];
        return value === undefined ? match : String(value);
    });
