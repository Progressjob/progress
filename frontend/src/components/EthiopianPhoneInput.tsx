import React from 'react';
import { toEthiopianLocalDigits } from '../utils/ethiopianPhone';

export interface EthiopianPhoneInputProps {
  id?: string;
  value: string;
  onChange: (e164OrLocalDisplay: string) => void;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  'aria-label'?: string;
}

/**
 * Fixed +251 country code with a 9-digit Ethiopian mobile field (7/9…).
 * `value` / `onChange` use full E.164 (`+2519…`) when complete, otherwise local digits while typing.
 */
export const EthiopianPhoneInput: React.FC<EthiopianPhoneInputProps> = ({
  id,
  value,
  onChange,
  required,
  disabled,
  readOnly,
  name,
  className,
  inputClassName,
  placeholder = '9XX XXX XXX',
  'aria-label': ariaLabel,
}) => {
  const local = toEthiopianLocalDigits(value);

  return (
    <div className={`et-phone ${className ?? ''}`.trim()}>
      <span className="et-phone-prefix" aria-hidden="true">
        +251
      </span>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        className={inputClassName}
        aria-label={ariaLabel ?? 'Ethiopian mobile number'}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        minLength={required ? 9 : undefined}
        maxLength={9}
        pattern="[79][0-9]{8}"
        title="Enter a 9-digit Ethiopian mobile number starting with 7 or 9"
        value={local}
        onChange={(e) => {
          const nextLocal = toEthiopianLocalDigits(e.target.value);
          onChange(nextLocal.length === 9 ? `+251${nextLocal}` : nextLocal);
        }}
      />
    </div>
  );
};
