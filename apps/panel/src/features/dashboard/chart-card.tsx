import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { EmptyState } from "../../components/query-states";
import { Card } from "../../components/ui/card";
import { Table, Td, Th } from "../../components/ui/table";

export interface Series {
  key: string;
  label: string;
}
type Row = Record<string, string | number>;

// Colores solo de tokens del tema (variables CSS). Color + etiqueta de valor sobre cada barra + resumen + tabla: nunca solo color.
const colorOf = (i: number) => `var(--c-data-${(i % 6) + 1})`;
const axisText = { fill: "var(--c-text)", fontSize: "var(--t-text-sm)" };

interface Props {
  title: string;
  /** Resumen en texto de lo que muestra el grafico. */
  summary: string;
  data: Row[];
  xKey: string;
  xLabel: string;
  series: Series[];
  /** Barras horizontales: para categorias con texto largo. */
  horizontal?: boolean;
  /** Como mostrar la categoria en el grafico (la tabla usa `xKey` completo). */
  tickFormat?: (v: string | number) => string;
  extra?: ReactNode;
}

export function ChartCard({ title, summary, data, xKey, xLabel, series, horizontal = false, tickFormat, extra }: Props) {
  const { t } = useTranslation();
  const fmt = tickFormat ?? String;
  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p>{summary}</p>
      {data.length === 0 ? (
        <EmptyState text={t("dashboard.noData")} />
      ) : (
        <>
          {/* La version accesible es el resumen y la tabla: el SVG se oculta para evitar ruido. */}
          <div aria-hidden="true" className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} accessibilityLayer={false} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="var(--c-border)" strokeDasharray="4 4" />
                {horizontal ? (
                  <>
                    <XAxis type="number" allowDecimals={false} tick={axisText} stroke="var(--c-border)" />
                    <YAxis type="category" dataKey={xKey} width={150} interval={0} tick={axisText} tickFormatter={fmt} stroke="var(--c-border)" />
                  </>
                ) : (
                  <>
                    <XAxis dataKey={xKey} tick={axisText} tickFormatter={fmt} stroke="var(--c-border)" />
                    <YAxis allowDecimals={false} tick={axisText} stroke="var(--c-border)" />
                  </>
                )}
                {series.length > 1 && <Legend wrapperStyle={{ color: "var(--c-text)" }} />}
                {series.map((s, i) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={colorOf(i)} stroke="var(--c-text)" isAnimationActive={false}>
                    <LabelList dataKey={s.key} position={horizontal ? "right" : "top"} fill="var(--c-text)" fontSize="var(--t-text-sm)" />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details>
            <summary className="min-h-touch cursor-pointer py-2 font-medium">{t("dashboard.showTable")}</summary>
            <Table caption={title}>
              <thead>
                <tr>
                  <Th>{xLabel}</Th>
                  {series.map((s) => (
                    <Th key={s.key}>{s.label}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={String(row[xKey])}>
                    <Td>{row[`${xKey}Full`] ?? row[xKey]}</Td>
                    {series.map((s) => (
                      <Td key={s.key}>{row[s.key]}</Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </details>
        </>
      )}
      {extra}
    </Card>
  );
}
