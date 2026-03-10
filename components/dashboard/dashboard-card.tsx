import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface DashboardCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  description?: string
  footerRight?: ReactNode
  status?: 'success' | 'warning' | 'error' | 'neutral'
  className?: string
}

export default function DashboardCard({
  title,
  value,
  icon: Icon,
  description,
  footerRight,
  status = 'neutral',
  className,
}: DashboardCardProps) {
  const statusColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
    neutral: 'text-primary',
  }

  const bgStyles = {
    success: 'bg-green-50/50 dark:bg-green-950/10',
    warning: 'bg-amber-50/50 dark:bg-amber-950/10',
    error: 'bg-red-50/50 dark:bg-red-950/10',
    neutral: 'bg-primary/5 dark:bg-primary/10',
  }

  return (
    <Card
      className={`group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/20 ${className}`}
    >
      <div
        className={`absolute top-0 right-0 p-3 opacity-10 transition-transform group-hover:scale-110 group-hover:opacity-20 ${statusColors[status]}`}
      >
        {Icon && <Icon className="size-16" />}
      </div>

      <CardContent className="px-6 pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          {Icon && (
            <div
              className={`p-2 rounded-lg ${bgStyles[status]} ${statusColors[status]}`}
            >
              <Icon className="size-5" />
            </div>
          )}
        </div>

        <div className="flex min-h-24 flex-col gap-1">
          <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {description}
            </p>
          )}

          {footerRight && (
            <div className="mt-auto flex justify-end pt-3">{footerRight}</div>
          )}
        </div>
      </CardContent>

      <div
        className={`absolute bottom-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
      />
    </Card>
  )
}
