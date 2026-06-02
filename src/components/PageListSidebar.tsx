/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { Page } from '../types';
import { 
  FileText, 
  Plus, 
  Search, 
  Star, 
  Trash2, 
  Calendar, 
  HelpCircle 
} from 'lucide-react';

export const PageListSidebar: React.FC = () => {
  const { 
    pages, 
    activeNotebookId, 
    activeSectionId, 
    activePageId, 
    setActivePageId, 
    createPage, 
    deletePage,
    updatePage
  } = useNotes();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStarred, setFilterStarred] = useState(false);

  // Filter pages matching currently active section & search queries
  const sectionPages = pages.filter((page) => {
    if (page.notebookId !== activeNotebookId || page.sectionId !== activeSectionId) {
      return false;
    }
    
    // Star filter
    if (filterStarred && !page.favorite) {
      return false;
    }

    // Search queries
    if (searchQuery.trim()) {
      const matchQuery = searchQuery.toLowerCase();
      const matchTitle = page.title?.toLowerCase().includes(matchQuery);
      const matchContent = page.content?.toLowerCase().includes(matchQuery);
      return matchTitle || matchContent;
    }

    return true;
  });

  const handleCreatePage = async () => {
    if (!activeNotebookId || !activeSectionId) return;
    try {
      const title = 'Untitled Note';
      const defaultContent = '# Untitled Note\n\nWrite your note content here in standard markdown structure...';
      await createPage(activeNotebookId, activeSectionId, title, defaultContent);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePage = async (id: string, title: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deletePage(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleFavorite = async (page: Page, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await updatePage(page.id, { favorite: !page.favorite });
    } catch (err) {
      console.error(err);
    }
  };

  // Human date formats
  const formatPageDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  };

  if (!activeSectionId) {
    return (
      <div className="w-72 bg-white border-r border-slate-200 shrink-0 flex flex-col justify-center items-center text-center p-6 text-slate-400 select-none">
        <HelpCircle size={24} className="mx-auto mb-2 text-slate-300" />
        <p className="text-xs font-semibold leading-relaxed">Select a section horizontally above to browse pages.</p>
      </div>
    );
  }

  return (
    <div id="pages-sidebar" className="w-72 bg-white border-r border-slate-200 shrink-0 flex flex-col h-full select-none">
      
      {/* Search box and Addition header */}
      <div className="p-3.5 border-b border-slate-200 space-y-3 shrink-0 bg-slate-50/30">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Page List</p>
          <button
            id="add-page"
            onClick={handleCreatePage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>Note Page</span>
          </button>
        </div>

        {/* Search input field widget */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search size={13} />
          </span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes here..."
            className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
          />
        </div>

        {/* Star visual Filters */}
        <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
          <button
            onClick={() => setFilterStarred(false)}
            className={`flex-1 py-1 text-center rounded-md font-bold transition-all cursor-pointer ${
              !filterStarred 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Notes
          </button>
          <button
            onClick={() => setFilterStarred(true)}
            className={`flex-1 py-1 text-center rounded-md font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              filterStarred 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Star size={11} className={filterStarred ? "fill-amber-400 text-amber-500" : ""} />
            <span>Starred</span>
          </button>
        </div>
      </div>

      {/* Pages list viewport */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/40">
        {sectionPages.length === 0 ? (
          <div className="text-center py-14 opacity-60 px-4">
            <FileText size={24} className="mx-auto text-slate-350 mb-2.5" />
            <p className="text-xs font-sans text-slate-500 font-bold leading-relaxed">
              {searchQuery ? 'No matched notes found.' : 'This section is empty. Create a page to begin drafting!'}
            </p>
          </div>
        ) : (
          sectionPages.map((page) => {
            const isActive = page.id === activePageId;
            const previewText = page.content
              ? page.content.replace(/#+\s?|^-\s\[[ xX]\]\s?|^-\s|[*`_#\[\]]/g, '').substring(0, 75).trim()
              : '';

            return (
              <div
                key={page.id}
                onClick={() => setActivePageId(page.id)}
                className={`group p-3 rounded-lg border transition-all duration-150 cursor-pointer flex flex-col gap-1.5 ${
                  isActive
                    ? 'bg-blue-50/75 border-blue-100 shadow-xs ring-1 ring-blue-100' 
                    : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200/80 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className={`text-xs font-bold leading-tight break-all ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                    {page.title || 'Untitled Note'}
                  </span>
                  
                  {/* Star Page item */}
                  <button
                    onClick={(e) => handleToggleFavorite(page, e)}
                    className="p-1 hover:bg-slate-100 rounded-sm hover:text-amber-500 text-slate-400"
                    title={page.favorite ? "Unstar note" : "Star note"}
                  >
                    <Star 
                      size={12} 
                      className={page.favorite ? "fill-amber-400 text-amber-500" : "text-slate-300 hover:text-slate-500"} 
                    />
                  </button>
                </div>

                {/* Sneak Peek text snippet */}
                {previewText && (
                  <p className="text-[11px] text-slate-500 font-sans leading-snug line-clamp-2">
                    {previewText}
                  </p>
                )}

                {/* Footer time and removal tools */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar size={10} className="text-slate-350" />
                    <span>{formatPageDate(page.updatedAt)}</span>
                  </span>

                  <button
                    onClick={(e) => handleDeletePage(page.id, page.title, e)}
                    className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Page"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
