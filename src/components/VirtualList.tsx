import { useMemo, useState, type ReactNode } from "react";

interface VirtualListProps<T> {
  items: T[];
  itemHeight?: number;
  maxVisible?: number;
  renderItem: (item: T, index: number) => ReactNode;
}

function VirtualList<T>({ items, itemHeight = 72, maxVisible = 10, renderItem }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = itemHeight * maxVisible;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(items.length, startIndex + maxVisible + 4);
  const visibleItems = useMemo(() => items.slice(startIndex, endIndex), [endIndex, items, startIndex]);
  const topSpacer = startIndex * itemHeight;
  const bottomSpacer = Math.max(0, (items.length - endIndex) * itemHeight);

  return (
    <div
      className="virtual-list"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      style={{
        maxHeight: viewportHeight,
        overflowY: items.length > maxVisible ? "auto" : "visible",
      }}
    >
      {topSpacer > 0 && <div style={{ height: topSpacer }} />}
      {visibleItems.map((item, index) => (
        <div className="virtual-row" key={startIndex + index} style={{ minHeight: itemHeight }}>
          {renderItem(item, startIndex + index)}
        </div>
      ))}
      {bottomSpacer > 0 && <div aria-hidden="true" style={{ height: bottomSpacer }} />}
    </div>
  );
}

export default VirtualList;
