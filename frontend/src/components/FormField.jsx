export default function FormField({
  label,
  type = "text",
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  required = false,
  error,
  hint,
  as = "input",
  children,
  ...rest
}) {
  return (
    <label className="field">
      <span className="field__label field__label--between">
        <span>{label}</span>
        {hint}
      </span>

      {as === "select" ? (
        <select
          className="field__input"
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          required={required}
          {...rest}
        >
          {children}
        </select>
      ) : (
        <input
          className="field__input"
          type={type}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          {...rest}
        />
      )}

      {error && <span className="field__error">{error}</span>}
    </label>
  );
}
