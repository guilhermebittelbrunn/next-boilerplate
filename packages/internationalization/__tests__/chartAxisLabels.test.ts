import { describe, expect, it } from "vitest";
import { adminHomePageTranslations } from "../translations/apps/app/pages/admin/home";
import { locales } from "../utils";

/**
 * Um rótulo de eixo compete por largura com os vizinhos, e quem perde some da tela sem
 * aviso: o `CategoryBarChart` desenha um tick por categoria, então dois rótulos largos
 * demais se sobrepõem em vez de um deles ser escondido.
 *
 * A faixa de recência tem cinco categorias. Na home do admin em 375 px de viewport sobram
 * cerca de 261 px para o gráfico, ou ~52 px por categoria. Com a fonte de 12 px do
 * `ChartContainer`, um caractere largo mede ~6,9 px, então sete caracteres ocupam ~48 px no
 * pior caso e ainda cabem. Foi por estourar esse limite que a versão em inglês perdeu o
 * rótulo do meio.
 *
 * Este teste existe para a tradução: trocar "8-30d" por "8 to 30 days" volta a quebrar a
 * tela, e a paridade de chaves não pega isso porque a chave continua lá.
 */
const MAX_AXIS_LABEL_CHARS = 7;

describe("rótulos do eixo do gráfico de recência", () => {
    it.each(locales)("cabem na faixa do eixo em %s", (locale) => {
        const { buckets } = adminHomePageTranslations[locale].activity;

        const tooLong = Object.entries(buckets)
            .filter(([, label]) => label.length > MAX_AXIS_LABEL_CHARS)
            .map(([key, label]) => `${key}: "${label}" (${label.length})`);

        expect(tooLong).toEqual([]);
    });

    it.each(locales)("nomeiam as cinco faixas em %s", (locale) => {
        const { buckets } = adminHomePageTranslations[locale].activity;

        expect(Object.keys(buckets)).toEqual([
            "last7Days",
            "from8To30Days",
            "from31To90Days",
            "over90Days",
            "never",
        ]);
        for (const label of Object.values(buckets)) {
            expect(label.trim()).not.toBe("");
        }
    });
});
