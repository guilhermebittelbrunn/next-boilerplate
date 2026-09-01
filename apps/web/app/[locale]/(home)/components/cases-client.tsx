"use client";

import {
    Carousel,
    type CarouselApi,
    CarouselContent,
    CarouselItem,
} from "@repo/design-system/components/ui/carousel";
import { getDictionary } from "@repo/internationalization/client";
import { useEffect, useState } from "react";

const CASE_LOGO_COUNT = 15;
const CASE_LOGO_SLOTS = Array.from(
    { length: CASE_LOGO_COUNT },
    (_, index) => index + 1
);
const AUTO_ADVANCE_DELAY_MS = 1000;

export const CasesClient = () => {
    const { dictionary } = getDictionary();
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (!api) {
            return;
        }

        setTimeout(() => {
            if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
                setCurrent(0);
                api.scrollTo(0);
            } else {
                api.scrollNext();
                setCurrent(current + 1);
            }
        }, AUTO_ADVANCE_DELAY_MS);
    }, [api, current]);

    return (
        <div className="w-full py-20 lg:py-40">
            <div className="container mx-auto">
                <div className="flex flex-col gap-10">
                    <h2 className="text-left font-regular text-xl tracking-tighter md:text-5xl lg:max-w-xl">
                        {dictionary.apps.web.pages.home.cases.title}
                    </h2>
                    <Carousel className="w-full" setApi={setApi}>
                        <CarouselContent>
                            {CASE_LOGO_SLOTS.map((slot) => (
                                <CarouselItem
                                    className="basis-1/4 lg:basis-1/6"
                                    key={slot}
                                >
                                    <div className="flex aspect-square items-center justify-center rounded-md bg-muted p-6">
                                        <span className="text-sm">
                                            {
                                                dictionary.apps.web.pages.home
                                                    .cases.logoLabel
                                            }{" "}
                                            {slot}
                                        </span>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </div>
            </div>
        </div>
    );
};
