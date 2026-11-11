// Gói giao diện chung EDUVN v2 (hai cổng /gv và /hoc). CSS nạp ở entry mỗi cổng:
//   import "../ui/styles/fonts.css"; "../ui/styles/tokens.css"; "../ui/styles/ui.css"; skin-gv.css | skin-hoc.css; (trang cũ) legacy.css
export { Icon } from "./Icon";
export { ICON_NAMES, type IconName } from "./iconNames";
export { Button, IconButton, DONE_MS, type ButtonProps, type ButtonVariant, type ButtonSize } from "./components/Button";
export { Field, Input, Select, Textarea } from "./components/Field";
export { Chip, ChipGroup, Badge, Segmented, type ChipOption } from "./components/Chip";
export { Tabs, type TabItem } from "./components/Tabs";
export { Table, parseSort, nextSort, pageItems, type Column, type SortKey, type TableProps } from "./components/Table";
export { Skeleton, SkeletonRows } from "./components/Skeleton";
export { ToastProvider, useToast, MAX_TOASTS, TOAST_LIFE, TOAST_UNDO_LIFE, type ToastInput, type ToastKind } from "./components/Toast";
export { Dialog, ConfirmDialog } from "./components/Dialog";
export { CommandPalette, type Command } from "./components/CommandPalette";
export { EmptyState, ErrorState, OfflineBanner, Region, type RegionStatus } from "./components/States";
export { StreamingText, type StreamState } from "./components/StreamingText";
export { Avatar, initials } from "./components/Avatar";
export { Kbd } from "./components/Kbd";
export { Meter, Ring, RingBig } from "./components/Progress";
export { ChartTooltip } from "./components/Tooltip";
export { fold } from "./components/focus";
export * from "./charts";
