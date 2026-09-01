/** biome-ignore-all lint/performance/noBarrelFile: reexporta os tipos de schema-dts para que os apps montem o JSON-LD sem declarar a dependência. */
/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: JSON-LD só é lido por buscadores dentro de um <script type="application/ld+json">, que exige injeção crua; o conteúdo é serializado aqui e escapado por escapeJsonForHtml. */
import type { Thing, WithContext } from "schema-dts";

type JsonLdProps = {
    code: WithContext<Thing>;
};

const escapeJsonForHtml = (json: string): string =>
    json
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");

export const JsonLd = ({ code }: JsonLdProps) => (
    <script
        dangerouslySetInnerHTML={{
            __html: escapeJsonForHtml(JSON.stringify(code)),
        }}
        type="application/ld+json"
    />
);

export * from "schema-dts";
