/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notebook, Section, Page, Timestamp } from '../types';

// IndexedDB database settings for persistent Directory Handles
const DB_NAME = 'OneNoteCompanionWorkspaceDB';
const STORE_NAME = 'settings_store';
const KEY_NAME = 'local_directory_handle';

function saveHandleToIndexedDB(handle: FileSystemDirectoryHandle): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(handle, KEY_NAME);
      tx.oncomplete = () => resolve();
    };
    req.onerror = () => resolve();
  });
}

function loadHandleFromIndexedDB(): Promise<FileSystemDirectoryHandle | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(KEY_NAME);
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

function removeHandleFromIndexedDB(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(KEY_NAME);
      tx.oncomplete = () => resolve();
    };
    req.onerror = () => resolve();
  });
}

interface NotesContextType {
  // Authentication & Cloud placeholders for UI backwards compatibility
  user: any | null;
  authLoading: boolean;
  isOnline: boolean;
  localNotesAvailable: boolean;

  // Real local state lists
  notebooks: Notebook[];
  sections: Section[];
  pages: Page[];
  
  // Workspace selections
  activeNotebookId: string | null;
  setActiveNotebookId: (id: string | null) => void;
  activeSectionId: string | null;
  setActiveSectionId: (id: string | null) => void;
  activePageId: string | null;
  setActivePageId: (id: string | null) => void;
  
  // Mutators
  createNotebook: (name: string, color: string) => Promise<string>;
  updateNotebook: (id: string, name: string, color: string) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  
  createSection: (notebookId: string, name: string, color: string) => Promise<string>;
  updateSection: (id: string, name: string, color: string) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  
  createPage: (notebookId: string, sectionId: string, title: string, content: string) => Promise<string>;
  updatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  
  // Dummy Handlers for layout compatibility
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  promoteLocalNotes: () => Promise<void>;
  discardLocalNotes: () => void;

  // Local FileSystem Workspace features
  localDirectoryHandle: FileSystemDirectoryHandle | null;
  localDirectoryName: string | null;
  directoryPermissionGranted: boolean;
  requestLocalDirectory: () => Promise<void>;
  disconnectLocalDirectory: () => Promise<void>;
  autoDownloadMd: boolean;
  setAutoDownloadMd: (val: boolean) => void;
  exportPageToMd: (pageId: string) => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) throw new Error('useNotes must be used within a NotesProvider');
  return context;
};

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Main local lists
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  
  // Selection states
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  // FileSystem Workspace handle
  const [localDirectoryHandle, setLocalDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [localDirectoryName, setLocalDirectoryName] = useState<string | null>(null);
  const [directoryPermissionGranted, setDirectoryPermissionGranted] = useState(false);

  // Settings
  const [autoDownloadMd, setAutoDownloadMdState] = useState(() => {
    return localStorage.getItem('settings_auto_download_md') === 'true';
  });

  const setAutoDownloadMd = (val: boolean) => {
    setAutoDownloadMdState(val);
    localStorage.setItem('settings_auto_download_md', val ? 'true' : 'false');
  };

  // Sync isOnline hook
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize and load directory handle + local notes from LocalStorage on mount
  useEffect(() => {
    const localNb = localStorage.getItem('local_notebooks');
    const localSc = localStorage.getItem('local_sections');
    const localPg = localStorage.getItem('local_pages');
    
    setNotebooks(localNb ? JSON.parse(localNb) : []);
    setSections(localSc ? JSON.parse(localSc) : []);
    setPages(localPg ? JSON.parse(localPg) : []);

    // Try to load saved FileSystem directory handle
    loadHandleFromIndexedDB().then((savedHandle) => {
      if (savedHandle) {
        setLocalDirectoryHandle(savedHandle);
        setLocalDirectoryName(savedHandle.name);
        // Verify quick permission
        (savedHandle as any).queryPermission({ mode: 'readwrite' }).then((status: string) => {
          setDirectoryPermissionGranted(status === 'granted');
        }).catch(() => {
          setDirectoryPermissionGranted(false);
        });
      }
    });
  }, []);

  // Set default selection defaults on updates
  useEffect(() => {
    if (notebooks.length > 0 && !activeNotebookId) {
      setActiveNotebookId(notebooks[0].id);
    } else if (notebooks.length === 0) {
      setActiveNotebookId(null);
    }
  }, [notebooks, activeNotebookId]);

  useEffect(() => {
    if (activeNotebookId) {
      const filtered = sections.filter(s => s.notebookId === activeNotebookId);
      if (filtered.length > 0) {
        const currentActiveBelongs = filtered.some(s => s.id === activeSectionId);
        if (!currentActiveBelongs) {
          setActiveSectionId(filtered[0].id);
        }
      } else {
        setActiveSectionId(null);
      }
    } else {
      setActiveSectionId(null);
    }
  }, [activeNotebookId, sections, activeSectionId]);

  useEffect(() => {
    if (activeSectionId) {
      const filtered = pages.filter(p => p.sectionId === activeSectionId);
      if (filtered.length > 0) {
        const currentActiveBelongs = filtered.some(p => p.id === activePageId);
        if (!currentActiveBelongs) {
          setActivePageId(filtered[0].id);
        }
      } else {
        setActivePageId(null);
      }
    } else {
      setActivePageId(null);
    }
  }, [activeSectionId, pages, activePageId]);

  // Helper to persist changes to LocalStorage
  const saveLocalChanges = (updatedNbs: Notebook[], updatedSecs: Section[], updatedPgs: Page[]) => {
    localStorage.setItem('local_notebooks', JSON.stringify(updatedNbs));
    localStorage.setItem('local_sections', JSON.stringify(updatedSecs));
    localStorage.setItem('local_pages', JSON.stringify(updatedPgs));
    setNotebooks(updatedNbs);
    setSections(updatedSecs);
    setPages(updatedPgs);
  };

  // Helper mocks a Timestamp object compatible with what our sidebars expect
  const createMockTimestamp = (): Timestamp => {
    const d = new Date();
    return {
      seconds: Math.floor(d.getTime() / 1000),
      nanoseconds: 0,
      toDate: () => d,
      toMillis: () => d.getTime()
    };
  };

  // Trigger browser file download fallback of .md structure
  const downloadMdTextFile = (title: string, markdownContent: string) => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const cleanPageTitle = (title || 'Untitled_Page').replace(/[\\/:*?"<>|]/g, '_');
    a.href = url;
    a.download = `${cleanPageTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Sync Markdown to directories (Chrome/Edge File System Access API)
  const syncPageToDirectory = async (
    page: Page, 
    nbId: string, 
    secId: string,
    currentNbs = notebooks,
    currentSecs = sections
  ) => {
    if (!localDirectoryHandle) return;
    try {
      const perm = await (localDirectoryHandle as any).queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;

      const notebook = currentNbs.find(n => n.id === nbId);
      const section = currentSecs.find(s => s.id === secId);

      const nbDirName = (notebook?.name || 'Untitled Notebook').replace(/[\\/:*?"<>|]/g, '_');
      const secDirName = (section?.name || 'Untitled Section').replace(/[\\/:*?"<>|]/g, '_');
      const pageFileName = `${(page.title || 'Untitled Page').replace(/[\\/:*?"<>|]/g, '_')}.md`;

      const nbDir = await localDirectoryHandle.getDirectoryHandle(nbDirName, { create: true });
      const secDir = await nbDir.getDirectoryHandle(secDirName, { create: true });
      const fileHandle = await secDir.getFileHandle(pageFileName, { create: true });

      const writable = await fileHandle.createWritable();
      
      const fileDate = page.updatedAt ? new Date(page.updatedAt.seconds * 1000) : new Date();
      const header = `# ${page.title || 'Untitled Page'}\n` +
        `*Notebook: ${notebook?.name || 'Unsorted'}* | *Section: ${section?.name || 'Unsorted'}*\n` +
        `*Last Saved: ${fileDate.toLocaleString()}*\n\n` +
        `---\n\n`;

      await writable.write(header + (page.content || ''));
      await writable.close();
      console.log(`Synced note automatically to local disk: ${nbDirName}/${secDirName}/${pageFileName}`);
    } catch (err) {
      console.warn("Failed automatic folder save:", err);
    }
  };

  // Notebook Mutations
  const createNotebook = async (name: string, color: string): Promise<string> => {
    const id = 'nb_' + Math.random().toString(36).substring(2, 11);
    const notebook: Notebook = {
      id,
      name,
      color,
      userId: 'offline_user',
      createdAt: createMockTimestamp(),
      updatedAt: createMockTimestamp()
    };

    const newList = [...notebooks, notebook];
    saveLocalChanges(newList, sections, pages);
    setActiveNotebookId(id);
    return id;
  };

  const updateNotebook = async (id: string, name: string, color: string): Promise<void> => {
    const list = notebooks.map(n => n.id === id ? { 
      ...n, 
      name, 
      color, 
      updatedAt: createMockTimestamp() 
    } : n);
    saveLocalChanges(list, sections, pages);
  };

  const deleteNotebook = async (id: string): Promise<void> => {
    const filteredNbs = notebooks.filter(n => n.id !== id);
    const filteredSecs = sections.filter(s => s.notebookId !== id);
    const filteredPgs = pages.filter(p => p.notebookId !== id);
    saveLocalChanges(filteredNbs, filteredSecs, filteredPgs);
    
    if (activeNotebookId === id) {
      setActiveNotebookId(null);
    }
  };

  // Section Mutations
  const createSection = async (notebookId: string, name: string, color: string): Promise<string> => {
    const id = 'sec_' + Math.random().toString(36).substring(2, 11);
    const section: Section = {
      id,
      notebookId,
      name,
      color,
      userId: 'offline_user',
      createdAt: createMockTimestamp(),
      updatedAt: createMockTimestamp()
    };

    const newList = [...sections, section];
    saveLocalChanges(notebooks, newList, pages);
    setActiveSectionId(id);
    return id;
  };

  const updateSection = async (id: string, name: string, color: string): Promise<void> => {
    const list = sections.map(s => s.id === id ? { 
      ...s, 
      name, 
      color, 
      updatedAt: createMockTimestamp() 
    } : s);
    saveLocalChanges(notebooks, list, pages);
  };

  const deleteSection = async (id: string): Promise<void> => {
    const filteredSecs = sections.filter(s => s.id !== id);
    const filteredPgs = pages.filter(p => p.sectionId !== id);
    saveLocalChanges(notebooks, filteredSecs, filteredPgs);
    
    if (activeSectionId === id) {
      setActiveSectionId(null);
    }
  };

  // Page Mutations
  const createPage = async (notebookId: string, sectionId: string, title: string, content: string): Promise<string> => {
    const id = 'page_' + Math.random().toString(36).substring(2, 11);
    const page: Page = {
      id,
      notebookId,
      sectionId,
      title,
      content,
      favorite: false,
      userId: 'offline_user',
      createdAt: createMockTimestamp(),
      updatedAt: createMockTimestamp()
    };

    const newList = [page, ...pages];
    saveLocalChanges(notebooks, sections, newList);
    setActivePageId(id);

    // Auto-save actions
    if (localDirectoryHandle) {
      syncPageToDirectory(page, notebookId, sectionId, notebooks, sections);
    }
    if (autoDownloadMd) {
      downloadMdTextFile(title, content);
    }

    return id;
  };

  const updatePage = async (id: string, updates: Partial<Page>): Promise<void> => {
    const list = pages.map(p => {
      if (p.id === id) {
        const updated = { 
          ...p, 
          ...updates, 
          updatedAt: createMockTimestamp() 
        };
        
        // Save to Folder active hook
        if (localDirectoryHandle) {
          syncPageToDirectory(updated, p.notebookId, p.sectionId, notebooks, sections);
        }
        if (autoDownloadMd && updates.content !== undefined) {
          // Prevent downloading on every keypress: simple debounce would be handled by Editor debounced save,
          // but let's allow downloading on save triggers
          downloadMdTextFile(updated.title, updated.content);
        }
        
        return updated;
      }
      return p;
    });
    
    saveLocalChanges(notebooks, sections, list);
  };

  const deletePage = async (id: string): Promise<void> => {
    const filteredPgs = pages.filter(p => p.id !== id);
    saveLocalChanges(notebooks, sections, filteredPgs);
    
    if (activePageId === id) {
      setActivePageId(null);
    }
  };

  // Local FileSystem Access API Handlers
  const requestLocalDirectory = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert("Your web browser doesn't support local directory writing. Please use Google Chrome, Edge, or Opera.");
        return;
      }
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      setLocalDirectoryHandle(handle);
      setLocalDirectoryName(handle.name);
      setDirectoryPermissionGranted(true);
      await saveHandleToIndexedDB(handle);
      
      alert(`Successfully mapped local workspace directory: "${handle.name}". Newly added or updated pages will now automatically save directly as .md files there!`);
    } catch (err: any) {
      console.warn('Directory Picker error:', err);
      alert("Permission denied or directory selection aborted. If running in a restricted sandbox iframe, browser security may prevent direct directory pickers. Try using the 'Auto-Download .md' toggle instead!");
    }
  };

  const disconnectLocalDirectory = async () => {
    setLocalDirectoryHandle(null);
    setLocalDirectoryName(null);
    setDirectoryPermissionGranted(false);
    await removeHandleFromIndexedDB();
  };

  // Explicit exporter helper
  const exportPageToMd = (pageId: string) => {
    const target = pages.find(p => p.id === pageId);
    if (!target) return;
    downloadMdTextFile(target.title, target.content);
  };

  return (
    <NotesContext.Provider value={{
      user: null, // Force offline user
      authLoading: false,
      isOnline,
      localNotesAvailable: false, // Prevents cloud prompt banner
      notebooks,
      sections,
      pages,
      activeNotebookId,
      setActiveNotebookId,
      activeSectionId,
      setActiveSectionId,
      activePageId,
      setActivePageId,
      createNotebook,
      updateNotebook,
      deleteNotebook,
      createSection,
      updateSection,
      deleteSection,
      createPage,
      updatePage,
      deletePage,
      
      // Compatibility placeholders
      loginWithGoogle: async () => {},
      logout: async () => {},
      promoteLocalNotes: async () => {},
      discardLocalNotes: () => {},

      // Local Workspace helpers
      localDirectoryHandle,
      localDirectoryName,
      directoryPermissionGranted,
      requestLocalDirectory,
      disconnectLocalDirectory,
      autoDownloadMd,
      setAutoDownloadMd,
      exportPageToMd
    }}>
      {children}
    </NotesContext.Provider>
  );
};
