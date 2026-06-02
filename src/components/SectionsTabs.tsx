/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { Section } from '../types';
import { Plus, Trash2, Edit3, Check, X, FileDigit } from 'lucide-react';

const COLORS = [
  { name: 'Blue', class: 'bg-blue-600 border-blue-500' },
  { name: 'Teal', class: 'bg-teal-650 border-teal-500' },
  { name: 'Amethyst', class: 'bg-violet-650 border-violet-500' },
  { name: 'Coral', class: 'bg-rose-550 border-rose-500' },
  { name: 'Emerald', class: 'bg-emerald-650 border-emerald-500' },
  { name: 'Amber', class: 'bg-amber-550 border-amber-500' },
  { name: 'Steel', class: 'bg-slate-650 border-slate-500' },
];

interface SectionsTabsProps {
  onOpenImporter: () => void;
}

export const SectionsTabs: React.FC<SectionsTabsProps> = ({ onOpenImporter }) => {
  const { 
    sections, 
    activeNotebookId, 
    activeSectionId, 
    setActiveSectionId, 
    createSection, 
    updateSection, 
    deleteSection 
  } = useNotes();

  const [addMode, setAddMode] = useState(false);
  const [newSecName, setNewSecName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].class);
  
  // Edit variables
  const [editingSecId, setEditingSecId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedColor, setEditedColor] = useState('');

  // Dropdown helper color picker in editing
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Filter sections under active notebook
  const notebookSections = sections.filter(s => s.notebookId === activeNotebookId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNotebookId || !newSecName.trim()) return;
    try {
      await createSection(activeNotebookId, newSecName.trim(), selectedColor);
      setNewSecName('');
      setAddMode(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = (sec: Section, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSecId(sec.id);
    setEditedName(sec.name);
    setEditedColor(sec.color);
  };

  const handleSaveEdit = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) return;
    try {
      await updateSection(id, editedName.trim(), editedColor);
      setEditingSecId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete the section "${name}" and all of its notes? This action is irreversible.`)) {
      try {
        await deleteSection(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!activeNotebookId) {
    return (
      <div className="h-14 bg-slate-50 border-b border-slate-200 flex items-center px-6 text-slate-500 font-sans italic text-xs font-semibold">
        Please select or create a notebook in the sidebar to view sections.
      </div>
    );
  }

  return (
    <div id="sections-toolbar" className="h-14 bg-white border-b border-slate-200 flex items-end justify-between px-3 select-none">
      
      {/* Sections Tab Row */}
      <div className="flex items-end overflow-x-auto gap-1 grow pr-4 h-full pt-2">
        {notebookSections.map((sec) => {
          const isActive = sec.id === activeSectionId;
          const isEditing = sec.id === editingSecId;

          // Color tags mapping for border highlight or solid top-ribbon
          const colorClass = sec.color || COLORS[0].class;
          const bgThemeClass = isActive 
            ? 'bg-slate-50 border-b-slate-50 text-slate-900 shadow-xs' 
            : 'bg-white border-b-transparent hover:bg-slate-100 text-slate-650';

          return (
            <div
              key={sec.id}
              onClick={() => !isEditing && setActiveSectionId(sec.id)}
              className={`group relative flex items-center min-w-32 max-w-44 px-3.5 py-1.5 border border-slate-200 border-b-0 rounded-t-lg transition-all duration-150 cursor-pointer text-xs font-bold ${bgThemeClass}`}
              style={{
                borderTop: `3px solid ${colorClass.split(' ')[0] === 'bg-indigo-600' || colorClass.split(' ')[0] === 'bg-blue-600' ? '#2563eb' : 
                          colorClass.split(' ')[0] === 'bg-teal-650' ? '#0d9488' : 
                          colorClass.split(' ')[0] === 'bg-violet-650' ? '#7c3aed' : 
                          colorClass.split(' ')[0] === 'bg-rose-550' ? '#e11d48' : 
                          colorClass.split(' ')[0] === 'bg-emerald-650' ? '#059669' : 
                          colorClass.split(' ')[0] === 'bg-amber-550' ? '#d97706' : '#64748b'}`
              }}
            >
              {isEditing ? (
                <form onSubmit={(e) => handleSaveEdit(sec.id, e)} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 grow w-full">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-1.5 py-0.5 border border-blue-500 bg-white text-slate-800 font-medium text-[11px] rounded-sm outline-none"
                    maxLength={100}
                    required
                    autoFocus
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="submit" className="p-0.5 text-emerald-600 hover:bg-slate-100 rounded-sm">
                      <Check size={11} />
                    </button>
                    <button type="button" onClick={() => setEditingSecId(null)} className="p-0.5 text-rose-500 hover:bg-slate-100 rounded-sm">
                      <X size={11} />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-baseline justify-between select-none grow gap-1.5 overflow-hidden">
                  <span className="truncate leading-none pt-0.5 text-gray-800">
                    {sec.name}
                  </span>
                  
                  {/* Option controls triggered on tab hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 absolute right-1.5 top-2.5 bg-inherit pl-1 text-[10px]">
                    <button
                      title="Rename section"
                      onClick={(e) => handleStartEdit(sec, e)}
                      className="p-0.5 hover:bg-gray-250/70 rounded-xs text-gray-500 hover:text-gray-900"
                    >
                      <Edit3 size={10} />
                    </button>
                    <button
                      title="Delete section"
                      onClick={(e) => handleDelete(sec.id, sec.name, e)}
                      className="p-0.5 hover:bg-gray-250/70 rounded-xs text-gray-500 hover:text-rose-600"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Create section form block inline inline-creator */}
        {addMode ? (
          <form onSubmit={handleCreate} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 border-b-transparent px-3 py-1.5 rounded-t-lg">
            <input
              type="text"
              value={newSecName}
              onChange={(e) => setNewSecName(e.target.value)}
              placeholder="Section Name..."
              className="px-2 py-0.5 border border-blue-300 bg-white text-slate-705 text-xs rounded-sm outline-none font-medium w-28 focus:border-blue-500"
              maxLength={100}
              required
              autoFocus
            />
            {/* Simple mini-picker for color */}
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="text-[10px] bg-white border border-slate-200 rounded-sm py-0.5 px-1 font-semibold text-slate-600 focus:outline-none cursor-pointer"
            >
              {COLORS.map(c => (
                <option key={c.name} value={c.class}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <button type="submit" className="p-0.5 text-emerald-600 hover:bg-white rounded-xs">
                <Check size={12} />
              </button>
              <button type="button" onClick={() => setAddMode(false)} className="p-0.5 text-rose-500 hover:bg-white rounded-xs">
                <X size={12} />
              </button>
            </div>
          </form>
        ) : (
          <button
            id="add-section-inline"
            onClick={() => setAddMode(true)}
            className="px-3 py-1.5 border border-dashed border-slate-300 rounded-t-lg hover:bg-slate-50 hover:border-slate-400 text-slate-500 transition-colors cursor-pointer shrink-0 text-xs font-semibold flex items-center gap-1"
            title="Add Section"
          >
            <Plus size={13} />
            <span>Section</span>
          </button>
        )}
      </div>

      {/* Import .one files Actions inside Navbar header */}
      <div className="flex items-center gap-2 pb-2 h-full">
        <button
          id="trigger-import"
          onClick={onOpenImporter}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer focus:ring-2 focus:ring-blue-100 focus:outline-none"
          title="Import notes from OneNote (.one) binary backup files"
        >
          <FileDigit size={14} className="shrink-0" />
          <span>Import .one</span>
        </button>
      </div>

    </div>
  );
};
