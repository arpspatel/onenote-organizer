/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExtractedOneNotePage, ExtractedOneNoteBlock } from './types';

/**
 * Parses a raw .one format binary file client-side by scanning for UTF-16LE encoded strings.
 * OneNote (.one) files store individual text elements (page titles, paragraph texts, outlines) 
 * as UTF-16LE strings alongside object space metadata.
 */
export function parseOneNoteFile(arrayBuffer: ArrayBuffer): ExtractedOneNotePage {
  const bytes = new Uint8Array(arrayBuffer);
  const detectedStrings: string[] = [];
  
  let tempChars: number[] = [];
  let index = 0;
  
  while (index < bytes.length - 1) {
    const b0 = bytes[index];
    const b1 = bytes[index + 1];
    
    // Check if the current byte pair constitutes a valid printable UTF-16LE character.
    // ASCII range printable: 32 (space) to 126 (~), or tab (9), LF (10), CR (13), 
    // or standard extended Latin chars (e.g. 192 - 255) with high byte being 0.
    const isPrintableAscii = (b0 >= 32 && b0 <= 126) || b0 === 9 || b0 === 10 || b0 === 13;
    const isExtendedLatin = (b0 >= 160 && b0 <= 255);
    const isValidUtf16Letter = (isPrintableAscii || isExtendedLatin) && b1 === 0;
    
    if (isValidUtf16Letter) {
      tempChars.push(b0);
      index += 2;
    } else {
      // If we hit a non-character and have a decent size string, save it.
      if (tempChars.length >= 5) {
        // Convert collected bytes to a UTF-8 string (since the low bytes of UTF-16LE ASCII maps 1-to-1 to standard strings)
        const str = String.fromCharCode(...tempChars).trim();
        
        // Exclude system metrics, hex-looking GUIDs, and metadata noise
        if (isValidContentString(str)) {
          detectedStrings.push(str);
        }
      }
      tempChars = [];
      index += 2;
    }
  }
  
  // Handle remaining characters at completion
  if (tempChars.length >= 5) {
    const str = String.fromCharCode(...tempChars).trim();
    if (isValidContentString(str)) {
      detectedStrings.push(str);
    }
  }
  
  // Deduplicate and filter strings to maintain quality
  const filteredStrings = deduplicateAndClean(detectedStrings);
  
  // Distribute strings into styled blocks
  const blocks: ExtractedOneNoteBlock[] = [];
  let title = 'Imported OneNote Page';
  
  if (filteredStrings.length > 0) {
    // Proactively assume the first non-trivial line is the page title
    title = filteredStrings[0];
    
    // The rest of the elements will populate the page data as standard list or paragraph blocks
    for (let i = 1; i < filteredStrings.length; i++) {
      const content = filteredStrings[i];
      let type: 'title' | 'heading' | 'text' | 'todo' = 'text';
      let checked: boolean | undefined;
      
      // Basic heuristic to identify checklist items or headers
      if (content.startsWith('[ ]') || content.startsWith('☐')) {
        type = 'todo';
        checked = false;
      } else if (content.startsWith('[x]') || content.startsWith('[X]') || content.startsWith('☑')) {
        type = 'todo';
        checked = true;
      } else if (content.length < 50 && (content.endsWith(':') || content.match(/^[A-Z0-9\s]+$/))) {
        type = 'heading';
      }
      
      blocks.push({
        type,
        content: content.replace(/^\[[ xX]\]\s?|^☐\s?|^☑\s?/, ''),
        checked
      });
    }
  }
  
  return {
    title,
    blocks,
    rawText: filteredStrings.join('\n\n')
  };
}

/**
 * Filter rules to remove GUID keys, system metadata parameters, and formatting strings.
 */
function isValidContentString(str: string): boolean {
  // Ignore empty strings, pure whitespace or line break symbols
  const clean = str.replace(/[\r\n\t]/g, '').trim();
  if (clean.length < 5) return false;
  
  // Block string identifiers that resemble standard GUID configurations: e.g. {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}
  const isGuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(clean) ||
                 /^\{[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\}$/i.test(clean);
  if (isGuid) return false;
  
  // Block common technical tags inside OneNote schema files
  const isInternalTag = clean.includes('Oasis') || 
                        clean.includes('one:') || 
                        clean.includes('onestore:') || 
                        clean.includes('Microsoft Word') ||
                        clean.includes('InkWord') ||
                        clean.includes('OneNoteTable') ||
                        clean.startsWith('__') ||
                        clean.includes('Segoe UI') ||
                        clean.includes('Calibri') ||
                        clean.includes('Arial') ||
                        clean.includes('Times New Roman') ||
                        clean.includes('mso-') ||
                        clean.startsWith('Font') ||
                        clean.includes('Normal Text') ||
                        clean.includes('Format') ||
                        clean.includes('Content-Type');
  if (isInternalTag) return false;
  
  // Filter out hex dumps or purely symbol-based structures
  const isHexDump = /^[a-f0-9\s]{10,}$/i.test(clean);
  if (isHexDump) return false;
  
  return true;
}

/**
 * Deduplicate items while retaining array order, cleaning up double spaces or raw carriage feeds.
 */
function deduplicateAndClean(items: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  
  for (const item of items) {
    const clean = item.replace(/\s+/g, ' ').trim();
    if (clean.length >= 4 && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      result.push(clean);
    }
  }
  
  return result;
}
