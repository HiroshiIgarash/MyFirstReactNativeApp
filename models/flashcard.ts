// 型定義: Flashcard
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  folderId: string;
  correctCount: number;
  incorrectCount: number;
  passCount: number;
  shownCount: number;
  lastAnsweredAt?: string;
  lastResult?: "correct" | "incorrect" | "pass";
  streak?: number;
}
