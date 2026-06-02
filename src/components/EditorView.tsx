/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNotes } from '../context/NotesContext';
import { 
  Save, 
  Eye, 
  Edit3, 
  Heading1, 
  Heading2, 
  Bold, 
  Italic, 
  List, 
  CheckSquare, 
  FileText, 
  BookMarked,
  Code
} from 'lucide-react';

export const EditorView: React.FC = () => {
  const { 
    pages, 
    activePageId, 
    updatePage, 
    isOnline,
    user 
  } = useNotes();

  const activePage = pages.find((p) => p.id === activePageId);

  // Buffer variables to prevent excessive remote rewrites on every keystroke
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Status: 'idle' | 'changed' | 'saving' | 'saved'
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Tab: 'edit' | 'preview'
  const [currentTab, setCurrentTab] = useState<'edit' | 'preview'>('edit');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync internal state whenever active page shifts
  useEffect(() => {
    if (activePage) {
      setTitle(activePage.title || '');
      setContent(activePage.content || '');
      setSaveStatus('idle');
    }
  }, [activePageId]);

  // Debounced auto-save engine on modifications
  const triggerAutoSave = (updatedTitle: string, updatedContent: string) => {
    if (!activePageId) return;
    setSaveStatus('saving');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      try {
        await updatePage(activePageId, {
          title: updatedTitle,
          content: updatedContent
        });
        setSaveStatus('saved');
        // Transition back to idle after a pleasant brief visual frame
        setTimeout(() => setSaveStatus('idle'), 1500);
      } catch (err) {
        console.error('AutoSave failed:', err);
        setSaveStatus('idle');
      }
    }, 850); // 850ms debounced window
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerAutoSave(val, content);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerAutoSave(title, val);
  };

  // Immediate save trigger on blur/manual click
  const forceSave = async () => {
    if (!activePageId) return;
    setSaveStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    
    try {
      await updatePage(activePageId, { title, content });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
    }
  };

  // Cleaning timer hooks
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Quick toolbar helper inserts symbols at active select selection
  const insertMarkdownPattern = (prefix: string, suffix = '') => {
    const txtarea = textareaRef.current;
    if (!txtarea) return;

    const start = txtarea.selectionStart;
    const end = txtarea.selectionEnd;
    const currentText = txtarea.value;

    const selectedPart = currentText.substring(start, end);
    const replacement = prefix + (selectedPart || 'text') + suffix;

    const newContent = currentText.substring(0, start) + replacement + currentText.substring(end);
    setContent(newContent);
    triggerAutoSave(title, newContent);

    // Re-focus and update cursor selection coordinates
    setTimeout(() => {
      txtarea.focus();
      txtarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedPart || 'text').length
      );
    }, 50);
  };

  // Custom client markdown element parsing
  const renderMarkdownPreview = (textValue: string) => {
    if (!textValue.trim()) {
      return <p className="italic text-gray-400 text-sm">Empty note page content. Tap write to start taking notes.</p>;
    }

    const lines = textValue.split('\n');
    let insideCodeBlock = false;
    let codeContent: string[] = [];

    return lines.map((line, idx) => {
      // 1. Check for Code Block boundaries
      if (line.trim().startsWith('```')) {
        if (insideCodeBlock) {
          insideCodeBlock = false;
          const blockText = codeContent.join('\n');
          codeContent = [];
          return (
            <pre key={idx} className="bg-gray-900 text-gray-100 font-mono text-xs p-4 rounded-lg my-3 overflow-x-auto whitespace-pre">
              {blockText}
            </pre>
          );
        } else {
          insideCodeBlock = true;
          return null;
        }
      }

      if (insideCodeBlock) {
        codeContent.push(line);
        return null;
      }

      // 2. Main Headings
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-black text-gray-900 tracking-tight mt-5 mb-2.5 pb-1.5 border-b border-gray-150">{line.substring(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-bold text-gray-800 tracking-tight mt-4 mb-2">{line.substring(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-bold text-gray-850 mt-3 mb-1.5">{line.substring(4)}</h3>;
      }

      // 3. Horizontal Rule
      if (line.trim() === '---') {
        return <hr key={idx} className="my-5 border-gray-200" />;
      }

      // 4. Interactive Checklist Todo entries
      const todoMatch = line.match(/^-\s\[([ xX])\]\s(.*)/);
      if (todoMatch) {
        const isTicked = todoMatch[1].toLowerCase() === 'x';
        const labelText = todoMatch[2];
        return (
          <div key={idx} className="flex items-center gap-2.5 my-1.5 select-none text-sm text-slate-700">
            <input 
              type="checkbox"
              checked={isTicked}
              onChange={() => handleCheckboxToggle(idx, isTicked, labelText)}
              className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-100 ring-offset-0 border-slate-300 cursor-pointer"
            />
            <span className={isTicked ? "line-through text-slate-450 font-medium" : "font-medium"}>
              {parseInlineMarkdown(labelText)}
            </span>
          </div>
        );
      }

      // 5. Bullet Point Lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={idx} className="list-disc list-inside ml-4 my-1 text-sm text-slate-700 leading-relaxed font-sans">
            {parseInlineMarkdown(line.substring(2))}
          </li>
        );
      }

      // 6. Blockquotes
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-blue-200 bg-blue-50/20 pl-4 py-2.5 pr-2 rounded-r-lg my-3 italic text-slate-600 text-sm leading-relaxed">
            {parseInlineMarkdown(line.substring(2))}
          </blockquote>
        );
      }

      // 7. Spacer tags for empty lines
      if (!line.trim()) {
        return <div key={idx} className="h-4" />;
      }

      // Default Standard Paragraph
      return (
        <p key={idx} className="text-sm text-gray-705 leading-relaxed font-sans my-1.5">
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Interactive Checklist Toggler: Alters raw Markdown lines of index position and triggers updates
  const handleCheckboxToggle = (lineIndex: number, currentChecked: boolean, rawLabel: string) => {
    const lines = content.split('\n');
    const targetSymbol = currentChecked ? ' ' : 'x';
    lines[lineIndex] = `- [${targetSymbol}] ${rawLabel}`;
    
    const updatedContent = lines.join('\n');
    setContent(updatedContent);
    triggerAutoSave(title, updatedContent);
  };

  // Helper parses simple bold and italic inline tokens inside previews
  const parseInlineMarkdown = (text: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const italicRegex = /\*(.*?)\*/g;
    
    let parts = [text];
    
    // We render basic JSX text segments mapping regex
    return text.split('**').map((chunk, i) => {
      if (i % 2 === 1) { // odd indexes are inside bold tags
        return <strong key={i} className="font-bold text-gray-950">{chunk}</strong>;
      }
      return chunk.split('*').map((subchunk, j) => {
        if (j % 2 === 1) { // inside italic tags
          return <em key={j} className="italic text-gray-800">{subchunk}</em>;
        }
        return subchunk;
      });
    });
  };

  if (!activePageId || !activePage) {
    return (
      <div id="editor-fallback" className="flex-1 bg-white flex flex-col justify-center items-center text-center p-8 select-none text-slate-400 font-sans">
        <FileText size={42} className="text-slate-300 mb-3" />
        <h3 className="font-bold text-slate-800 mb-1 text-sm">No note page active</h3>
        <p className="text-xs max-w-sm text-slate-500 leading-relaxed font-semibold">
          Select an existing page in the sidebar or create a new note page to open the writing workspace.
        </p>
      </div>
    );
  }

  return (
    <div id="main-editor-view" className="flex-1 bg-white flex flex-col h-full overflow-hidden">
      
      {/* Editor top Action bar controls */}
      <div className="h-12 border-b border-slate-200 px-5 flex items-center justify-between shrink-0 bg-slate-50/40">
        
        {/* Toggle Mode Tab selectors */}
        <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
          <button
            onClick={() => setCurrentTab('edit')}
            className={`px-3.5 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer select-none transition-all ${
              currentTab === 'edit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 size={11} />
            <span>Write Mode</span>
          </button>
          
          <button
            onClick={() => setCurrentTab('preview')}
            className={`px-3.5 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer select-none transition-all ${
              currentTab === 'preview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye size={11} />
            <span>Preview Mode</span>
          </button>
        </div>

        {/* Sync/Status notification tag */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-slate-400 select-none">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-blue-600 font-bold italic animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" />
                <span>Saving updates...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-600 font-bold flex items-center gap-1 shrink-0">
                <span>✓ Changes cached</span>
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className="text-slate-400 font-sans font-semibold">
                {user ? 'Cloud synchronized' : 'Stored in Local DB'}
              </span>
            )}
          </span>

          <button
            onClick={forceSave}
            title="Manual force sync"
            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 transition-all cursor-pointer select-none"
          >
            <Save size={11} />
            <span>Sync</span>
          </button>
        </div>

      </div>

      {/* Editor Content scrollbox */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto select-text">
        
        {/* Title display header */}
        <div className="mb-4">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={forceSave}
            className="w-full text-3xl font-black text-slate-900 tracking-tight border-none outline-none focus:ring-0 p-0 placeholder-slate-350"
            placeholder="Untitled Note Page"
            maxLength={250}
          />
          <div className="h-[2px] bg-blue-100/50 mt-2 rounded-full" />
        </div>

        {/* Edit mode Toolbar controls */}
        {currentTab === 'edit' && (
          <div className="flex items-center gap-1.5 p-1 border border-slate-200 bg-slate-50 border-b-none rounded-t-lg shrink-0 px-2 select-none overflow-x-auto">
            <button
              onClick={() => insertMarkdownPattern('### ', '')}
              className="p-1 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md transition-colors animate-none"
              title="Heading 1"
            >
              <Heading1 size={14} />
            </button>
            <button
              onClick={() => insertMarkdownPattern('#### ', '')}
              className="p-1 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md transition-colors"
              title="Heading 2"
            >
              <Heading2 size={14} />
            </button>
            <div className="w-px h-4.5 bg-slate-200 mx-1 shrink-0" />
            <button
              onClick={() => insertMarkdownPattern('**', '**')}
              className="p-1 hover:bg-slate-200 text-slate-600 hover:text-slate-950 rounded-md transition-colors"
              title="Bold text"
            >
              <Bold size={14} />
            </button>
            <button
              onClick={() => insertMarkdownPattern('*', '*')}
              className="p-1 hover:bg-slate-200 text-slate-600 hover:text-slate-950 rounded-md transition-colors"
              title="Italic text"
            >
              <Italic size={14} />
            </button>
            <div className="w-px h-4.5 bg-slate-200 mx-1 shrink-0" />
            <button
              onClick={() => insertMarkdownPattern('- ', '')}
              className="p-1 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md transition-colors"
              title="Bulleted List"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => insertMarkdownPattern('- [ ] ', '')}
              className="p-1 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md transition-colors"
              title="Todo Task Checkbox"
            >
              <CheckSquare size={14} />
            </button>
            <button
              onClick={() => insertMarkdownPattern('```\n', '\n```')}
              className="p-1 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md transition-colors"
              title="Code block code"
            >
              <Code size={14} />
            </button>
          </div>
        )}

        {/* Main Work field workspace area */}
        <div className="flex-1 flex flex-col min-h-72">
          {currentTab === 'edit' ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onBlur={forceSave}
              className="w-full flex-1 p-4 border border-slate-200 bg-white text-slate-800 text-sm leading-relaxed outline-none focus:ring-0 focus:border-slate-300 font-sans resize-none rounded-b-lg font-normal"
              placeholder="Start taking notes... Supports markdown syntax like Headings, lists, bold text, italics, blockquotes, and todo tasks (- [ ] task)."
            />
          ) : (
            <div className="w-full flex-1 p-4 border border-slate-200 rounded-lg bg-white overflow-y-auto break-all pb-16">
              {renderMarkdownPreview(content)}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
