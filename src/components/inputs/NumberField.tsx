import React from 'react';
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

export const NumberField = React.forwardRef<HTMLDivElement, NumberFieldProps>((props, ref) => {
  const { onChange, onEnter, value, ...rest } = props;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && onEnter) {
      onEnter();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
        onChange?.("");
        return;
    }

    // Digits and at most one decimal point
    const match = val.match(/^[0-9]*\.?[0-9]*$/);
    if (match) {
        onChange?.(parseFloat(val));
    }
  };

  return (
    <StyledTextField
      {...rest}
      ref={ref}
      value={value === 0 ? "" : value} // show an empty box rather than 0
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
