import type { Position } from "../core/game/types";
import type { XiangqiMove } from "../games/xiangqi/types";
import type { GomokuMove } from "../games/gomoku/types";
import type { BanqiMove } from "../games/banqi/types";

/**
 * 「上一步標記」用：一步棋牽涉到哪些格子。
 * 模組層級的穩定函式——useGameSession 以函式參照做 memo 依賴。
 */

/** 象棋：起點與終點。 */
export const xiangqiMoveCells = (m: XiangqiMove): readonly Position[] => [m.from, m.to];

/** 五子棋：落子那一格。 */
export const gomokuMoveCells = (m: GomokuMove): readonly Position[] => [
  { row: m.row, col: m.col },
];

/** 暗棋：翻子標被翻的那格（電腦翻的牌就靠這個找）；走子/吃子標起訖兩格。 */
export const banqiMoveCells = (m: BanqiMove): readonly Position[] =>
  m.type === "flip" ? [m.pos] : [m.from, m.to];
