/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <explanation> */
/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
/** biome-ignore-all lint/complexity/useIndexOf: <explanation> */
"use client";

import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { SearchIcon } from "lucide-react";
import {
    type KeyboardEvent,
    type ReactElement,
    type ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Input } from "../input";
import { Label } from "../label";
import {
    Select as SelectPrimitive,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./components/select";

export type SelectOption = {
    value: string;
    label: string;
    icon?: ReactNode;
};

export type SelectProps = {
    options: SelectOption[];
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    id?: string;
    triggerClassName?: string;
    size?: "sm" | "default";
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyMessage?: string;
    "aria-label"?: string;
    /** Use horizontal label + trigger (e.g. nav toolbars). Default stacks label above. */
    orientation?: "vertical" | "horizontal";
};

function resolveSelectValue(
    value: string | undefined,
    options: SelectOption[]
): string | undefined {
    if (!value) {
        return;
    }
    return options.some((o) => o.value === value) ? value : undefined;
}

export function Select({
    options,
    value,
    onValueChange,
    placeholder,
    label,
    required = false,
    disabled = false,
    id,
    triggerClassName,
    size = "default",
    searchable = true,
    searchPlaceholder,
    emptyMessage,
    "aria-label": ariaLabel,
    orientation = "vertical",
}: SelectProps): ReactElement {
    const { dictionary } = getDictionary();
    const resolvedValue = resolveSelectValue(value, options);
    const isHorizontal = orientation === "horizontal";
    const searchInputReference = useRef<HTMLInputElement | null>(null);
    const contentReference = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const resolvedSearchPlaceholder =
        searchPlaceholder ?? dictionary.components.select.searchPlaceholder;
    const resolvedEmptyMessage =
        emptyMessage ?? dictionary.components.select.emptyMessage;

    const filteredOptions = useMemo(() => {
        if (!searchable || searchValue.trim() === "") {
            return options;
        }
        const normalizedTerm = searchValue.trim().toLowerCase();
        return options.filter((option) =>
            option.label.toLowerCase().includes(normalizedTerm)
        );
    }, [options, searchable, searchValue]);

    const selectedOption = useMemo(() => {
        if (!resolvedValue) {
            return;
        }
        return options.find((o) => o.value === resolvedValue);
    }, [options, resolvedValue]);

    const shouldRenderHiddenSelectedItem =
        searchable &&
        Boolean(searchValue.trim()) &&
        Boolean(selectedOption) &&
        !filteredOptions.some((o) => o.value === selectedOption?.value);

    const focusOption = (index: number) => {
        const optionElements =
            contentReference.current?.querySelectorAll<HTMLElement>(
                '[data-slot="select-item"]'
            );
        if (!optionElements || optionElements.length === 0) {
            return;
        }

        const boundedIndex = Math.max(
            0,
            Math.min(index, optionElements.length - 1)
        );
        optionElements[boundedIndex]?.focus();
    };

    const getFocusedOptionIndex = () => {
        const optionElements =
            contentReference.current?.querySelectorAll<HTMLElement>(
                '[data-slot="select-item"]'
            );
        if (!optionElements || optionElements.length === 0) {
            return -1;
        }

        return Array.from(optionElements).findIndex(
            (element) => element === document.activeElement
        );
    };

    const handleSearchInputKeyDown = (
        event: KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === "Enter" && filteredOptions.length === 1) {
            event.preventDefault();
            onValueChange?.(filteredOptions[0].value);
            setOpen(false);
            setSearchValue("");
            return;
        }

        if (event.key === "ArrowDown" || event.key === "Tab") {
            event.preventDefault();
            focusOption(0);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            focusOption(filteredOptions.length - 1);
            return;
        }

        event.stopPropagation();
    };

    const handleOptionKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const focusedIndex = getFocusedOptionIndex();
        if (focusedIndex < 0) {
            return;
        }

        if (event.key === "Tab") {
            event.preventDefault();
            if (event.shiftKey) {
                if (focusedIndex === 0) {
                    searchInputReference.current?.focus();
                    return;
                }
                focusOption(focusedIndex - 1);
                return;
            }

            if (focusedIndex === filteredOptions.length - 1) {
                searchInputReference.current?.focus();
                return;
            }
            focusOption(focusedIndex + 1);
            return;
        }

        if (event.key === "ArrowUp" && focusedIndex === 0) {
            event.preventDefault();
            searchInputReference.current?.focus();
        }
    };

    useEffect(() => {
        if (!(open && searchable)) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            searchInputReference.current?.focus();
            searchInputReference.current?.select();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [open, searchable]);

    useEffect(() => {
        if (!(open && searchable)) {
            return;
        }

        if (filteredOptions.length > 0) {
            return;
        }

        const ensureFocusOnInput = () => {
            const searchInput = searchInputReference.current;
            if (!searchInput) {
                return;
            }
            if (document.activeElement !== searchInput) {
                searchInput.focus();
            }
        };

        // When there are no options, Radix may move focus away from the input.
        // Capture any focus change and keep it on the search input.
        const onFocusInCapture = (event: FocusEvent) => {
            const searchInput = searchInputReference.current;
            const content = contentReference.current;
            const target = event.target as Node | null;
            if (!(searchInput && content && target)) {
                return;
            }

            // If focus stays within the dropdown, allow it (e.g., scroll buttons).
            if (content.contains(target)) {
                return;
            }

            ensureFocusOnInput();
        };

        ensureFocusOnInput();
        document.addEventListener("focusin", onFocusInCapture, true);
        return () => {
            document.removeEventListener("focusin", onFocusInCapture, true);
        };
    }, [filteredOptions.length, open, searchable]);

    const trigger = (
        <SelectPrimitive
            disabled={disabled}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) {
                    setSearchValue("");
                }
            }}
            onValueChange={onValueChange}
            open={open}
            value={resolvedValue}
        >
            <SelectTrigger
                aria-label={ariaLabel ?? (label ? undefined : placeholder)}
                className={cn(
                    isHorizontal ? "min-w-0" : "w-full",
                    triggerClassName
                )}
                id={id}
                size={size}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent
                align="start"
                className={cn(
                    "p-0",
                    searchable
                        ? "w-[max(var(--radix-select-trigger-width),16rem)] min-w-[16rem]"
                        : "w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
                )}
                position="popper"
                ref={contentReference}
            >
                {searchable ? (
                    <div className="sticky top-0 z-10 border-b bg-popover">
                        <div className="relative">
                            <SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
                            <Input
                                className="h-10 rounded-none border-0 bg-transparent pr-3 pl-9 shadow-none focus-visible:border-0 focus-visible:ring-0"
                                onBlur={() => {
                                    if (!(open && searchable)) {
                                        return;
                                    }
                                    if (filteredOptions.length > 0) {
                                        return;
                                    }
                                    window.setTimeout(() => {
                                        searchInputReference.current?.focus();
                                    }, 0);
                                }}
                                onChange={(event) =>
                                    setSearchValue(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    handleSearchInputKeyDown(event);
                                }}
                                placeholder={resolvedSearchPlaceholder}
                                ref={searchInputReference}
                                value={searchValue}
                            />
                        </div>
                    </div>
                ) : null}
                {shouldRenderHiddenSelectedItem ? (
                    <SelectItem
                        className="hidden"
                        onKeyDown={handleOptionKeyDown}
                        value={selectedOption!.value}
                    >
                        <span className="inline-flex items-center gap-2">
                            {selectedOption!.icon ? (
                                <span className="inline-flex size-4 items-center justify-center">
                                    {selectedOption!.icon}
                                </span>
                            ) : null}
                            <span>{selectedOption!.label}</span>
                        </span>
                    </SelectItem>
                ) : null}
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                        <SelectItem
                            // Truncation needs `min-w-0` on every flex ancestor,
                            // including the item text wrapper Radix renders.
                            className="min-w-0 [&>span:last-child]:min-w-0"
                            key={option.value}
                            onKeyDown={handleOptionKeyDown}
                            value={option.value}
                        >
                            {/* A long label truncates instead of widening the list; the
                                native title reveals it on hover. */}
                            <span className="inline-flex min-w-0 items-center gap-2">
                                {option.icon ? (
                                    <span className="inline-flex size-4 shrink-0 items-center justify-center">
                                        {option.icon}
                                    </span>
                                ) : null}
                                <span className="truncate" title={option.label}>
                                    {option.label}
                                </span>
                            </span>
                        </SelectItem>
                    ))
                ) : (
                    <div className="px-2 py-2 text-muted-foreground text-sm">
                        {resolvedEmptyMessage}
                    </div>
                )}
            </SelectContent>
        </SelectPrimitive>
    );

    if (!label) {
        return trigger;
    }

    return (
        <div
            className={cn(
                isHorizontal
                    ? "flex flex-wrap items-center gap-2"
                    : "flex flex-col gap-1.5"
            )}
        >
            {isHorizontal ? (
                <span className="shrink-0 text-muted-foreground text-xs">
                    {label}
                    {required ? (
                        <span aria-hidden="true" className="text-destructive">
                            {" *"}
                        </span>
                    ) : null}
                </span>
            ) : (
                <Label className="text-foreground" htmlFor={id}>
                    {label}
                    {required ? (
                        <span aria-hidden="true" className="text-destructive">
                            {" *"}
                        </span>
                    ) : null}
                </Label>
            )}
            {trigger}
        </div>
    );
}
