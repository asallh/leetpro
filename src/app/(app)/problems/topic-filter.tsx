"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Topic picker for the Problems table; keeps the status filter and updates the URL. */
export function TopicFilter({
  topics,
  value,
}: {
  topics: { name: string; count: number }[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Topic</span>
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value) params.set("topic", e.target.value);
          else params.delete("topic");
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
        className="h-9 rounded-full border bg-card pr-8 pl-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary"
      >
        <option value="">All topics</option>
        {topics.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name} ({t.count})
          </option>
        ))}
      </select>
    </label>
  );
}
