"use client";

import { useQuestionBank } from "@/lib/client/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Star, Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { QUESTION_CATEGORIES, QUESTION_TYPE_VALUES, INTERVIEW_METHOD_VALUES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function QuestionBankPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const { data: items, loading, refetch } = useQuestionBank({ search, ...filters });

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Question Bank</h1>
        <Button variant="gradient">
          <Star className="w-4 h-4 mr-2" />
          Import Question
        </Button>
      </div>

      <div className="flex gap-4 items-end">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filters.category || ""}
          onChange={(v) => setFilters({ ...filters, category: v || undefined })}
          options={[{ value: "", label: "All Categories" }, ...QUESTION_CATEGORIES.map((c) => ({ value: c, label: c }))]}
          placeholder="Category"
          className="w-48"
        />
        <Select
          value={filters.type || ""}
          onChange={(v) => setFilters({ ...filters, type: v || undefined })}
          options={[{ value: "", label: "All Types" }, ...QUESTION_TYPE_VALUES.map((t) => ({ value: t, label: t }))]}
          placeholder="Type"
          className="w-48"
        />
        <Select
          value={filters.method || ""}
          onChange={(v) => setFilters({ ...filters, method: v || undefined })}
          options={[{ value: "", label: "All Methods" }, ...INTERVIEW_METHOD_VALUES.map((m) => ({ value: m, label: m }))]}
          placeholder="Method"
          className="w-48"
        />
      </div>

      {!items?.length ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          No questions found. Try adjusting your search or filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)] line-clamp-3">{item.question}</p>
                </div>
                <Star
                  className={cn("w-4 h-4 cursor-pointer", item.isFavorite ? "text-amber-400 fill-current" : "text-[var(--text-muted)]")}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="default">{item.type}</Badge>
                {item.category && <Badge variant="outline">{item.category}</Badge>}
                {item.difficulty && (
                  <Badge variant={item.difficulty === "EASY" ? "success" : item.difficulty === "HARD" ? "error" : "warning"}>
                    {item.difficulty}
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex gap-2 text-xs text-[var(--text-muted)]">
                <span>{item.uses} uses</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
