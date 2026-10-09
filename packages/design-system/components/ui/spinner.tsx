"use client"

import { getDictionary } from "@repo/internationalization/client"
import { Loader2Icon } from "lucide-react"

import { cn } from "@repo/design-system/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const { dictionary } = getDictionary()
  return (
    <Loader2Icon
      role="status"
      aria-label={dictionary.components.spinner.loading}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
