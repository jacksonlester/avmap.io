import React from 'react';
import CreatableSelect from 'react-select/creatable';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface CreatableSingleProps {
  options: string[];
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

interface CreatableMultiProps {
  options: string[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: 'hsl(var(--background))',
    borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--border))',
    borderRadius: '6px',
    borderWidth: '1px',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring))' : 'none',
    minHeight: '40px',
    '&:hover': {
      borderColor: 'hsl(var(--border))',
    },
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    zIndex: 50,
  }),
  menuList: (base: any) => ({
    ...base,
    padding: '4px',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused 
      ? 'hsl(var(--accent))' 
      : state.isSelected 
        ? 'hsl(var(--primary))' 
        : 'transparent',
    color: state.isSelected 
      ? 'hsl(var(--primary-foreground))' 
      : 'hsl(var(--foreground))',
    borderRadius: '4px',
    margin: '1px 0',
    '&:active': {
      backgroundColor: 'hsl(var(--accent))',
    },
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: 'hsl(var(--secondary))',
    borderRadius: '4px',
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: 'hsl(var(--secondary-foreground))',
    fontSize: '14px',
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: 'hsl(var(--secondary-foreground))',
    '&:hover': {
      backgroundColor: 'hsl(var(--destructive))',
      color: 'hsl(var(--destructive-foreground))',
    },
  }),
  placeholder: (base: any) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
  }),
  singleValue: (base: any) => ({
    ...base,
    color: 'hsl(var(--foreground))',
  }),
  input: (base: any) => ({
    ...base,
    color: 'hsl(var(--foreground))',
  }),
};

export function CreatableSingle({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select or type to create...",
  className 
}: CreatableSingleProps) {
  const selectOptions: Option[] = options.map(opt => ({ value: opt, label: opt }));
  const selectedOption = value ? { value, label: value } : null;

  return (
    <CreatableSelect
      className={cn("react-select-container", className)}
      classNamePrefix="react-select"
      options={selectOptions}
      value={selectedOption}
      onChange={(option: Option | null) => onChange(option?.value || null)}
      placeholder={placeholder}
      isClearable
      styles={selectStyles}
      formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
    />
  );
}

export function CreatableMulti({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select or type to create...",
  className 
}: CreatableMultiProps) {
  const selectOptions: Option[] = options.map(opt => ({ value: opt, label: opt }));
  const selectedOptions = value.map(val => ({ value: val, label: val }));

  return (
    <CreatableSelect
      className={cn("react-select-container", className)}
      classNamePrefix="react-select"
      options={selectOptions}
      value={selectedOptions}
      onChange={(options: Option[]) => onChange(options.map(opt => opt.value))}
      placeholder={placeholder}
      isMulti
      isClearable
      styles={selectStyles}
      formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
    />
  );
}