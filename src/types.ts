/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Timestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
  toMillis?: () => number;
}

export interface Notebook {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Section {
  id: string;
  notebookId: string;
  name: string;
  color: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Page {
  id: string;
  notebookId: string;
  sectionId: string;
  title: string;
  content: string; // Markdown / Styled text content
  favorite: boolean;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ExtractedOneNoteBlock {
  type: 'title' | 'heading' | 'text' | 'todo';
  content: string;
  checked?: boolean;
}

export interface ExtractedOneNotePage {
  title: string;
  blocks: ExtractedOneNoteBlock[];
  rawText: string;
}
