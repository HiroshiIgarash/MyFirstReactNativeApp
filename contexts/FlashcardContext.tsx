import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Flashcard } from "../models/flashcard";
import { Folder } from "../models/folder";

export interface FlashcardContextType {
  flashcards: Flashcard[];
  addFlashcard: (front: string, back: string, folderId: string) => void;
  folders: Folder[];
  addFolder: (name: string, color?: string, icon?: string) => void;
  editFlashcard?: (id: string, front: string, back: string) => void;
  deleteFlashcard?: (id: string) => void;
  setFlashcards?: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  setFolders?: React.Dispatch<React.SetStateAction<Folder[]>>;
  // フォルダ削除
  deleteFolder?: (id: string) => void;
  // フォルダ名編集
  editFolderName?: (
    id: string,
    newName: string,
    color?: string,
    icon?: string
  ) => void;
}

export const FlashcardContext = createContext<FlashcardContextType | null>(
  null
);

export const FlashcardProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [folders, setFolders] = useState<Folder[]>([
    { id: "uncategorized", name: "未分類" },
  ]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  // --- AsyncStorageから復元 ---
  useEffect(() => {
    (async () => {
      try {
        const [fc, fd] = await Promise.all([
          AsyncStorage.getItem("flashcards"),
          AsyncStorage.getItem("folders"),
        ]);
        if (fc) setFlashcards(JSON.parse(fc));
        if (fd) setFolders(JSON.parse(fd));
      } catch (e) {
        // 読み込み失敗時は初期値のまま
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- flashcards/folders変更時に保存 ---
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem("flashcards", JSON.stringify(flashcards));
    }
  }, [flashcards, loading]);
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem("folders", JSON.stringify(folders));
    }
  }, [folders, loading]);

  // カードを追加する関数
  const addFlashcard = useCallback(
    (front: string, back: string, folderId: string) => {
      const newCard: Flashcard = {
        id: `${Date.now().toString()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        front,
        back,
        folderId,
        correctCount: 0,
        incorrectCount: 0,
        passCount: 0,
        shownCount: 0,
        lastAnsweredAt: undefined,
        lastResult: undefined,
        streak: 0,
      };
      setFlashcards((prevCards) => [...prevCards, newCard]);
    },
    []
  );

  // フォルダを追加する関数
  const addFolder = useCallback(
    (name: string, color?: string, icon?: string) => {
      const newFolder: Folder = {
        id: Date.now().toString(),
        name,
        color,
        icon,
      };
      setFolders((prevFolders) => [...prevFolders, newFolder]);
    },
    []
  );

  // カードを編集する関数
  const editFlashcard = useCallback(
    (id: string, front: string, back: string) => {
      setFlashcards((prev) =>
        prev.map((card) => (card.id === id ? { ...card, front, back } : card))
      );
    },
    []
  );

  // カードを削除する関数
  const deleteFlashcard = useCallback((id: string) => {
    setFlashcards((prev) => prev.filter((card) => card.id !== id));
  }, []);

  // フォルダを削除する関数
  const deleteFolder = useCallback((id: string) => {
    setFolders((prev) => prev.filter((folder) => folder.id !== id));
    setFlashcards((prev) =>
      prev.map((card) =>
        card.folderId === id ? { ...card, folderId: "uncategorized" } : card
      )
    );
  }, []);

  // フォルダ名・色・アイコンを編集する関数
  const editFolderName = useCallback(
    (id: string, newName: string, color?: string, icon?: string) => {
      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === id
            ? {
                ...folder,
                name: newName,
                color: color ?? folder.color,
                icon: icon ?? folder.icon,
              }
            : folder
        )
      );
    },
    []
  );

  const value: FlashcardContextType = {
    flashcards,
    addFlashcard,
    folders,
    addFolder,
    editFlashcard,
    deleteFlashcard,
    setFlashcards,
    setFolders,
    deleteFolder,
    editFolderName, // 追加
  };

  if (loading) {
    return <>{/* ローディングUIはApp.tsxで */}</>;
  }

  return (
    <FlashcardContext.Provider value={value}>
      {children}
    </FlashcardContext.Provider>
  );
};
