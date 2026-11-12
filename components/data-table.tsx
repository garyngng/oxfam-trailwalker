import { useId, type CSSProperties, type ReactNode } from "react";

export function DataTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: { key: string; className?: string; cells: ReactNode[] }[];
}) {
  const captionId = useId();
  const style = Object.fromEntries(
    headers.map((header, index) => [`--label-${index + 1}`, JSON.stringify(header)]),
  ) as CSSProperties;

  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-labelledby={captionId}>
      <table className="stack-table" style={style}>
        <caption id={captionId}>{caption}</caption>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.className}>
              {row.cells.map((cell, index) =>
                index === 0 ? (
                  <th key={headers[index]} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={headers[index]}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
