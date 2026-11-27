import { getDictionary } from "@repo/internationalization/client";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";

const retryLabel = getDictionary().dictionary.components.button.retry;
const MESSAGE = "Não foi possível carregar.";

describe("LoadErrorState", () => {
    it("anuncia a mensagem como alerta e não oferece nova tentativa sem onRetry", () => {
        render(<LoadErrorState message={MESSAGE} />);

        expect(screen.getByRole("alert").textContent).toContain(MESSAGE);
        expect(screen.queryByRole("button", { name: retryLabel })).toBeNull();
    });

    it("chama onRetry ao clicar em tentar de novo", () => {
        const onRetry = vi.fn();
        render(<LoadErrorState message={MESSAGE} onRetry={onRetry} />);

        fireEvent.click(screen.getByRole("button", { name: retryLabel }));

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("desabilita o botão enquanto a nova tentativa está em andamento", () => {
        const onRetry = vi.fn();
        render(<LoadErrorState message={MESSAGE} onRetry={onRetry} retrying />);

        const button = screen.getByRole("button", { name: retryLabel });
        expect(button.hasAttribute("disabled")).toBe(true);

        fireEvent.click(button);
        expect(onRetry).not.toHaveBeenCalled();
    });
});
