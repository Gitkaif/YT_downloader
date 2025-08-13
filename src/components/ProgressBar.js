export default function ProgressBar({
  value = 0,
  indeterminate = false,
  className = "",
  style,
}) {
  const normalizedValue = Math.max(0, Math.min(100, Number(value) || 0));
  const classes = ["progress", indeterminate ? "progress-indeterminate" : "", className]
    .filter(Boolean)
    .join(" ");

  const ariaProps = indeterminate ? {} : { "aria-valuenow": normalizedValue };

  return (
    <div
      className={classes}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      {...ariaProps}
      style={style}
    >
      {!indeterminate && (
        <div className="progress-inner" style={{ width: `${normalizedValue}%` }} />
      )}
    </div>
  );
}


