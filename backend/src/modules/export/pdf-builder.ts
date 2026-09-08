/**
 * Pure TypeScript Zero-Dependency PDF 1.4 Document Generator.
 * Conforms strictly to standard PDF specification with Helvetica Type 1 built-in fonts.
 */

export interface PdfTableColumn {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export class SimplePdfDocument {
  private pages: string[][] = [];
  private currentPageIndex = -1;
  private y = 750;
  private readonly leftMargin = 40;
  private readonly rightMargin = 572;
  private readonly pageWidth = 612;
  private readonly pageHeight = 792;
  private readonly bottomMargin = 45;

  constructor() {
    this.addPage();
  }

  public addPage(): void {
    this.pages.push([]);
    this.currentPageIndex = this.pages.length - 1;
    this.y = 745;
  }

  public getY(): number {
    return this.y;
  }

  public setY(newY: number): void {
    this.y = newY;
  }

  public checkPageBreak(requiredHeight: number): boolean {
    if (this.y - requiredHeight <= this.bottomMargin) {
      this.addPage();
      return true;
    }
    return false;
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private appendOp(op: string): void {
    this.pages[this.currentPageIndex].push(op);
  }

  /**
   * Draws a filled rectangle.
   */
  public drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    fillR: number,
    fillG: number,
    fillB: number
  ): void {
    this.appendOp(
      `${fillR.toFixed(3)} ${fillG.toFixed(3)} ${fillB.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`
    );
  }

  /**
   * Draws a bordered rectangle with optional fill.
   */
  public drawBorderedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    strokeR: number,
    strokeG: number,
    strokeB: number,
    lineWidth = 1,
    fillColor?: [number, number, number]
  ): void {
    let op = `${lineWidth.toFixed(2)} w ${strokeR.toFixed(3)} ${strokeG.toFixed(3)} ${strokeB.toFixed(3)} RG `;
    if (fillColor) {
      op += `${fillColor[0].toFixed(3)} ${fillColor[1].toFixed(3)} ${fillColor[2].toFixed(3)} rg `;
      op += `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`;
    } else {
      op += `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`;
    }
    this.appendOp(op);
  }

  /**
   * Draws a horizontal rule / divider.
   */
  public drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeR = 0.8,
    strokeG = 0.8,
    strokeB = 0.8,
    lineWidth = 1
  ): void {
    this.appendOp(
      `${lineWidth.toFixed(2)} w ${strokeR.toFixed(3)} ${strokeG.toFixed(3)} ${strokeB.toFixed(3)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`
    );
  }

  /**
   * Draws a single line of text.
   */
  public drawText(
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number;
      font?: 'F1' | 'F2'; // F1: Helvetica, F2: Helvetica-Bold
      r?: number;
      g?: number;
      b?: number;
      align?: 'left' | 'center' | 'right';
      width?: number;
    } = {}
  ): void {
    const fontSize = options.fontSize ?? 10;
    const font = options.font ?? 'F1';
    const r = options.r ?? 0;
    const g = options.g ?? 0;
    const b = options.b ?? 0;
    const align = options.align ?? 'left';
    const width = options.width ?? 0;

    let targetX = x;
    // Approximate Helvetica character width as 0.52 * fontSize
    const approxTextWidth = text.length * fontSize * 0.52;
    if (align === 'center' && width > 0) {
      targetX = x + Math.max(0, (width - approxTextWidth) / 2);
    } else if (align === 'right' && width > 0) {
      targetX = x + Math.max(0, width - approxTextWidth);
    }

    const safeText = this.escapeText(text);
    this.appendOp(
      `BT ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg /${font} ${fontSize} Tf 1 0 0 1 ${targetX.toFixed(2)} ${y.toFixed(2)} Tm (${safeText}) Tj ET`
    );
  }

  /**
   * Renders a table row with cells and borders.
   */
  public drawTableRow(
    columns: PdfTableColumn[],
    values: string[],
    y: number,
    height: number,
    options: {
      isHeader?: boolean;
      bgR?: number;
      bgG?: number;
      bgB?: number;
    } = {}
  ): void {
    let currentX = this.leftMargin;

    // Optional background fill
    if (options.bgR !== undefined && options.bgG !== undefined && options.bgB !== undefined) {
      const totalWidth = columns.reduce((acc, col) => acc + col.width, 0);
      this.drawRect(currentX, y, totalWidth, height, options.bgR, options.bgG, options.bgB);
    }

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const val = values[i] ?? '';
      const font = options.isHeader ? 'F2' : 'F1';
      const fontSize = options.isHeader ? 9 : 8.5;
      const textY = y + (height - fontSize) / 2 + 1;

      this.drawText(val, currentX + 4, textY, {
        fontSize,
        font,
        r: options.isHeader ? 0.95 : 0.15,
        g: options.isHeader ? 0.95 : 0.15,
        b: options.isHeader ? 0.95 : 0.15,
        align: col.align ?? 'left',
        width: col.width - 8,
      });

      currentX += col.width;
    }

    // Bottom border line
    const totalWidth = columns.reduce((acc, col) => acc + col.width, 0);
    this.drawLine(
      this.leftMargin,
      y,
      this.leftMargin + totalWidth,
      y,
      options.isHeader ? 0.2 : 0.88,
      options.isHeader ? 0.3 : 0.88,
      options.isHeader ? 0.4 : 0.88,
      options.isHeader ? 1.5 : 0.5
    );
  }

  /**
   * Compiles and builds the binary PDF buffer.
   */
  public build(): Buffer {
    const objects: string[] = [];
    const offsets: number[] = [];

    // PDF Header
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

    const addObject = (content: string): number => {
      const objId = objects.length + 1;
      offsets.push(Buffer.byteLength(pdf, 'utf-8'));
      const objStr = `${objId} 0 obj\n${content}\nendobj\n`;
      pdf += objStr;
      objects.push(objStr);
      return objId;
    };

    // 1. Catalog (Obj 1)
    // 2. Pages root (Obj 2)
    // 3. Font Helvetica (Obj 3)
    // 4. Font Helvetica-Bold (Obj 4)
    offsets.push(0); // placeholder for 1-based indexing

    const font1Id = 3;
    const font2Id = 4;
    const catalogId = 1;
    const pagesId = 2;

    const pageObjectIds: number[] = [];
    const contentObjectIds: number[] = [];

    // Precalculate object IDs:
    // Pages root is 2
    // Fonts are 3, 4
    // Then for each page, Page object is 5 + 2*i, Content stream is 6 + 2*i
    for (let i = 0; i < this.pages.length; i++) {
      pageObjectIds.push(5 + i * 2);
      contentObjectIds.push(6 + i * 2);
    }

    // Write Catalog (1)
    addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    // Write Pages (2)
    const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
    addObject(`<< /Type /Pages /Kids [${kidsStr}] /Count ${this.pages.length} >>`);

    // Write Fonts (3, 4)
    addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
    addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);

    // Write each Page and its Content stream
    for (let i = 0; i < this.pages.length; i++) {
      const pageOps = this.pages[i].join('\n');
      const contentBytes = Buffer.byteLength(pageOps, 'utf-8');

      // Page object
      addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> >> /Contents ${contentObjectIds[i]} 0 R >>`
      );

      // Content stream object
      addObject(`<< /Length ${contentBytes} >>\nstream\n${pageOps}\nendstream`);
    }

    // Cross-Reference Table
    const startXref = Buffer.byteLength(pdf, 'utf-8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i++) {
      const offset = offsets[i];
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }

    // Trailer
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
    pdf += `startxref\n${startXref}\n%%EOF\n`;

    return Buffer.from(pdf, 'utf-8');
  }
}
