declare module "react-window" {
  import * as React from "react";

  export interface ListOnScrollProps {
    scrollDirection: "forward" | "backward";
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }

  export interface ListChildComponentProps<T = unknown> {
    index: number;
    style: React.CSSProperties;
    data: T;
    isScrolling?: boolean;
  }

  export interface FixedSizeListProps<T = unknown> {
    children: React.ComponentType<ListChildComponentProps<T>>;
    height: number;
    itemCount: number;
    itemSize: number;
    width: number | string;
    itemData?: T;
    className?: string;
    style?: React.CSSProperties;
    overscanCount?: number;
    onScroll?: (props: ListOnScrollProps) => void;
  }

  export class FixedSizeList<T = unknown> extends React.PureComponent<FixedSizeListProps<T>> {}
}
