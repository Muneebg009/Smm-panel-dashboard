export function csv(rows: (string | number | null)[][]): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = value === null ? "Unavailable" : String(value);
            if (
              !/^-?\d+(?:\.\d+)?$/.test(text) &&
              /^[\s]*[=+\-@\t\r]/.test(text)
            )
              text = "'" + text;
            return '"' + text.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
