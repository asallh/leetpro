"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** A labelled pill select bound to one URL search param; keeps the other params. */
function ParamSelect({
  label,
  param,
  value,
  defaultValue,
  options,
}: {
  label: string;
  param: string;
  value: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value && e.target.value !== defaultValue) params.set(param, e.target.value);
          else params.delete(param);
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
        className="h-9 rounded-full border bg-card pr-8 pl-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Topic picker for the Problems table; keeps the status filter and updates the URL. */
export function TopicFilter({
  topics,
  value,
}: {
  topics: { name: string; count: number }[];
  value: string;
}) {
  return (
    <ParamSelect
      label="Topic"
      param="topic"
      value={value}
      defaultValue=""
      options={[
        { value: "", label: "All topics" },
        ...topics.map((t) => ({ value: t.name, label: `${t.name} (${t.count})` })),
      ]}
    />
  );
}

/** Sort order for the Problems table. The first option is the default. */
export function SortSelect({ options, value }: { options: readonly { key: string; label: string }[]; value: string }) {
  return (
    <ParamSelect
      label="Sort by"
      param="sort"
      value={value}
      defaultValue={options[0].key}
      options={options.map((o) => ({ value: o.key, label: o.label }))}
    />
  );
}
