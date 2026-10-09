declare module 'mammoth' {
  interface MammothResult {
    value: string;
  }

  interface Mammoth {
    extractRawText(input: { buffer: Buffer }): Promise<MammothResult>;
  }

  const mammoth: Mammoth;
  export default mammoth;
}

declare module 'word-extractor' {
  interface WordDocument {
    getBody(): string;
  }

  export default class WordExtractor {
    extract(source: Buffer | string): Promise<WordDocument>;
  }
}

declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    text: string;
  }

  function pdfParse(dataBuffer: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}
