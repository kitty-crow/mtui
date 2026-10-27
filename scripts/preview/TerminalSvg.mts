interface Style { colour: string; bold: boolean; inverse: boolean }

/** Renders actual ANSI frames as portable, searchable documentation images. */
export class TerminalSvg {
  private readonly background = '#0D1520';
  private readonly foreground = '#E5EDF5';
  private readonly cell = 8.4;

  public render(frame: string, columns: number, title: string): string {
    const lines = frame.split('\n');
    const width = columns * this.cell + 40;
    const height = lines.length * 18 + 64;
    const style: Style = { colour: this.foreground, bold: false, inverse: false };
    const rows = lines.map((line, index) => this.line(line, index * 18 + 53, style)).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${this.xml(title)}">
<rect width="${width}" height="${height}" rx="12" fill="${this.background}"/>
<path d="M0 30H${width}" stroke="#25384A"/>
<circle cx="18" cy="15" r="4" fill="#F1848C"/><circle cx="34" cy="15" r="4" fill="#F0C77B"/><circle cx="50" cy="15" r="4" fill="#72D6AC"/>
<text x="${width / 2}" y="20" text-anchor="middle" fill="#94A3B8" font-family="DejaVu Sans Mono,monospace" font-size="12">${this.xml(title)}</text>
<g font-family="DejaVu Sans Mono,monospace" font-size="14" xml:space="preserve">${rows}</g></svg>\n`;
  }

  private line(line: string, y: number, style: Style): string {
    const pattern = /\x1b\[([0-9;]*)m/g;
    let offset = 0;
    let x = 20;
    let output = '';
    const append = (text: string): void => {
      const width = Bun.stringWidth(text) * this.cell;
      if (width === 0) return;
      const foreground = style.inverse ? this.background : style.colour;
      const background = style.inverse ? `<rect x="${x}" y="${y - 14}" width="${width}" height="18" fill="${style.colour}"/>` : '';
      output += `${background}<text x="${x}" y="${y}" fill="${foreground}" font-weight="${style.bold ? 'bold' : 'normal'}" textLength="${width}" lengthAdjust="spacingAndGlyphs">${this.xml(text)}</text>`;
      x += width;
    };
    for (const match of line.matchAll(pattern)) {
      append(line.slice(offset, match.index));
      this.sgr((match[1] || '0').split(';').map(Number), style);
      offset = match.index + match[0].length;
    }
    append(line.slice(offset));
    return output;
  }

  private sgr(codes: readonly number[], style: Style): void {
    for (let index = 0; index < codes.length; index++) {
      const code = codes[index];
      if (code === 0) Object.assign(style, { colour: this.foreground, bold: false, inverse: false });
      if (code === 1) style.bold = true;
      if (code === 22) style.bold = false;
      if (code === 7) style.inverse = true;
      if (code === 27) style.inverse = false;
      if (code === 39) style.colour = this.foreground;
      if (code === 38 && codes[index + 1] === 2) { style.colour = `rgb(${codes.slice(index + 2, index + 5).join(',')})`; index += 4; }
    }
  }

  private xml(value: string): string { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
}
