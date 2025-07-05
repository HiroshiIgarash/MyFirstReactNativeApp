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
  /**
   * 現在の間隔インデックス（0:5分, 1:15分, 2:1時間, 3:6時間, 4:1日, 5:3日, 6:7日, 7:マスター済み）
   */
  intervalIndex?: number;
  /**
   * 次回復習予定日時（ISO8601文字列）
   */
  nextDue?: string;
  /**
   * マスター済み（復習対象外）
   */
  mastered?: boolean;
}
