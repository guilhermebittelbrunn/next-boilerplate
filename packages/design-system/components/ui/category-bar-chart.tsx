"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./chart";

export type CategoryBarDatum = {
  /** Matches a key of `config`, which is where the label and the colour come from. */
  category: string;
  value: number;
};

export type CategoryBarChartProps = {
  data: CategoryBarDatum[];
  config: ChartConfig;
  className?: string;
  /** Describes the chart for screen readers, since the SVG carries no text of its own. */
  label: string;
};

export function CategoryBarChart({
  data,
  config,
  className,
  label,
}: CategoryBarChartProps) {
  // `ChartStyle` publishes one `--color-<key>` per config entry on the container, and
  // recharts paints a bar from `fill` on its own datum — that pair is what makes each
  // column follow the theme instead of the library's default palette.
  const bars = data.map((datum) => ({
    ...datum,
    fill: `var(--color-${datum.category})`,
  }));

  return (
    <ChartContainer
      aria-label={label}
      className={className}
      config={config}
      role="img"
    >
      <BarChart accessibilityLayer data={bars} margin={{ top: 24 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="category"
          // One tick per category, always. The recharts default is `preserveEnd`, which
          // drops a tick whose text would touch its neighbour and leaves that bar unnamed
          // with nothing on screen saying a label is missing. Short labels are the caller's
          // job: this axis will not hide one to make room.
          interval={0}
          tickFormatter={(value: string) =>
            String(config[value]?.label ?? value)
          }
          tickLine={false}
          tickMargin={10}
        />
        <ChartTooltip
          content={<ChartTooltipContent hideLabel nameKey="category" />}
          cursor={false}
        />
        <Bar dataKey="value" radius={6}>
          <LabelList
            className="fill-foreground"
            fontSize={12}
            offset={8}
            position="top"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
