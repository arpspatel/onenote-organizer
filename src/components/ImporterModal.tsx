/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useNotes } from '../context/NotesContext';
import { parseOneNoteFile } from '../onenoteParser';
import { ExtractedOneNotePage, ExtractedOneNoteBlock } from '../types';
import { 
  X, 
  Upload, 
  FileDigit, 
  Check, 
  BookOpen, 
  Folder, 
  Layout, 
  ListTodo, 
  Heading1, 
  AlignLeft, 
  AlertCircle 
} from 'lucide-react';

interface ImporterModalProps {
  onClose: () => void;
}

export const ImporterModal: React.FC<ImporterModalProps> = ({ onClose }) => {
  const { 
    notebooks, 
    sections, 
    createPage, 
    activeNotebookId, 
    activeSectionId,
    setActiveNotebookId,
    setActiveSectionId
  } = useNotes();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ExtractedOneNotePage | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target Notebook & Section mapping for import destination
  const [targetNotebookId, setTargetNotebookId] = useState(activeNotebookId || (notebooks[0]?.id || ''));
  const [targetSectionId, setTargetSectionId] = useState(activeSectionId || '');

  // Handle notebook change to update default section id selection
  const handleNotebookChange = (nbId: string) => {
    setTargetNotebookId(nbId);
    const linkedSections = sections.filter(s => s.notebookId === nbId);
    if (linkedSections.length > 0) {
      setTargetSectionId(linkedSections[0].id);
    } else {
      setTargetSectionId('');
    }
  };

  const processFile = async (selectedFile: File) => {
    // Validate file extension
    if (!selectedFile.name.endsWith('.one')) {
      setErrorMsg('Invalid file format. Please upload a standard Microsoft OneNote ".one" notebook file.');
      return;
    }
    
    setErrorMsg('');
    setFile(selectedFile);
    setParsing(true);
    
    try {
      const buffer = await selectedFile.arrayBuffer();
      const extracted = parseOneNoteFile(buffer);
      
      setParsedData(extracted);
      setEditedTitle(extracted.title || 'Imported Notebook Page');
      
      // Auto-set target notebook and section if currently empty
      if (!targetNotebookId && notebooks.length > 0) {
        handleNotebookChange(notebooks[0].id);
      } else if (targetNotebookId) {
        const currentSections = sections.filter(s => s.notebookId === targetNotebookId);
        if (currentSections.length > 0 && !targetSectionId) {
          setTargetSectionId(currentSections[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to read and parse the content. The .one file might be corrupted or highly encrypted.');
    } finally {
      setParsing(false);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async () => {
    if (!parsedData) return;
    if (!targetNotebookId) {
      setErrorMsg('Please select or create a Notebook for the imported note.');
      return;
    }
    if (!targetSectionId) {
      setErrorMsg('Please select or create a Section for the imported note.');
      return;
    }

    setImporting(true);
    try {
      // Build markdown content out of extracted blocks
      let markdownContent = '';
      parsedData.blocks.forEach((block) => {
        if (block.type === 'heading') {
          markdownContent += `### ${block.content}\n\n`;
        } else if (block.type === 'todo') {
          markdownContent += `- [${block.checked ? 'x' : ' '}] ${block.content}\n`;
        } else {
          markdownContent += `${block.content}\n\n`;
        }
      });

      if (!markdownContent.trim()) {
        markdownContent = parsedData.rawText;
      }

      await createPage(targetNotebookId, targetSectionId, editedTitle, markdownContent);
      
      // Update workspace focuses to highlight the freshly imported page
      setActiveNotebookId(targetNotebookId);
      setActiveSectionId(targetSectionId);
      
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to complete note creation in the database.');
    } finally {
      setImporting(false);
    }
  };

  const targetNotebookSections = sections.filter(s => s.notebookId === targetNotebookId);

  return (
    <div id="importer-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-55">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <FileDigit size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">OneNote .one Importer</h2>
              <p className="text-xs text-slate-500 font-semibold">Extract notes of offline proprietary files instantly</p>
            </div>
          </div>
          <button 
            id="close-importer"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-lg flex items-start gap-2.5 animate-pulse">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!parsedData ? (
            /* Choose or Drop file Area */
            <div>
              <div 
                id="dropzone"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/30 text-blue-605 shadow-md' 
                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/40 text-slate-500'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".one" 
                  className="hidden" 
                />
                
                <div className={`p-4 rounded-full transition-colors ${dragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                  {parsing ? (
                    <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  ) : (
                    <Upload size={32} />
                  )}
                </div>

                <div className="text-center">
                  <p className="font-medium text-gray-800 text-base">
                    {parsing ? 'Reading OneNote Binary...' : 'Drag & drop your .one file here'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Or click to browse files from your computer
                  </p>
                </div>

                <div className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-md mt-2 font-mono">
                  Supports *.one file structures
                </div>
              </div>

              <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-150 text-xs text-slate-600 space-y-3.5 animate-fadeIn">
                <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Layout size={14} className="text-blue-500" /> How does local parsing work?
                </p>
                <p>
                  Because Microsoft OneNote notebooks are stored as binary object streams, we scan the file structure to identify and decrypt UTF-16 text chunks. This secures your notes by running 100% in your local sandbox browser—never transmitting binary files to external servers.
                </p>

                <div className="pt-2.5 border-t border-slate-205">
                  <p className="font-bold text-slate-700 mb-2">📍 Standard System Paths for OneNote (.one) Files:</p>
                  <div className="space-y-2 font-mono text-[10px] text-slate-500 leading-relaxed">
                    <div>
                      <span className="font-bold text-blue-600">Windows (Local Docs):</span>
                      <pre className="bg-slate-100 p-1.5 rounded-sm overflow-x-auto mt-0.5">C:\Users\%USERNAME%\Documents\OneNote Notebooks\</pre>
                    </div>
                    <div>
                      <span className="font-bold text-blue-650">Windows (OneDrive Sync):</span>
                      <pre className="bg-slate-100 p-1.5 rounded-sm overflow-x-auto mt-0.5">C:\Users\%USERNAME%\OneDrive\Documents\OneNote Notebooks\</pre>
                    </div>
                    <div>
                      <span className="font-bold text-blue-650">macOS (Container Data):</span>
                      <pre className="bg-slate-100 p-1.5 rounded-sm overflow-x-auto mt-0.5">~/Library/Containers/com.microsoft.onenote.mac/Data/Library/Application Support/Microsoft User Data/OneNote/</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Review & Map Destination Area */
            <div className="space-y-5 animate-fadeIn">
              
              {/* File details banner */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-100/60 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold">
                  <Check size={16} className="text-emerald-600 bg-emerald-100 p-0.5 rounded-full" />
                  <span>Parsed &quot;{file?.name}&quot; successfully</span>
                </div>
                <button 
                  onClick={() => { setFile(null); setParsedData(null); }}
                  className="text-xs text-slate-500 hover:text-blue-600 font-bold underline"
                >
                  Upload different file
                </button>
              </div>              {/* Title configure */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Import Page Title
                </label>
                <input 
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-105 focus:border-blue-500 outline-none text-slate-800 text-sm font-semibold transition-all"
                  placeholder="Enter note title..."
                />
              </div>

              {/* Map targets */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen size={13} className="text-slate-400" /> Destination Notebook
                  </label>
                  <select
                    value={targetNotebookId}
                    onChange={(e) => handleNotebookChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-700 text-sm bg-white font-bold"
                  >
                    <option value="" disabled>Select Notebook...</option>
                    {notebooks.map((nb) => (
                      <option key={nb.id} value={nb.id}>{nb.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Folder size={13} className="text-slate-400" /> Target Section
                  </label>
                  <select
                    value={targetSectionId}
                    onChange={(e) => setTargetSectionId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-700 text-sm bg-white font-bold"
                    disabled={!targetNotebookId}
                  >
                    <option value="">Select Section...</option>
                    {targetNotebookSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Extracted preview content */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Extracted Note Content Preview ({parsedData.blocks.length} elements found)
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-slate-50/50 p-4 space-y-2.5 font-mono text-xs text-slate-600">
                  {parsedData.blocks.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 font-sans italic">
                      No distinct paragraph-structure text identified inside the document structure. Raw dump format will be imported fallback.
                    </div>
                  ) : (
                    parsedData.blocks.map((block, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-white p-2.5 rounded-lg shadow-3xs border border-slate-100">
                        <span className="shrink-0 mt-0.5 text-slate-400">
                          {block.type === 'heading' && <Heading1 size={13} className="text-blue-500" />}
                          {block.type === 'todo' && <ListTodo size={13} className="text-amber-500" />}
                          {block.type === 'text' && <AlignLeft size={13} />}
                        </span>
                        <span className="text-[11px] leading-relaxed break-words font-sans text-gray-700">
                          {block.type === 'todo' && (
                            <span className="inline-block mr-1 text-xs">{block.checked ? '☒' : '☐'}</span>
                          )}
                          {block.content}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3.5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 bg-white rounded-lg hover:bg-slate-50 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          {parsedData && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {importing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Create Page ({parsedData.blocks.length + 1} Keys)</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
