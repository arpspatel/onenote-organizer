/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNotes } from '../context/NotesContext';
import { 
  FileCode, 
  FolderOpen, 
  Sparkles, 
  HelpCircle, 
  BookOpen, 
  FileDigit,
  LogOut,
  FolderMinus,
  Info,
  ChevronDown
} from 'lucide-react';

export const ApplicationMenuBar: React.FC = () => {
  const {
    localDirectoryHandle,
    localDirectoryName,
    disconnectLocalDirectory,
    requestLocalDirectory,
    importOneFileFromBuffer,
    createNotebook,
    createSection,
    activeNotebookId,
    activeSectionId,
    createPage
  } = useNotes();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const triggerFileOpen = () => {
    setActiveMenu(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      try {
        const buffer = await selectedFile.arrayBuffer();
        await importOneFileFromBuffer(buffer, selectedFile.name);
      } catch (err) {
        console.error(err);
        alert(`Failed to load and parse "${selectedFile.name}".`);
      }
    }
  };

  const handleNewNotebookPrompt = async () => {
    setActiveMenu(null);
    const name = prompt("Enter new notebook name:");
    if (name?.trim()) {
      await createNotebook(name.trim(), "bg-blue-600");
    }
  };

  const handleNewSectionPrompt = async () => {
    setActiveMenu(null);
    if (!activeNotebookId) {
      alert("Please select or create a notebook first!");
      return;
    }
    const name = prompt("Enter new section name:");
    if (name?.trim()) {
      await createSection(activeNotebookId, name.trim(), "bg-teal-650");
    }
  };

  const handleNewPagePrompt = async () => {
    setActiveMenu(null);
    if (!activeNotebookId || !activeSectionId) {
      alert("Please select both a Notebook and a Section first!");
      return;
    }
    const title = 'Untitled Note';
    const defaultContent = '# Untitled Note\n\nWrite your note content here in standard markdown structure...';
    await createPage(activeNotebookId, activeSectionId, title, defaultContent);
  };

  return (
    <div 
      id="app-menu-bar"
      ref={menuRef} 
      className="h-10 bg-slate-900 border-b border-slate-800 text-slate-350 px-4 flex items-center justify-between text-xs font-semibold select-none z-40 shrink-0"
    >
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".one"
        className="hidden"
      />

      {/* Menu Options */}
      <div className="flex items-center gap-1">
        {/* Logo Icon */}
        <div className="flex items-center gap-1.5 mr-4 text-white font-extrabold font-sans">
          <span className="p-1 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-sm leading-none text-[8.5px] uppercase tracking-wide">
            Workspace
          </span>
        </div>

        {/* File Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('file')}
            className={`px-3 py-1 cursor-pointer rounded-md transition-colors flex items-center gap-1 ${
              activeMenu === 'file' ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-800 hover:text-slate-205'
            }`}
          >
            <span>File</span>
            <ChevronDown size={10} className="opacity-60" />
          </button>
          {activeMenu === 'file' && (
            <div className="absolute left-0 mt-1 w-56 bg-slate-850 border border-slate-750 rounded-lg shadow-xl py-1 z-50 text-slate-200 animate-fadeIn antialiased">
              <button
                type="button"
                onClick={triggerFileOpen}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2.5 cursor-pointer text-[11px] font-bold"
              >
                <FolderOpen size={13} className="text-blue-400 shrink-0 group-hover:text-white" />
                <span>Open .one Backup File...</span>
              </button>
              
              <div className="border-t border-slate-800 my-1"></div>

              {localDirectoryHandle ? (
                <>
                  <div className="px-3.5 py-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    📁 Active Save Folder: {localDirectoryName}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveMenu(null); disconnectLocalDirectory(); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-600 hover:text-white hover:font-bold transition-colors flex items-center gap-2.5 text-rose-400 cursor-pointer text-[11px] font-medium"
                  >
                    <FolderMinus size={13} className="shrink-0" />
                    <span>Disconnect Folder</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { setActiveMenu(null); requestLocalDirectory(); }}
                  className="w-full text-left px-3.5 py-2 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2.5 cursor-pointer text-[11px] font-medium"
                >
                  <FolderOpen size={13} className="text-blue-400 shrink-0" />
                  <span>Map Auto-Save Folder...</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* New Item Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('add_item')}
            className={`px-3 py-1 cursor-pointer rounded-md transition-colors flex items-center gap-1 ${
              activeMenu === 'add_item' ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-800 hover:text-slate-205'
            }`}
          >
            <span>Add</span>
            <ChevronDown size={10} className="opacity-60" />
          </button>
          {activeMenu === 'add_item' && (
            <div className="absolute left-0 mt-1 w-48 bg-slate-850 border border-slate-750 rounded-lg shadow-xl py-1 z-50 text-slate-200 animate-fadeIn">
              <button
                type="button"
                onClick={handleNewNotebookPrompt}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2 cursor-pointer text-[11px] font-medium"
              >
                <BookOpen size={13} className="text-blue-400 shrink-0" />
                <span>New Notebook</span>
              </button>
              <button
                type="button"
                onClick={handleNewSectionPrompt}
                disabled={!activeNotebookId}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2 cursor-pointer text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FolderOpen size={13} className="text-teal-400 shrink-0" />
                <span>New Section</span>
              </button>
              <button
                type="button"
                onClick={handleNewPagePrompt}
                disabled={!activeNotebookId || !activeSectionId}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2 cursor-pointer text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileCode size={13} className="text-emerald-400 shrink-0" />
                <span>New Note Page</span>
              </button>
            </div>
          )}
        </div>

        {/* Help Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('help')}
            className={`px-3 py-1 cursor-pointer rounded-md transition-colors flex items-center gap-1 ${
              activeMenu === 'help' ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-800 hover:text-slate-205'
            }`}
          >
            <span>Help</span>
            <ChevronDown size={10} className="opacity-60" />
          </button>
          {activeMenu === 'help' && (
            <div className="absolute left-0 mt-1 w-64 bg-slate-850 border border-slate-750 rounded-lg shadow-xl py-1.5 z-50 text-slate-200 animate-fadeIn">
              <div className="px-3.5 py-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                💡 Local Decryption Help
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  alert("How local parsing works:\n\nMicrosoft OneNote files (.one) are scanned entirely inside your browser sandbox. UTF-16 strings are extracted, sanitized of metadata guid hashes, and rendered dynamically to respect your data privacy absolute.");
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2 cursor-pointer text-[11px]"
              >
                <Info size={13} className="text-blue-400 shrink-0" />
                <span>Privacy & Sandboxing Details</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  alert("Typical OneNote back-up paths:\n\nWindows local notebook: \nC:\\Users\\%USERNAME%\\Documents\\OneNote Notebooks\\\n\nmacOS app sync storage: \n~/Library/Containers/com.microsoft.onenote.mac/Data/Library/");
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2 cursor-pointer text-[11px]"
              >
                <FileDigit size={13} className="text-indigo-400 shrink-0" />
                <span>Standard OneNote Paths</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connection Indicator status */}
      <div className="flex items-center gap-2 font-sans text-[10px] text-slate-400">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
        <span className="font-bold uppercase tracking-wider text-slate-450">
          {localDirectoryHandle ? `Workspace Saved: ${localDirectoryName}` : 'Local-Sandbox Only'}
        </span>
      </div>
    </div>
  );
};
