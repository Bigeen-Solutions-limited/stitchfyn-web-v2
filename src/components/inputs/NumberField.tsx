import React, { useState } from 'react';
import { TextField, type TextFieldProps, alpha } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#fff',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
    '& fieldset': {
      borderColor: alpha('#000', 0.1),
    },
    '&:hover fieldset': {
      borderColor: theme.palette.secondary.main,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.secondary.main,
      borderWidth: '2px',
    },
  },
  '& .MuiInputBase-input': {
    fontWeight: 700,
    fontSize: '1rem',
    /* Hide the number spinners in Chrome, Safari and Edge */
    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
      WebkitAppearance: 'none',
      margin: 0,
    },
    /* and in Firefox */
    '&[type=number]': {
      MozAppearance: 'textfield',
    },
  },
}));

interface NumberFieldProps extends Omit<TextFieldProps, 'onChange'> {
  onChange?: (value: number | "") => void;
  onEnter?: () => void;
  max?: number;
  min?: number;
}

// What the box shows for a value from the parent: 0, empty and NaN all show as an empty box
function toText(value: unknown): string {
  if (value === undefined || value === null || value === '' || value === 0) return '';
  const text = String(value);
  return text === 'NaN' ? '' : text;
}

// The number a piece of text stands for; "", "." and other partial input count as empty
function toNumber(text: string): number | '' {
  const n = parseFloat(text);
  return Number.isFinite(n) ? n : '';
}

// Keeps what the user typed (so "12." and "." stay on screen) and tells the parent only the number it adds up to
export const NumberField = React.forwardRef<HTMLDivElement, NumberFieldProps>((props, ref) => {
  const { onChange, onEnter, value, ...rest } = props;
  const [text, setText] = useState(() => toText(value));
  const [lastValue, setLastValue] = useState(value);

  // Follow changes made outside the box (the on-screen keypad, a clear button), but not echoes of our own typing
  if (value !== lastValue) {
    setLastValue(value);
    if (toNumber(toText(value)) !== toNumber(text)) setText(toText(value));
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && onEnter) {
      onEnter();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Digits and at most one decimal point; anything else is ignored
    if (!/^[0-9]*\.?[0-9]*$/.test(val)) return;
    setText(val);
    onChange?.(toNumber(val));
  };

  return (
    <StyledTextField
      {...rest}
      ref={ref}
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      autoComplete="off"
      type="text" // text plus our own check, to avoid the browser's number-input quirks
      inputProps={{
        inputMode: 'decimal',
        onWheel: (e: any) => e.target.blur(), // stop the mouse wheel changing the value
        ...rest.inputProps,
      }}
    />
  );
});

NumberField.displayName = 'NumberField';
