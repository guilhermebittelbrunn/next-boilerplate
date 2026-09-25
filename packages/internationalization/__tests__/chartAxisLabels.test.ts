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

/**
 * O gráfico de planos corta todo rótulo do eixo, inclusive o da barra que agrupa os demais
 * planos, então uma tradução mais longa que o limite apareceria truncada. A 320 px de viewport
 * os centros dos cinco ticks ficam a cerca de 38 px um do outro, e com a fonte de 12 px um
 * rótulo de seis caracteres como "Empre…" ocupa 43 px, cerca de 7,2 px por caractere. O
 * limite é quantos desses caracteres cabem entre dois ticks.
 */
const TICK_SPACING_AT_320_PX = 38;
const WIDE_LABEL_PX = 43;
const WIDE_LABEL_CHARS = 6;
const MAX_PLAN_AXIS_LABEL_CHARS = Math.floor(
    TICK_SPACING_AT_320_PX / (WIDE_LABEL_PX / WIDE_LABEL_CHARS)
);

describe("rótulo da barra que agrupa os demais planos", () => {
    it.each(locales)("cabe inteiro no eixo em %s", (locale) => {
        const { other } = adminHomePageTranslations[locale].billing.plans;

        expect(Array.from(other).length).toBeLessThanOrEqual(
            MAX_PLAN_AXIS_LABEL_CHARS
        );
        expect(other.trim()).not.toBe("");
    });
});
