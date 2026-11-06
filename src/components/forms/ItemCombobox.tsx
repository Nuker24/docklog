"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  filterItems,
  formatItemOptionLabel,
  formatItemSecondary,
  type SearchableItem,
} from "@/lib/item-search";

type ItemComboboxProps<T extends SearchableItem> = {
  items: T[];
  name?: string;
  id?: string;
  label?: string;
  value: string;
  onChange: (itemId: string, item: T | undefined) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

export function ItemCombobox<T extends SearchableItem>({
  items,
  name = "itemId",
  id,
  value,
  onChange,
  required,
  placeholder = "Search SKU, name, NDC, or UPC…",
  disabled,
}: ItemComboboxProps<T>) {
  const autoId = useId();
  const inputId = id ?? `item-combo-${autoId}`;
  const listId = `${inputId}-listbox`;

  const selected = items.find((i) => i.id === value);
  const [query, setQuery] = useState(
    selected ? formatItemOptionLabel(selected) : "",
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { matches, truncated } = useMemo(
    () => filterItems(items, open ? query : "", 50),
    [items, query, open],
  );

  // Keep display in sync when parent changes value externally
  useEffect(() => {
    if (!open) {
      const next = items.find((i) => i.id === value);
      setQuery(next ? formatItemOptionLabel(next) : "");
    }
  }, [value, items, open]);

  useEffect(() => {
    function onDocPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        const next = items.find((i) => i.id === value);
        setQuery(next ? formatItemOptionLabel(next) : "");
      }
    }
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, [items, value]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function selectItem(item: T) {
    onChange(item.id, item);
    setQuery(formatItemOptionLabel(item));
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[activeIndex]) {
        e.preventDefault();
        selectItem(matches[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      const next = items.find((i) => i.id === value);
      setQuery(next ? formatItemOptionLabel(next) : "");
    } else if (e.key === "Tab") {
      setOpen(false);
      const next = items.find((i) => i.id === value);
      setQuery(next ? formatItemOptionLabel(next) : "");
    }
  }

  return (
    <div className="item-combobox" ref={rootRef}>
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : null}
      <div className="item-combobox-input-wrap">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && matches[activeIndex]
              ? `${listId}-opt-${matches[activeIndex].id}`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
            if (value) onChange("", undefined);
          }}
          onFocus={() => {
            setOpen(true);
            setActiveIndex(0);
            // Select all so typing replaces the selected label quickly
            if (value) {
              // leave query as label until user types
            }
          }}
          onKeyDown={onKeyDown}
        />
        {value && !disabled && (
          <button
            type="button"
            className="item-combobox-clear"
            aria-label="Clear item"
            onClick={() => {
              onChange("", undefined);
              setQuery("");
              setOpen(true);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="item-combobox-list"
          ref={listRef}
        >
          {matches.length === 0 ? (
            <li className="item-combobox-empty" role="presentation">
              No items match “{query.trim() || "…"}”
            </li>
          ) : (
            matches.map((item, index) => {
              const secondary = formatItemSecondary(item);
              return (
                <li
                  key={item.id}
                  id={`${listId}-opt-${item.id}`}
                  role="option"
                  aria-selected={item.id === value}
                  data-index={index}
                  className={
                    index === activeIndex
                      ? "item-combobox-option is-active"
                      : "item-combobox-option"
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectItem(item);
                  }}
                >
                  <span className="item-combobox-primary">
                    <span className="mono">{item.sku}</span>
                    <span>{item.name}</span>
                    {item.uom && <span className="muted">({item.uom})</span>}
                    {item.requiresCold && (
                      <span className="tag tag-cold">Cold</span>
                    )}
                    {item.channel === "PHARMACY_SOS" && (
                      <span className="tag tag-cold">Pharmacy SOS</span>
                    )}
                  </span>
                  {secondary && (
                    <span className="item-combobox-secondary mono">
                      {secondary}
                    </span>
                  )}
                </li>
              );
            })
          )}
          {truncated && (
            <li className="item-combobox-more" role="presentation">
              Showing first 50 matches — refine your search
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
