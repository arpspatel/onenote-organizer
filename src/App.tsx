/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NotesProvider, useNotes } from './context/NotesContext';
import { NotebooksSidebar } from './components/NotebooksSidebar';
import { SectionsTabs } from './components/SectionsTabs';
import { PageListSidebar } from './components/PageListSidebar';
import { EditorView } from './components/EditorView';
import { ImporterModal } from './components/ImporterModal';
import { AlertCircle, Cloud, ArrowUpRight, Ban, X, Sparkles, BookMarked } from 'lucide-react';

function ApplicationLayout() {
  const { 
    activeNotebookId,
    activeSectionId,
    notebooks
  } = useNotes();

  const [importerOpen, setImporterOpen] = useState(false);

  return (
    <div id="app-root" className="h-screen w-screen flex overflow-hidden font-sans bg-slate-50 text-slate-800 antialiased selection:bg-blue-100 select-none">
      
      {/* 1. Notebooks sidebar Panel */}
      <NotebooksSidebar />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* 2. Top sloped toolbar containing classic notebook section tabs */}
        <SectionsTabs onOpenImporter={() => setImporterOpen(true)} />

        {/* 3. Central horizontal workspace split */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
          
          {notebooks.length === 0 ? (
            /* First Start Workspace Tutorial Board */
            <div className="flex-1 bg-slate-50/40 flex flex-col justify-center items-center p-8 text-center animate-fadeIn select-none">
              <div className="p-4 bg-blue-50 text-blue-650 rounded-2xl mb-4.5 shadow-sm">
                <BookMarked size={40} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-2">Welcome to OneNote Companion Workspace!</h2>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-6 font-semibold">
                Get started by building a notebook in the left sidebar directory panel, or click and drop a <strong>.one file</strong> above to instantly import existing notes!
              </p>
              <div className="flex items-center gap-3.5">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold bg-white p-2 border border-slate-205 rounded-lg shadow-xs">
                  <span>🚀 Offline-First IndexedDB Caching (No login required)</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold bg-white p-2 border border-slate-205 rounded-lg shadow-xs">
                  <span>📁 Auto-saving Pages directly as Markdown (.md)</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Pages side column indices */}
              <PageListSidebar />

              {/* Active notebook note page workspace canvas */}
              <EditorView />
            </>
          )}

        </div>

      </div>

      {/* 4. OneNote Backup Importer dialog overlay */}
      {importerOpen && (
        <ImporterModal onClose={() => setImporterOpen(false)} />
      )}

    </div>
  );
}

export default function App() {
  return (
    <NotesProvider>
      <ApplicationLayout />
    </NotesProvider>
  );
}
