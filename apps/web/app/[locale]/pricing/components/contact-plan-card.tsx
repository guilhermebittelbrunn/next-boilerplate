import { buttonVariants } from "@repo/design-system/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import { PhoneCall } from "lucide-react";
import Link from "next/link";

type ContactPlanCardProps = {
    copy: {
        title: string;
        description: string;
        price: string;
        linkButton: string;
    };
    href: string;
};

export function ContactPlanCard({ copy, href }: ContactPlanCardProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>
                    <h2 className="text-xl">{copy.title}</h2>
                </CardTitle>
                <CardDescription>{copy.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
                <p className="font-semibold text-2xl tracking-tight">
                    {copy.price}
                </p>
            </CardContent>
            <CardFooter>
                <Link
                    className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full gap-2"
                    )}
                    href={href}
                >
                    <PhoneCall aria-hidden />
                    {copy.linkButton}
                </Link>
            </CardFooter>
        </Card>
    );
}
