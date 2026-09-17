import { globalTranslations } from "@repo/internationalization/translations/global";
import { UserType } from "@repo/sdk/src/types";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listUsersMock } = vi.hoisted(() => ({ listUsersMock: vi.fn() }));

vi.mock("@/shared/hooks/useListUsers", () => ({
    useListUsers: () => listUsersMock(),
}));

/**
 * The two primitives are replaced by plain form controls: what is under test is the
 * filter's own contract — which options it offers, what it hands to the listing and what
 * "Clear" puts back — not the popover and the combobox, which have their own tests.
 */
vi.mock("@repo/design-system/components/ui/select", () => ({
    Select: ({
        value,
        onValueChange,
        options,
    }: {
        value?: string;
        onValueChange?: (next: string) => void;
        options: { value: string; label: string }[];
    }) => (
        <select
            data-testid="user-select"
            onChange={(event) => onValueChange?.(event.target.value)}
            value={value ?? ""}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
}));

vi.mock("@repo/design-system/components/ui/date-input", () => ({
    DateInput: ({
        label,
        value,
        onChange,
    }: {
        label?: string;
        value?: string;
        onChange?: (next: string) => void;
    }) => (
        <input
            aria-label={label}
            onChange={(event) => onChange?.(event.target.value)}
            value={value ?? ""}
        />
    ),
}));

const { AuditFilters } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(components)/AuditFilters"
);

const filtersCopy =
    globalTranslations["pt-br"].apps.app.pages.admin.auditTrail.filters;

const USERS = [
    {
        id: "p2",
        uid: "auth-common",
        email: "cliente@example.com",
        displayName: "Cliente",
        type: UserType.COMMON,
    },
    {
        id: "p3",
        uid: "auth-nameless",
        email: null,
        displayName: null,
        type: UserType.COMMON,
    },
];

function renderFilters() {
    const onApply = vi.fn();
    render(<AuditFilters onApply={onApply} />);
    return onApply;
}

function chooseUser(id: string) {
    fireEvent.change(screen.getByTestId("user-select"), {
        target: { value: id },
    });
}

function typePeriod(from: string, to: string) {
    fireEvent.change(screen.getByLabelText(filtersCopy.fromLabel), {
        target: { value: from },
    });
    fireEvent.change(screen.getByLabelText(filtersCopy.toLabel), {
        target: { value: to },
    });
}

function apply() {
    fireEvent.click(screen.getByRole("button", { name: filtersCopy.apply }));
}

beforeEach(() => {
    cleanup();
    listUsersMock.mockReset();
    listUsersMock.mockReturnValue({ data: USERS });
});

describe("AuditFilters user options", () => {
    it("offers every user the admin listing returns", () => {
        renderFilters();

        const labels = Array.from(
            screen.getByTestId("user-select").querySelectorAll("option")
        ).map((option) => option.textContent);

        expect(labels).toContain("cliente@example.com");
    });

    it("leads with the option that clears the user filter", () => {
        renderFilters();

        const first = screen.getByTestId("user-select").querySelector("option");

        expect(first?.textContent).toBe(filtersCopy.userAll);
    });

    it("names a user with neither email nor display name by their id", () => {
        renderFilters();

        const labels = Array.from(
            screen.getByTestId("user-select").querySelectorAll("option")
        ).map((option) => option.textContent);

        expect(labels).toContain("p3");
    });

    it("renders with no user list at all", () => {
        listUsersMock.mockReturnValue({ data: undefined });

        renderFilters();

        expect(
            screen.getByTestId("user-select").querySelectorAll("option")
        ).toHaveLength(1);
    });
});

describe("AuditFilters applying", () => {
    it("asks for no user filter while the leading option is selected", async () => {
        const onApply = renderFilters();

        apply();

        await waitFor(() => expect(onApply).toHaveBeenCalledWith({}));
    });

    it("sends the chosen user to the listing", async () => {
        const onApply = renderFilters();

        chooseUser("p2");
        apply();

        await waitFor(() =>
            expect(onApply).toHaveBeenCalledWith({ userId: "p2" })
        );
    });

    it("sends the user and the period together", async () => {
        const onApply = renderFilters();

        chooseUser("p2");
        typePeriod("2026-09-01", "2026-09-16");
        apply();

        await waitFor(() =>
            expect(onApply).toHaveBeenCalledWith({
                userId: "p2",
                from: "2026-09-01",
                to: "2026-09-16",
            })
        );
    });

    it("leaves an empty date out of the query instead of sending a blank", async () => {
        const onApply = renderFilters();

        typePeriod("2026-09-01", "");
        apply();

        await waitFor(() =>
            expect(onApply).toHaveBeenCalledWith({ from: "2026-09-01" })
        );
    });

    it("refuses an inverted period before reaching the listing", async () => {
        const onApply = renderFilters();

        typePeriod("2026-09-16", "2026-09-01");
        apply();

        await waitFor(() =>
            expect(document.body.textContent).toContain(
                filtersCopy.validation.rangeInverted
            )
        );
        expect(onApply).not.toHaveBeenCalled();
    });
});

describe("AuditFilters clearing", () => {
    it("drops every filter from the listing in one click", async () => {
        const onApply = renderFilters();
        chooseUser("p2");
        typePeriod("2026-09-01", "2026-09-16");
        apply();
        await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));

        fireEvent.click(
            screen.getByRole("button", { name: filtersCopy.clear })
        );

        expect(onApply).toHaveBeenLastCalledWith({});
    });

    it("puts the form back to the leading option and empty dates", async () => {
        renderFilters();
        chooseUser("p2");
        typePeriod("2026-09-01", "2026-09-16");

        fireEvent.click(
            screen.getByRole("button", { name: filtersCopy.clear })
        );

        await waitFor(() =>
            expect(
                (screen.getByTestId("user-select") as HTMLSelectElement).value
            ).toBe("__all__")
        );
        expect(
            (screen.getByLabelText(filtersCopy.fromLabel) as HTMLInputElement)
                .value
        ).toBe("");
    });

    it("clears the inverted period message along with the values", async () => {
        renderFilters();
        typePeriod("2026-09-16", "2026-09-01");
        apply();
        await waitFor(() =>
            expect(document.body.textContent).toContain(
                filtersCopy.validation.rangeInverted
            )
        );

        fireEvent.click(
            screen.getByRole("button", { name: filtersCopy.clear })
        );

        await waitFor(() =>
            expect(document.body.textContent).not.toContain(
                filtersCopy.validation.rangeInverted
            )
        );
    });
});
