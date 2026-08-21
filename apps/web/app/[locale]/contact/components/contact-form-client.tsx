"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { format } from "date-fns";
import { CalendarIcon, Check, MoveRight } from "lucide-react";
import { useState } from "react";

export const ContactFormClient = () => {
  const { dictionary } = getDictionary();
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <h4 className="max-w-xl font-regular text-3xl md:text-5xl">
                  {
                    dictionary.apps.web.pages.contact.meta
                      .title
                  }
                </h4>
                <p className="max-w-sm text-center text-lg text-muted-foreground leading-relaxed tracking-tight">
                  {
                    dictionary.apps.web.pages.contact.meta
                      .description
                  }
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {dictionary.apps.web.pages.contact.hero.benefits.map(
                (benefit, index) => (
                  <div
                    className="flex flex-row items-center gap-6 text-left"
                    key={index}
                  >
                    <Check className="mt-2 h-4 w-4 text-primary" />
                    <div className="flex flex-col gap-1">
                      <p>{benefit.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="flex max-w-sm flex-col gap-4 rounded-md border p-8">
              <p>
                {
                  dictionary.apps.web.pages.contact.hero.form
                    .title
                }
              </p>
              <div className="grid w-full max-w-sm items-center gap-1">
                <Label htmlFor="date">
                  {
                    dictionary.apps.web.pages.contact.hero
                      .form.date
                  }
                </Label>
                <Popover>
                  <PopoverTrigger>
                    <Button
                      className={cn(
                        "w-full max-w-sm justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                      variant="outline"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? (
                        format(date, "PPP")
                      ) : (
                        <span>
                          {
                            dictionary.apps.web
                              .pages.contact.hero
                              .form.date
                          }
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      initialFocus
                      mode="single"
                      onSelect={setDate}
                      selected={date}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid w-full max-w-sm items-center gap-1">
                <Label htmlFor="firstname">
                  {
                    dictionary.apps.web.pages.contact.hero
                      .form.firstName
                  }
                </Label>
                <Input id="firstname" type="text" />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1">
                <Label htmlFor="lastname">
                  {
                    dictionary.apps.web.pages.contact.hero
                      .form.lastName
                  }
                </Label>
                <Input id="lastname" type="text" />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1">
                <Label htmlFor="resume">
                  {
                    dictionary.apps.web.pages.contact.hero
                      .form.resume
                  }
                </Label>
                <Input id="resume" type="file" />
              </div>

              <Button className="w-full gap-4">
                {
                  dictionary.apps.web.pages.contact.hero.form
                    .cta
                }{" "}
                <MoveRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
