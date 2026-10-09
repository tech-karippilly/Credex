export function buildReceiptExtractionPrompt(
  categoryNames: string[],
  documentText?: string,
): string {
  const numberedCategories = categoryNames
    .map((name, index) => `${index + 1}. ${name}`)
    .join('\n');

  const textSection = documentText
    ? `\n\nReceipt text extracted from the document:\n${documentText.slice(0, 12000)}\n`
    : '';

  return `You are extracting structured expense information from a company receipt or invoice for an Indian company account book.
Extract only information clearly supported by the document. Do not invent missing information.
Return JSON only, with no markdown fences.

Available expense categories:
${numberedCategories}

Fields:
- expenseName (string or null)
- category (exact category name from the available expense categories list, or null)
- paidBy (who paid the expense — only if clearly stated on the receipt; do NOT assume the vendor/merchant is who paid; null if unknown)
- amount (final payable total in INR as a number, not a string; prefer Grand Total / Total / Amount Paid; null if unclear)
- currency ("INR" when clearly INR/₹, else null)
- date (transaction or invoice date as YYYY-MM-DD, or null)
- notes (brief optional context from the receipt, or null)
- confidence (number from 0 to 1 for overall extraction confidence, or omit)

Rules:
- amount must be numeric INR rupees (e.g. 5000 for ₹5,000).
- do not confuse subtotal, tax, discounts, or IDs with the final amount.
- choose category only from the available expense categories list.
- if a field cannot be confidently determined, use null.
${textSection}`;
}
