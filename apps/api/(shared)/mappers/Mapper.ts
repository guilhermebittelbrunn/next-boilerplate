import type { AllOptional } from "@repo/shared/utils";
import type { MapperInterface } from "./MapperInterface";

export default abstract class Mapper<Entity, DTO>
    implements MapperInterface<Entity, DTO>
{
    abstract toDTO(entity: Entity): DTO;

    abstract toPersistence(
        input: AllOptional<DTO>
    ):
        | AllOptional<Record<string, unknown>>
        | Promise<AllOptional<Record<string, unknown>>>;

    toDTOOrNull(entity: Entity | null | undefined): DTO | null {
        return entity ? this.toDTO(entity) : null;
    }

    toDTOOrUndefined(entity: Entity | null | undefined): DTO | undefined {
        return entity ? this.toDTO(entity) : undefined;
    }
}
