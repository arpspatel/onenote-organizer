/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { Notebook as NotebookType } from '../types';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Sparkles, 
  LogOut, 
  User, 
  LogIn, 
  CloudRain, 
  CloudLightning 
} from 'lucide-react';

const COLORS = [
  { name: 'Blue', class: 'bg-blue-600' },
  { name: 'Teal', class: 'bg-teal-650' },
  { name: 'Amethyst', class: 'bg-violet-650' },
  { name: 'Coral', class: 'bg-rose-550' },
  { name: 'Emerald', class: 'bg-emerald-650' },
  { name: 'Amber', class: 'bg-amber-550' },
  { name: 'Steel', class: 'bg-slate-650' },
];

export const NotebooksSidebar: React.FC = () => {
  const { 
    notebooks, 
    activeNotebookId, 
    setActiveNotebookId, 
    createNotebook, 
    updateNotebook, 
    deleteNotebook,
    localDirectoryHandle,
    localDirectoryName,
    disconnectLocalDirectory,
    requestLocalDirectory,
    autoDownloadMd,
    setAutoDownloadMd,
    detectedOneFiles,
    importOneFile
  } = useNotes();

  const [addMode, setAddMode] = useState(false);
  const [newNbName, setNewNbName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].class);
  
  // Renaming/Editing states
  const [editingNbId, setEditingNbId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedColor, setEditedColor] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNbName.trim()) return;
    try {
      await createNotebook(newNbName.trim(), selectedColor);
      setNewNbName('');
      setAddMode(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = (nb: NotebookType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNbId(nb.id);
    setEditedName(nb.name);
    setEditedColor(nb.color);
  };

  const handleSaveEdit = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) return;
    try {
      await updateNotebook(id, editedName.trim(), editedColor);
      setEditingNbId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${name}"? This will permanently delete all its sections and note pages.`)) {
      try {
        await deleteNotebook(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div id="notebook-sidebar" className="w-68 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800">
      
      {/* Brand logo & status indicator */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-sm font-sans font-black tracking-wide text-white text-sm">
            ONE
          </div>
          <div>
            <h1 className="font-bold text-slate-150 text-sm tracking-tight leading-none">Notebooks</h1>
            <p className="text-[10px] text-slate-405 mt-1 font-sans">Strictly Local Offline Workspace</p>
          </div>
        </div>
      </div>

      {/* Local Workspace Sync & Auto-Save Setup */}
      <div className="p-3.5 border-b border-slate-800/60 bg-slate-950/25 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Local Disk Auto-Save</span>
          <span className="text-[9px] bg-blue-500/25 text-blue-300 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Active</span>
        </div>

        {localDirectoryHandle ? (
          <div className="bg-slate-805/50 border border-slate-800/80 p-2.5 rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-1 overflow-hidden">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="p-0.5 bg-emerald-600/20 text-emerald-400 rounded-md shrink-0">
                  <Check size={11} />
                </span>
                <span className="text-xs font-bold text-slate-200 truncate" title={localDirectoryName || ''}>
                  📁 {localDirectoryName}
                </span>
              </div>
              <button
                onClick={disconnectLocalDirectory}
                className="text-[9px] text-slate-500 hover:text-rose-450 shrink-0 font-bold transition-colors cursor-pointer"
                title="Disconnect folder"
              >
                Disconnect
              </button>
            </div>
            <p className="text-[9px] text-slate-400 leading-relaxed font-sans">
              Auto-saves changes directly to your local workspace as <code className="text-blue-300">.md</code> files.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={requestLocalDirectory}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
            >
              <span>📁 Select Save Folder</span>
            </button>
            <p className="text-[9px] text-slate-450 text-center leading-relaxed font-semibold">
              Select a local folder on your computer to auto-write notebook Markdown files in real-time.
            </p>
          </div>
        )}

        {/* Sync Settings */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
          <label className="flex items-center gap-2 text-[9px] font-bold text-slate-400 select-none cursor-pointer w-full">
            <input 
              type="checkbox"
              checked={autoDownloadMd}
              onChange={(e) => setAutoDownloadMd(e.target.checked)}
              className="w-3 mx-0.5 h-3 text-blue-600 bg-slate-900 border-slate-700 rounded-sm focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="truncate">Auto-Download .md on Edit</span>
          </label>
        </div>

        {/* Directory-scanned `.one` files list */}
        {localDirectoryHandle && detectedOneFiles.length > 0 && (
          <div className="pt-2 border-t border-slate-800/60 mt-2 space-y-1.5 bg-slate-950/20 p-2 rounded-lg">
            <div className="flex items-center justify-between text-[9px] font-bold text-blue-400 uppercase tracking-wider">
              <span>📦 Folder Backups ({detectedOneFiles.length})</span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800/60 font-semibold text-slate-350">
              {detectedOneFiles.map((f, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => importOneFile(f.handle, f.notebookName)}
                  className="w-full text-left text-[9px] text-slate-300 hover:text-white hover:bg-slate-800 px-1.5 py-1 rounded transition-all flex items-center justify-between gap-1 group/item cursor-pointer"
                  title={`Click to load and sync ${f.notebookName}/${f.name}`}
                >
                  <span className="truncate max-w-[130px] font-mono">
                    {f.name.replace(/\.one$/i, '')}
                  </span>
                  <span className="text-[8px] bg-slate-800 text-blue-400 group-hover/item:bg-blue-600 group-hover/item:text-white font-bold px-1 py-0.5 rounded-sm transition-all shrink-0">
                    Load
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notebook Lists */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        <div className="flex items-center justify-between px-2 pb-1.5 select-none">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Notebook index</span>
          <button 
            id="add-notebook-toggle"
            onClick={() => setAddMode(!addMode)} 
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-sm transition-colors"
            title="Create Notebook"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Create notebook field */}
        {addMode && (
          <form onSubmit={handleCreate} className="p-2.5 bg-slate-805/80 border border-slate-850 rounded-lg space-y-2 mb-3 shadow-inner">
            <input 
              type="text" 
              value={newNbName}
              onChange={(e) => setNewNbName(e.target.value)}
              placeholder="Notebook name..."
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-750 text-slate-100 text-xs rounded-sm outline-none focus:border-blue-500"
              maxLength={100}
              required
              autoFocus
            />
            {/* Color Selection dots */}
            <div className="flex flex-wrap gap-1.5 py-1 justify-center">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c.name}
                  onClick={() => setSelectedColor(c.class)}
                  className={`w-4 h-4 rounded-full border border-white/10 ${c.class} cursor-pointer transition-transform duration-100 relative`}
                  title={c.name}
                >
                  {selectedColor === c.class && (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white">✓</div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="flex justify-end gap-1.5 pt-1 text-[10px]">
              <button 
                type="button" 
                onClick={() => setAddMode(false)}
                className="px-2 py-1 hover:bg-slate-800 text-slate-300 rounded-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-sm font-semibold transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {notebooks.length === 0 ? (
          <div className="text-center py-10 opacity-40 px-3">
            <BookOpen size={24} className="mx-auto text-slate-405 mb-2" />
            <p className="text-[11px] font-sans">No notebooks created yet. Create a notebook to start organizing!</p>
          </div>
        ) : (
          notebooks.map((nb) => {
            const isActive = nb.id === activeNotebookId;
            const isEditing = nb.id === editingNbId;

            return (
              <div
                key={nb.id}
                onClick={() => !isEditing && setActiveNotebookId(nb.id)}
                className={`group flex flex-col p-2.5 rounded-lg cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-slate-800 border-l-4 border-blue-500 text-white font-semibold' 
                    : 'text-slate-350 hover:bg-slate-805 hover:text-slate-100'
                }`}
              >
                {isEditing ? (
                  <form onSubmit={(e) => handleSaveEdit(nb.id, e)} onClick={(e) => e.stopPropagation()} className="space-y-2">
                    <input 
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-slate-900 text-white rounded-md outline-none border border-blue-500"
                      maxLength={100}
                      required
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {COLORS.map((c) => (
                          <button
                            type="button"
                            key={c.name}
                            onClick={() => setEditedColor(c.class)}
                            className={`w-3 h-3 rounded-full ${c.class} border border-white/10 relative cursor-pointer`}
                          >
                            {editedColor === c.class && (
                              <div className="absolute inset-x-0 bottom-0 text-[8px] flex items-center justify-center text-white font-bold leading-none">✓</div>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1 text-[10px]">
                        <button 
                          type="button" 
                          onClick={() => setEditingNbId(null)}
                          className="p-1 hover:bg-slate-700 text-slate-300 rounded-sm"
                        >
                          <X size={10} />
                        </button>
                        <button 
                          type="submit"
                          className="p-1 bg-blue-600 text-white rounded-sm"
                        >
                          <Check size={10} />
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {/* Notebook color block icon resembling classic OneNote binders */}
                      <div className={`w-3 h-5.5 rounded-sm shrink-0 shadow-xs border border-white/10 ${nb.color || 'bg-blue-600'}`} />
                      <span className="text-xs font-semibold truncate select-none leading-none pt-0.5">
                        {nb.name}
                      </span>
                    </div>

                    {/* Controls on hover */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        title="Edit Notebook properties"
                        onClick={(e) => handleStartEdit(nb, e)}
                        className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-100 transition-colors"
                      >
                        <Edit3 size={11} />
                      </button>
                      <button
                        title="Delete Notebook"
                        onClick={(e) => handleDelete(nb.id, nb.name, e)}
                        className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Helper Footer credit */}
      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 font-sans leading-relaxed text-center select-none">
        <span>Microsoft OneNote Compatible Companion</span>
      </div>

    </div>
  );
};
