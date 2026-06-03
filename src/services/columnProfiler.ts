import type { ColumnProfile, ColumnType, SpreadsheetRow } from '../types/dataset';

// ─── Binary pattern sets ────────────────────────────────────────────────────

const BINARY_VALUE_SETS: ReadonlyArray<ReadonlySet<string>> = [
  new Set(['yes', 'no']),
  new Set(['true', 'false']),
  new Set(['1', '0']),
  new Set(['active', 'inactive']),
  new Set(['enabled', 'disabled']),
  new Set(['male', 'female']),
  new Set(['present', 'absent']),
  new Set(['on', 'off']),
  new Set(['y', 'n']),
  new Set(['open', 'closed']),
  new Set(['pass', 'fail']),
  new Set(['approved', 'rejected']),
  new Set(['yes', 'no', 'n/a']),
  new Set(['m', 'f']),
];

function checkBinary(uniqueLower: string[]): boolean {
  const nonEmpty = uniqueLower.filter(v => v !== '');
  if (nonEmpty.length === 0 || nonEmpty.length > 3) return false;
  const valueSet = new Set(nonEmpty);
  return BINARY_VALUE_SETS.some(pattern => [...valueSet].every(v => (pattern as Set<string>).has(v)));
}

// ─── Type detection helpers ─────────────────────────────────────────────────

function checkCategory(uniqueCount: number, rowCount: number): boolean {
  if (uniqueCount < 2) return false;
  // Category: unique values are few relative to total rows
  const absoluteCap = 30;
  const relativeCap = Math.max(absoluteCap, Math.floor(rowCount * 0.05));
  return uniqueCount <= Math.min(relativeCap, 100);
}

function checkIdLike(nonBlank: string[], uniqueCount: number): boolean {
  if (nonBlank.length < 3) return false;
  const uniqueRatio = uniqueCount / nonBlank.length;
  if (uniqueRatio < 0.85) return false;
  // IDs are short, no multiple whitespace, look like codes
  const qualifying = nonBlank.filter(v => v.length > 0 && v.length < 60 && !/\s{2,}/.test(v));
  return qualifying.length / nonBlank.length > 0.9;
}

function checkNumeric(nonBlank: string[]): boolean {
  if (nonBlank.length === 0) return false;
  const count = nonBlank.filter(v => !isNaN(Number(v.replace(/[$,%\s]/g, '')))).length;
  return count / nonBlank.length > 0.8;
}

const DATE_RE = /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}|\b\d{1,2}[ -](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

function checkDate(nonBlank: string[]): boolean {
  if (nonBlank.length === 0) return false;
  const count = nonBlank.filter(v => DATE_RE.test(v)).length;
  return count / nonBlank.length > 0.7;
}

// ─── Main profiler ──────────────────────────────────────────────────────────

export function profileColumns(rows: SpreadsheetRow[], columns: string[]): ColumnProfile[] {
  const rowCount = rows.length;

  return columns.map((columnName): ColumnProfile => {
    const allValues = rows.map(r => String(r[columnName] ?? '').trim());
    const nonBlank = allValues.filter(v => v !== '');
    const blankCount = allValues.length - nonBlank.length;
    const blankPercentage = rowCount > 0 ? Math.round((blankCount / rowCount) * 100) : 0;

    const uniqueNonBlank = [...new Set(nonBlank)];
    const uniqueLower = [...new Set(nonBlank.map(v => v.toLowerCase()))];
    const uniqueCount = uniqueNonBlank.length;
    const sampleValues = uniqueNonBlank.slice(0, 5);

    let detectedType: ColumnType;
    let warningMessage: string | undefined;
    let isRecommendedSearchable = true;

    if (blankPercentage > 60 || uniqueCount === 0) {
      detectedType = 'mostly-blank';
      warningMessage = uniqueCount === 0
        ? 'No values found in this column'
        : `${blankPercentage}% of values are empty`;
      isRecommendedSearchable = false;
    } else if (uniqueCount === 1) {
      detectedType = 'category';
      warningMessage = 'Only one unique value — not useful to search';
      isRecommendedSearchable = false;
    } else if (checkBinary(uniqueLower)) {
      detectedType = 'binary';
    } else if (checkCategory(uniqueCount, rowCount)) {
      detectedType = 'category';
    } else if (checkIdLike(nonBlank, uniqueCount)) {
      detectedType = 'id-like';
    } else if (checkNumeric(nonBlank)) {
      detectedType = 'number';
    } else if (checkDate(nonBlank)) {
      detectedType = 'date';
    } else {
      detectedType = 'text';
    }

    // Provide dropdown values for binary and category columns
    const suggestedValues: string[] =
      detectedType === 'binary' || detectedType === 'category'
        ? [...uniqueNonBlank].sort()
        : [];

    return {
      columnName,
      detectedType,
      uniqueValueCount: uniqueCount,
      blankCount,
      blankPercentage,
      sampleValues,
      suggestedValues,
      isRecommendedSearchable,
      warningMessage,
    };
  });
}

// ─── Autocomplete ────────────────────────────────────────────────────────────

/**
 * Returns up to `limit` unique values from `column` that contain `query`.
 * Results are ordered by first appearance in the dataset.
 */
export function getAutocomplete(
  rows: SpreadsheetRow[],
  column: string,
  query: string,
  limit = 50,
): string[] {
  const q = query.toLowerCase().trim();
  const seen = new Set<string>();
  const results: string[] = [];

  for (const row of rows) {
    const val = String(row[column] ?? '').trim();
    if (val && !seen.has(val) && (q === '' || val.toLowerCase().includes(q))) {
      seen.add(val);
      results.push(val);
      if (results.length >= limit) break;
    }
  }

  return results;
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export const COLUMN_TYPE_LABEL: Record<string, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  'mostly-blank': 'Mostly empty',
  binary: 'Yes / No',
  category: 'Category',
  'id-like': 'ID',
  mixed: 'Mixed',
};
