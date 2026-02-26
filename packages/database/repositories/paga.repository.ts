import { BaseRepository } from "./base.repository";

export type Page = {
    id: string;
    name: string;
};

export default class PageRepository extends BaseRepository<Page> {
    constructor() {
        super("pages");
    }
}
