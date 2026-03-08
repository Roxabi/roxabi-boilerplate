import React from 'react'

/**
 * Shared mock implementations for @repo/ui components.
 *
 * Usage in test files:
 *   vi.mock('@repo/ui', async () => await import('@/test/__mocks__/repoUi'))
 *
 * When to add a component here:
 *   - Component is used in 3+ test files
 *   - Component is presentational (no business logic)
 *   - A semantic HTML element accurately represents the component
 *
 * When to use an inline mock instead:
 *   - Component is used in only 1-2 tests
 *   - Test needs custom mock behavior (e.g., tracking calls, conditional rendering)
 */

/**
 * Simplified mock: filter + join. Diverges from the real cn() which uses
 * clsx + tailwind-merge (class deduplication & conflict resolution).
 * Do NOT rely on this mock for class-assertion tests.
 */
export const cn = (...args: unknown[]) => args.filter(Boolean).join(' ')

export const AnimatedSection = ({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>

export const Card = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
  <div {...props}>{children}</div>
)

export const CardContent = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const CardDescription = ({ children }: React.PropsWithChildren) => <p>{children}</p>

export const CardFooter = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const CardHeader = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const CardTitle = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => <h3 {...props}>{children}</h3>

export const Button = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>

export const Checkbox = ({
  id,
  checked,
  onCheckedChange,
  ...props
}: {
  id?: string
  checked?: boolean
  onCheckedChange?: (v: boolean) => void
}) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    {...props}
  />
)

export const Input = (props: Record<string, unknown>) => <input {...props} />

export const Label = ({
  children,
  htmlFor,
  ...props
}: React.PropsWithChildren<{ htmlFor?: string; [key: string]: unknown }>) => (
  <label htmlFor={htmlFor} {...props}>
    {children}
  </label>
)

export const OAuthButton = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>

export const Switch = ({
  checked,
  onCheckedChange,
  ...props
}: {
  checked?: boolean
  onCheckedChange?: (v: boolean) => void
  [key: string]: unknown
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange?.(!checked)}
    {...props}
  />
)

export const PasswordInput = (props: Record<string, unknown>) => (
  <input type="password" {...props} />
)

export const Accordion = ({
  children,
}: React.PropsWithChildren<{ type?: string; collapsible?: boolean }>) => (
  <div data-testid="accordion">{children}</div>
)

export const AccordionItem = ({
  children,
}: React.PropsWithChildren<{ value?: string; className?: string }>) => <div>{children}</div>

export const AccordionTrigger = ({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) => (
  <button type="button" className={className}>
    {children}
  </button>
)

export const AccordionContent = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const Badge = ({
  children,
  variant,
  ...props
}: React.PropsWithChildren<{ variant?: string }>) => (
  <span data-variant={variant} {...props}>
    {children}
  </span>
)

export const Skeleton = ({ className }: { className?: string }) => (
  <div data-testid="skeleton" className={className} />
)

export const FormMessage = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => (
  <div role="alert" aria-live="polite" {...props}>
    {children}
  </div>
)

export const Tabs = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
  <div data-testid="tabs" {...props}>
    {children}
  </div>
)

export const TabsList = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => (
  <div role="tablist" {...props}>
    {children}
  </div>
)

export const TabsTrigger = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => (
  <button role="tab" {...props}>
    {children}
  </button>
)

export const TabsContent = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => (
  <div role="tabpanel" {...props}>
    {children}
  </div>
)

const SelectContext = React.createContext<{
  onValueChange?: (value: string) => void
  value?: string
  disabled?: boolean
}>({})

export const Select = ({
  children,
  onValueChange,
  value,
  disabled,
}: React.PropsWithChildren<{
  onValueChange?: (value: string) => void
  value?: string
  disabled?: boolean
}>) => (
  <SelectContext.Provider value={{ onValueChange, value, disabled }}>
    <div>{children}</div>
  </SelectContext.Provider>
)

export const SelectContent = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const SelectItem = ({ children, value }: React.PropsWithChildren<{ value: string }>) => {
  const ctx = React.useContext(SelectContext)
  return (
    <button
      type="button"
      role="option"
      onClick={() => ctx.onValueChange?.(value)}
      aria-selected={ctx.value === value}
      aria-disabled={ctx.disabled}
    >
      {children}
    </button>
  )
}

export const SelectTrigger = ({ children }: React.PropsWithChildren<{ className?: string }>) => (
  <div>{children}</div>
)

export const SelectValue = () => <span />

export const Dialog = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const DialogClose = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const DialogContent = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const DialogDescription = ({ children }: React.PropsWithChildren) => <p>{children}</p>

export const DialogFooter = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const DialogHeader = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const DialogTitle = ({ children }: React.PropsWithChildren) => <h2>{children}</h2>

export const DialogTrigger = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const AlertDialog = ({
  children,
  open,
}: React.PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) =>
  open !== undefined ? (
    open ? (
      <div data-testid="alert-dialog">{children}</div>
    ) : null
  ) : (
    <div data-testid="alert-dialog">{children}</div>
  )

export const AlertDialogTrigger = ({
  children,
  asChild,
}: React.PropsWithChildren<{ asChild?: boolean }>) => (asChild ? children : <div>{children}</div>)

export const AlertDialogAction = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>

export const AlertDialogCancel = ({ children }: React.PropsWithChildren) => (
  <button type="button">{children}</button>
)

export const AlertDialogContent = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const AlertDialogDescription = ({ children }: React.PropsWithChildren) => <p>{children}</p>

export const AlertDialogFooter = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const AlertDialogHeader = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const AlertDialogTitle = ({ children }: React.PropsWithChildren) => <h2>{children}</h2>

export const ContextMenu = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const ContextMenuTrigger = ({
  children,
}: React.PropsWithChildren<Record<string, unknown>>) => <div>{children}</div>

export const ContextMenuContent = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const ContextMenuItem = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => (
  <button type="button" role="menuitem" {...props}>
    {children}
  </button>
)

export const ContextMenuSeparator = () => <hr />

export const ContextMenuSub = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const ContextMenuSubTrigger = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => (
  <button type="button" {...props}>
    {children}
  </button>
)

export const ContextMenuSubContent = ({ children }: React.PropsWithChildren) => (
  <div>{children}</div>
)

export const DropdownMenu = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const DropdownMenuTrigger = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>

export const DropdownMenuContent = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const DropdownMenuItem = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => (
  <button type="button" role="menuitem" {...props}>
    {children}
  </button>
)

export const DropdownMenuSeparator = () => <hr />

export const DropdownMenuLabel = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const DropdownMenuSub = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const DropdownMenuSubTrigger = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => (
  <button type="button" {...props}>
    {children}
  </button>
)

export const DropdownMenuSubContent = ({ children }: React.PropsWithChildren) => (
  <div>{children}</div>
)

export const useInView = () => ({ ref: { current: null }, inView: true })

export const useReducedMotion = () => false

export const StatCounter = ({
  value,
  label,
}: {
  value?: number
  label?: string
  suffix?: string
  delay?: number
}) => (
  <div data-testid="stat-counter">
    <span>{value}</span>
    <span>{label}</span>
  </div>
)

export const Table = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
  <table {...props}>{children}</table>
)

export const TableHeader = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => <thead {...props}>{children}</thead>

export const TableBody = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => <tbody {...props}>{children}</tbody>

export const TableRow = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => <tr {...props}>{children}</tr>

export const TableHead = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => <th {...props}>{children}</th>

export const TableCell = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => <td {...props}>{children}</td>

export const TooltipProvider = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const Tooltip = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const TooltipTrigger = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>

export const TooltipContent = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const Separator = () => <hr data-slot="separator" />

export const Alert = ({
  children,
  variant,
  ...props
}: React.PropsWithChildren<{ variant?: string }>) => (
  <div role="alert" data-variant={variant} {...props}>
    {children}
  </div>
)

export const AlertTitle = ({ children }: React.PropsWithChildren) => <h5>{children}</h5>

export const AlertDescription = ({ children }: React.PropsWithChildren) => <div>{children}</div>

export const DestructiveConfirmDialog = ({
  open,
  title,
  description,
  impactSummary,
  confirmText,
  confirmLabel,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  impactSummary?: React.ReactNode
  confirmText: string
  confirmLabel?: string
  onConfirm: () => void
  isLoading?: boolean
}) =>
  open ? (
    <div data-testid="destructive-confirm-dialog">
      <h2>{title}</h2>
      <p>{description}</p>
      {confirmLabel && <p>{confirmLabel}</p>}
      {impactSummary}
      <input placeholder={confirmText} autoComplete="off" />
      <button type="button" onClick={onConfirm} disabled={isLoading}>
        {isLoading ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  ) : null

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmText,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  variant?: string
  confirmText: string
  onConfirm: () => void
  loading?: boolean
}) =>
  open ? (
    <div data-testid="confirm-dialog">
      <h2>{title}</h2>
      <p>{description}</p>
      <button type="button" onClick={onConfirm} disabled={loading}>
        {confirmText}
      </button>
    </div>
  ) : null

export const Textarea = (props: Record<string, unknown>) => <textarea {...props} />
