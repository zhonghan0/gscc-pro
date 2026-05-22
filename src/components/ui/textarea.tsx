import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white placeholder:text-gray-400 resize-none',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:bg-gray-50 disabled:text-gray-500',
        className
      )}
      {...props}
    />
  )
)

Textarea.displayName = 'Textarea'
