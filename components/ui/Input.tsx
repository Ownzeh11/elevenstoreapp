import React from 'react';
import { Search } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'file';
  className?: string;
  containerClassName?: string;
  leftIcon?: React.ElementType;
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  type = 'text',
  className = '',
  containerClassName = '',
  leftIcon: LeftIcon,
  ...props
}) => {
  const baseStyles = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm';
  const paddingLeft = (LeftIcon || type === 'search') ? 'pl-10' : 'pl-3';
  const paddingRight = 'pr-3';

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <LeftIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
        )}
        {type === 'search' && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
        )}
        <input
          type={type === 'search' ? 'text' : type}
          id={id}
          className={`${baseStyles} ${paddingLeft} ${paddingRight} py-2 ${className}`}
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;
