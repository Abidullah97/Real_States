export type ColumnDatum = { key: string; label: string; value: number; detail?: string };

/** Rounds the axis maximum up so the midline gridline is a whole, readable number. */
function niceMax(max: number) {
  if (max <= 1) return 2;
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((n) => n >= max) ?? max;
  return nice % 2 === 0 ? nice : Math.ceil(max / 2) * 2;
}

/**
 * Single-series column chart: thin bars on a baseline, hover/focus tooltip per bar,
 * selective direct labels (peak and latest) and a screen-reader data table.
 */
export function ColumnChart({ data, caption, unit = "" }: { data: ColumnDatum[]; caption: string; unit?: string }) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);
  const dense = data.length > 14;
  return (
    <figure className="bar-chart">
      <div className="bar-chart-plot" aria-hidden="true">
        {[1, 0.5].map((f) => (
          <span key={f} className="bar-chart-grid" style={{ bottom: `${f * 100}%` }}>
            <span className="num">{Math.round(max * f).toLocaleString("en-US")}</span>
          </span>
        ))}
        {data.map((d, i) => (
          <div key={d.key} className="bar-chart-col" tabIndex={0} aria-label={`${d.label}: ${d.value}${unit}`}>
            <span className="bar-chart-tip">
              <strong className="num">
                {d.value.toLocaleString("en-US")}
                {unit}
              </strong>{" "}
              {d.detail || d.label}
            </span>
            {(i === peak || i === data.length - 1) && d.value > 0 && (
              <span className="bar-chart-value num" style={{ bottom: `calc(${(d.value / max) * 100}% + 4px)` }}>
                {d.value.toLocaleString("en-US")}
              </span>
            )}
            <span className="bar-chart-bar" style={{ height: `${(d.value / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="bar-chart-axis" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.key}>{!dense || i % 2 === 0 ? d.label : ""}</span>
        ))}
      </div>
      <table className="visually-hidden">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.detail || d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal bars for distributions (category, listing type). Labels and values are text, never colour alone. */
export function BarList({ data, caption }: { data: { label: string; count: number }[]; caption: string }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const max = Math.max(1, ...data.map((d) => d.count));
  if (!total) return <p className="panel-empty">No data in this period.</p>;
  return (
    <ul className="bar-list" aria-label={caption}>
      {data.map((d) => (
        <li key={d.label}>
          <div className="bar-list-row">
            <span>{d.label}</span>
            <span className="num">
              {d.count.toLocaleString("en-US")} <span className="bar-list-pct">· {Math.round((d.count / total) * 100)}%</span>
            </span>
          </div>
          <span className="bar-list-track" aria-hidden="true">
            <span className="bar-list-fill" style={{ width: `${(d.count / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "2026-10" → "Oct" (or "Oct 26" when the range spans years). */
export function monthLabel(key: string, withYear = false) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-GB", withYear ? { month: "short", year: "2-digit" } : { month: "short" });
}
