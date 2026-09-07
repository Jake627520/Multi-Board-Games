# Xiangqi Board Spec (Change 002)

Reference living spec at `openspec/specs/xiangqi/board/spec.md`.

- Grid: 9 columns (0..8), 10 rows (0..9), 90 points.
- Palaces:
  - Black: rows 0..2, cols 3..5
  - Red: rows 7..9, cols 3..5
- River:
  - Boundary between row 4 and row 5.
  - Red side: rows 5..9; Black side: rows 0..4.
- Out of bounds points rejected unconditionally.
