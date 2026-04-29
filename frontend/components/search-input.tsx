"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
  className?: string;
}

/**
 * Global search input for server-side tables.
 * Fires onChange after a debounce delay or immediately on Enter.
 * Always feeds the `q` query param — never a per-column text filter.
 */
export function SearchInput({
  value: externalValue,
  onChange,
  placeholder = "Buscar...",
  debounce = 400,
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = React.useState(externalValue);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  // Keep onChange ref current to avoid stale closure in setTimeout.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  // Track the last value we emitted so external resets don't overwrite in-flight keystrokes.
  const lastEmittedRef = React.useRef(externalValue);

  // Sync only when the parent explicitly resets to a different value (e.g. clear button).
  React.useEffect(() => {
    if (externalValue !== lastEmittedRef.current) {
      setLocalValue(externalValue);
      lastEmittedRef.current = externalValue;
    }
  }, [externalValue]);

  // Clear pending timer on unmount.
  React.useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const commit = (val: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    lastEmittedRef.current = val;
    onChangeRef.current(val);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastEmittedRef.current = val;
      onChangeRef.current(val);
    }, debounce);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit(localValue);
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-8 pl-8 text-sm w-48 lg:w-64"
      />
    </div>
  );
}
