"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  HookFormInput,
  HookFormInputPassword,
} from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { useForm } from "react-hook-form";
import { useUserCrud } from "../(hooks)/useUserCrud";
import {
  type CreateUserFormValues,
  createUserSchema,
} from "../(validations)/signInSchema";

export const UserFormClient = () => {
  const { dictionary } = getDictionary();
  const { createUserMutation } = useUserCrud();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <div className="flex min-h-[calc(100vh-20rem)] w-full items-center justify-center py-20">
      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((data) =>
            createUserMutation.mutate({ ...data })
          )}
        >
          <HookFormInput
            label="Email"
            name="email"
            placeholder="email@email.com"
            type="email"
          />

          <HookFormInputPassword
            label={dictionary.apps.app.pages.signIn.form.password}
            name="password"
          />
        </form>
      </Form>
    </div>
  );
};
