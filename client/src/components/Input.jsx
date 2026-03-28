import { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  className = '',
  type = 'text',
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`
          w-full px-4 py-2.5
          bg-zinc-800 border border-zinc-700 rounded-lg
          text-zinc-100 placeholder-zinc-500
          transition-colors
          focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export const Textarea = forwardRef(({
  label,
  error,
  className = '',
  rows = 4,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={`
          w-full px-4 py-2.5
          bg-zinc-800 border border-zinc-700 rounded-lg
          text-zinc-100 placeholder-zinc-500
          transition-colors resize-none
          focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Input;
