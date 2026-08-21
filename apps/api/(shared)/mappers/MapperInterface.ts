/** biome-ignore-all lint/style/useConsistentTypeDefinitions: <explanation> */
import type { AllOptional } from "@repo/shared/utils";

/**
 * Firestore/API boundary without a separate domain layer: `Entity` is the persisted
 * document shape (plus `id`); `DTO` is the contract exposed to clients (`@repo/sdk`).
 */
export interface MapperInterface<Entity, DTO> {
    toDTO(entity: Entity): DTO;
    toPersistence(
        input: AllOptional<DTO>
    ):
        | AllOptional<Record<string, unknown>>
        | Promise<AllOptional<Record<string, unknown>>>;
}
