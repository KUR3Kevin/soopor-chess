/**
 * ChessEngine - A complete chess engine in JavaScript.
 *
 * Implements all standard chess rules:
 *   - Normal piece movement (King, Queen, Rook, Bishop, Knight, Pawn)
 *   - Castling (kingside and queenside)
 *   - En passant captures
 *   - Pawn promotion (default Queen, configurable)
 *   - Check, checkmate, and stalemate detection
 *   - Preventing self-check (can't move into check)
 *   - Fifty-move rule and threefold repetition tracking via FEN
 *
 * Board representation:
 *   8×8 array, row 0 = rank 8 (Black's back rank),
 *                 row 7 = rank 1 (White's back rank).
 *   col 0 = file 'a', col 7 = file 'h'.
 *
 * Pieces are represented by single-character strings:
 *   'K','Q','R','B','N','P' = White King, Queen, Rook, Bishop, Knight, Pawn
 *   'k','q','r','b','n','p' = Black king, queen, rook, bishop, knight, pawn
 *   null = empty square
 */
class ChessEngine {
  /**
   * Construct a new ChessEngine starting from the standard chess opening position.
   */
  constructor() {
    this._board = this._startingBoard();
    this._turn = 'white';
    this._castling = { K: true, Q: true, k: true, q: true }; // KQkq
    this._enPassantTarget = null; // [row, col] or null
    this._halfmoveClock = 0; // moves since last capture or pawn move
    this._fullmoveNumber = 1;
    this._history = []; // stack of move records for undo
    this._moveLog = []; // chronological list of moves for getMoveHistory()
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /** Return a deep copy of the 8×8 board array. */
  getBoard() {
    return this._board.map(r => [...r]);
  }

  /**
   * Return an array of legal moves for the piece at (row, col).
   * Each move: { from: [r, c], to: [r, c], promotionPiece?: 'Q'|'R'|'B'|'N' }
   */
  getLegalMoves(row, col) {
    if (!this._inBounds(row, col)) return [];
    const piece = this._board[row][col];
    if (!piece) return [];
    const color = this._pieceColor(piece);
    if (color !== this._turn) return [];
    const pseudo = this._pseudoMoves(row, col, piece);
    return pseudo.filter(m => this._isLegalAfterMove(m, color));
  }

  /**
   * Return all legal moves for the given color ('white' or 'black').
   * Takes into account the current turn — returns [] for the non-turn side.
   */
  getAllLegalMoves(color) {
    if (color !== this._turn) return [];
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this._board[r][c];
        if (p && this._pieceColor(p) === color) {
          moves.push(...this.getLegalMoves(r, c));
        }
      }
    }
    return moves;
  }

  /**
   * Apply a move and update the engine state.
   * @param {Object} move  { from: [r,c], to: [r,c], promotionPiece?: 'Q'|'R'|'B'|'N' }
   * @returns {boolean} true if the move was made, false if illegal.
   */
  makeMove(move) {
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = this._board[fr][fc];
    if (!piece) return false;
    const color = this._pieceColor(piece);
    if (color !== this._turn) return false;

    // Validate against legal moves
    const legals = this.getLegalMoves(fr, fc);
    const match = legals.find(m => m.to[0] === tr && m.to[1] === tc);
    if (!match) return false;

    // If promotion is required, use provided promotionPiece or default 'Q'
    let promotionPiece = match.promotionPiece || 'Q';
    if (move.promotionPiece) {
      // Validate promotion piece
      const upper = move.promotionPiece.toUpperCase();
      if (!['Q', 'R', 'B', 'N'].includes(upper)) {
        promotionPiece = upper;
      }
    }

    // Save state for undo
    this._history.push({
      move: { from: [fr, fc], to: [tr, tc], promotionPiece },
      board: this._board.map(r => [...r]),
      turn: this._turn,
      castling: { ...this._castling },
      enPassantTarget: this._enPassantTarget ? [...this._enPassantTarget] : null,
      halfmoveClock: this._halfmoveClock,
      fullmoveNumber: this._fullmoveNumber,
    });

    this._applyMove(fr, fc, tr, tc, promotionPiece);
    this._moveLog.push(this._history[this._history.length - 1].move);
    return true;
  }

  /** Undo the last move. Returns the undone move object or null. */
  undo() {
    if (this._history.length === 0) return null;
    const state = this._history.pop();
    this._board = state.board;
    this._turn = state.turn;
    this._castling = state.castling;
    this._enPassantTarget = state.enPassantTarget;
    this._halfmoveClock = state.halfmoveClock;
    this._fullmoveNumber = state.fullmoveNumber;
    this._moveLog.pop();
    return state.move;
  }

  /** Is the given color currently in check? */
  isInCheck(color) {
    const kingChar = color === 'white' ? 'K' : 'k';
    let kr, kc;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this._board[r][c] === kingChar) { kr = r; kc = c; break; }
      }
      if (kr !== undefined) break;
    }
    if (kr === undefined) return true; // shouldn't happen in valid game
    return this._isSquareAttacked(kr, kc, this._opponent(color));
  }

  /** Is the given color checkmated? */
  isCheckmate(color) {
    if (!this.isInCheck(color)) return false;
    return !this._hasAnyLegalMove(color);
  }

  /** Is the given color in stalemate? */
  isStalemate(color) {
    if (this.isInCheck(color)) return false;
    return !this._hasAnyLegalMove(color);
  }

  /** Return whose turn it is: 'white' or 'black'. */
  getTurn() {
    return this._turn;
  }

  /** Return an array of all moves made so far. */
  getMoveHistory() {
    return this._moveLog.map(m => ({ ...m, from: [...m.from], to: [...m.to] }));
  }

  /** Return the FEN string of the current position. */
  getFEN() {
    const rows = [];
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      let rowStr = '';
      for (let c = 0; c < 8; c++) {
        const p = this._board[r][c];
        if (p) {
          if (empty > 0) { rowStr += empty; empty = 0; }
          rowStr += p;
        } else {
          empty++;
        }
      }
      if (empty > 0) rowStr += empty;
      rows.push(rowStr);
    }

    const piecePlacement = rows.join('/');
    const activeColor = this._turn === 'white' ? 'w' : 'b';

    let castling = '';
    if (this._castling.K) castling += 'K';
    if (this._castling.Q) castling += 'Q';
    if (this._castling.k) castling += 'k';
    if (this._castling.q) castling += 'q';
    if (castling === '') castling = '-';

    let ep = '-';
    if (this._enPassantTarget) {
      ep = this._coordToAlgebraic(this._enPassantTarget[0], this._enPassantTarget[1]);
    }

    return `${piecePlacement} ${activeColor} ${castling} ${ep} ${this._halfmoveClock} ${this._fullmoveNumber}`;
  }

  // ------------------------------------------------------------------
  // Internal helpers — board setup
  // ------------------------------------------------------------------

  /** Create the standard starting board (8×8). */
  _startingBoard() {
    const b = Array.from({ length: 8 }, () => Array(8).fill(null));
    const backRank = ['r','n','b','q','k','b','n','r'];
    for (let c = 0; c < 8; c++) {
      b[0][c] = backRank[c];      // Black back rank
      b[1][c] = 'p';              // Black pawns
      b[6][c] = 'P';              // White pawns
      b[7][c] = backRank[c].toUpperCase(); // White back rank
    }
    return b;
  }

  // ------------------------------------------------------------------
  // Internal helpers — piece / color utils
  // ------------------------------------------------------------------

  /** Return 'white' or 'black' for a piece character. */
  _pieceColor(p) {
    return p === p.toUpperCase() ? 'white' : 'black';
  }

  /** Return the opponent's color. */
  _opponent(color) {
    return color === 'white' ? 'black' : 'white';
  }

  /** Is (r, c) on the board? */
  _inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  /** Convert a row, col to algebraic notation (e.g., 'e4'). */
  _coordToAlgebraic(r, c) {
    return String.fromCharCode(97 + c) + (8 - r);
  }

  // ------------------------------------------------------------------
  // Pseudo-legal move generation
  // ------------------------------------------------------------------

  /**
   * Generate pseudo-legal moves for piece at (row, col).
   * Does NOT check for self-check. Promotion pieces default to 'Q'.
   */
  _pseudoMoves(row, col, piece) {
    const lower = piece.toLowerCase();
    const color = this._pieceColor(piece);
    switch (lower) {
      case 'p': return this._pawnMoves(row, col, color);
      case 'n': return this._knightMoves(row, col, color);
      case 'b': return this._bishopMoves(row, col, color);
      case 'r': return this._rookMoves(row, col, color);
      case 'q': return this._queenMoves(row, col, color);
      case 'k': return this._kingMoves(row, col, color);
      default: return [];
    }
  }

  _pawnMoves(row, col, color) {
    const moves = [];
    const dir = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    const promoRow = color === 'white' ? 0 : 7;

    // Single push
    const nr = row + dir;
    if (this._inBounds(nr, col) && !this._board[nr][col]) {
      if (nr === promoRow) {
        ['Q','R','B','N'].forEach(pp => moves.push({ from: [row, col], to: [nr, col], promotionPiece: pp }));
      } else {
        moves.push({ from: [row, col], to: [nr, col] });
      }

      // Double push from start
      const dr = row + 2 * dir;
      if (row === startRow && !this._board[dr][col]) {
        moves.push({ from: [row, col], to: [dr, col] });
      }
    }

    // Captures
    for (const dc of [-1, 1]) {
      const nc = col + dc;
      if (!this._inBounds(nr, nc)) continue;
      const target = this._board[nr][nc];
      if (target && this._pieceColor(target) !== color) {
        if (nr === promoRow) {
          ['Q','R','B','N'].forEach(pp => moves.push({ from: [row, col], to: [nr, nc], promotionPiece: pp }));
        } else {
          moves.push({ from: [row, col], to: [nr, nc] });
        }
      }
      // En passant
      if (this._enPassantTarget && this._enPassantTarget[0] === nr && this._enPassantTarget[1] === nc) {
        moves.push({ from: [row, col], to: [nr, nc], enPassant: true });
      }
    }
    return moves;
  }

  _knightMoves(row, col, color) {
    const moves = [];
    const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of offsets) {
      const nr = row + dr, nc = col + dc;
      if (!this._inBounds(nr, nc)) continue;
      const t = this._board[nr][nc];
      if (!t || this._pieceColor(t) !== color) {
        moves.push({ from: [row, col], to: [nr, nc] });
      }
    }
    return moves;
  }

  _slidingMoves(row, col, color, directions) {
    const moves = [];
    for (const [dr, dc] of directions) {
      let nr = row + dr, nc = col + dc;
      while (this._inBounds(nr, nc)) {
        const t = this._board[nr][nc];
        if (!t) {
          moves.push({ from: [row, col], to: [nr, nc] });
        } else {
          if (this._pieceColor(t) !== color) {
            moves.push({ from: [row, col], to: [nr, nc] });
          }
          break;
        }
        nr += dr; nc += dc;
      }
    }
    return moves;
  }

  _bishopMoves(row, col, color) {
    return this._slidingMoves(row, col, color, [[-1,-1],[-1,1],[1,-1],[1,1]]);
  }

  _rookMoves(row, col, color) {
    return this._slidingMoves(row, col, color, [[-1,0],[1,0],[0,-1],[0,1]]);
  }

  _queenMoves(row, col, color) {
    return [...this._bishopMoves(row, col, color), ...this._rookMoves(row, col, color)];
  }

  _kingMoves(row, col, color) {
    const moves = [];
    const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (const [dr, dc] of offsets) {
      const nr = row + dr, nc = col + dc;
      if (!this._inBounds(nr, nc)) continue;
      const t = this._board[nr][nc];
      if (!t || this._pieceColor(t) !== color) {
        moves.push({ from: [row, col], to: [nr, nc] });
      }
    }
    // Castling
    moves.push(...this._castlingMoves(row, col, color));
    return moves;
  }

  _castlingMoves(row, col, color) {
    const moves = [];
    const opponent = this._opponent(color);

    if (color === 'white' && row === 7 && col === 4) {
      // Kingside (O-O)
      if (this._castling.K &&
          !this._board[7][5] && !this._board[7][6] &&
          this._board[7][7] === 'R' &&
          !this._isSquareAttacked(7, 4, opponent) &&
          !this._isSquareAttacked(7, 5, opponent) &&
          !this._isSquareAttacked(7, 6, opponent)) {
        moves.push({ from: [7, 4], to: [7, 6], castling: 'K' });
      }
      // Queenside (O-O-O)
      if (this._castling.Q &&
          !this._board[7][3] && !this._board[7][2] && !this._board[7][1] &&
          this._board[7][0] === 'R' &&
          !this._isSquareAttacked(7, 4, opponent) &&
          !this._isSquareAttacked(7, 3, opponent) &&
          !this._isSquareAttacked(7, 2, opponent)) {
        moves.push({ from: [7, 4], to: [7, 2], castling: 'Q' });
      }
    } else if (color === 'black' && row === 0 && col === 4) {
      // Kingside
      if (this._castling.k &&
          !this._board[0][5] && !this._board[0][6] &&
          this._board[0][7] === 'r' &&
          !this._isSquareAttacked(0, 4, opponent) &&
          !this._isSquareAttacked(0, 5, opponent) &&
          !this._isSquareAttacked(0, 6, opponent)) {
        moves.push({ from: [0, 4], to: [0, 6], castling: 'k' });
      }
      // Queenside
      if (this._castling.q &&
          !this._board[0][3] && !this._board[0][2] && !this._board[0][1] &&
          this._board[0][0] === 'r' &&
          !this._isSquareAttacked(0, 4, opponent) &&
          !this._isSquareAttacked(0, 3, opponent) &&
          !this._isSquareAttacked(0, 2, opponent)) {
        moves.push({ from: [0, 4], to: [0, 2], castling: 'q' });
      }
    }
    return moves;
  }

  // ------------------------------------------------------------------
  // Attack detection
  // ------------------------------------------------------------------

  /**
   * Is square (r, c) attacked by any piece of the given color?
   */
  _isSquareAttacked(r, c, byColor) {
    // Check knight attacks
    const knightChar = byColor === 'white' ? 'N' : 'n';
    const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of knightOffsets) {
      const nr = r + dr, nc = c + dc;
      if (this._inBounds(nr, nc) && this._board[nr][nc] === knightChar) return true;
    }

    // Check pawn attacks
    const pawnDir = byColor === 'white' ? 1 : -1; // direction pawns attack FROM
    const pawnChar = byColor === 'white' ? 'P' : 'p';
    for (const dc of [-1, 1]) {
      const nr = r + pawnDir, nc = c + dc;
      if (this._inBounds(nr, nc) && this._board[nr][nc] === pawnChar) return true;
    }

    // Check king attacks
    const kingChar = byColor === 'white' ? 'K' : 'k';
    const kingOffsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (const [dr, dc] of kingOffsets) {
      const nr = r + dr, nc = c + dc;
      if (this._inBounds(nr, nc) && this._board[nr][nc] === kingChar) return true;
    }

    // Check sliding piece attacks (bishop/rook/queen)
    const bishopChar = byColor === 'white' ? 'B' : 'b';
    const rookChar = byColor === 'white' ? 'R' : 'r';
    const queenChar = byColor === 'white' ? 'Q' : 'q';

    // Diagonal (bishop/queen)
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nr = r + dr, nc = c + dc;
      while (this._inBounds(nr, nc)) {
        const p = this._board[nr][nc];
        if (p) {
          if (p === bishopChar || p === queenChar) return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }

    // Straight (rook/queen)
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let nr = r + dr, nc = c + dc;
      while (this._inBounds(nr, nc)) {
        const p = this._board[nr][nc];
        if (p) {
          if (p === rookChar || p === queenChar) return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }

    return false;
  }

  // ------------------------------------------------------------------
  // Legality filtering
  // ------------------------------------------------------------------

  /**
   * Test whether a pseudo-legal move is legal (does not leave own king in check).
   */
  _isLegalAfterMove(move, color) {
    // Simulate the move on a copy
    const saved = this._saveState();
    this._applyMove(move.from[0], move.from[1], move.to[0], move.to[1], move.promotionPiece || 'Q');
    const legal = !this.isInCheck(color);
    this._restoreState(saved);
    return legal;
  }

  /** Does the given color have any legal move in the current position? */
  _hasAnyLegalMove(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this._board[r][c];
        if (p && this._pieceColor(p) === color) {
          const pseudo = this._pseudoMoves(r, c, p);
          for (const m of pseudo) {
            if (this._isLegalAfterMove(m, color)) return true;
          }
        }
      }
    }
    return false;
  }

  // ------------------------------------------------------------------
  // Move application (mutates state)
  // ------------------------------------------------------------------

  /**
   * Apply a move to the board. Does NOT validate legality.
   * Handles normal moves, captures, castling, en passant, promotion.
   */
  _applyMove(fr, fc, tr, tc, promotionPiece) {
    const piece = this._board[fr][fc];
    const lower = piece.toLowerCase();
    const color = this._pieceColor(piece);
    const captured = this._board[tr][tc];

    // Save for undo is handled by caller

    // En passant capture
    if (lower === 'p' && this._enPassantTarget &&
        tr === this._enPassantTarget[0] && tc === this._enPassantTarget[1]) {
      const capturedPawnRow = fr; // same row as moving pawn
      this._board[capturedPawnRow][tc] = null;
    }

    // Move the piece
    this._board[tr][tc] = piece;
    this._board[fr][fc] = null;

    // Castling — move the rook
    if (lower === 'k' && Math.abs(tc - fc) === 2) {
      if (tc === 6) { // kingside
        this._board[tr][5] = this._board[tr][7];
        this._board[tr][7] = null;
      } else if (tc === 2) { // queenside
        this._board[tr][3] = this._board[tr][0];
        this._board[tr][0] = null;
      }
    }

    // Promotion
    if (lower === 'p' && (tr === 0 || tr === 7)) {
      const promoChar = color === 'white' ? promotionPiece.toUpperCase() : promotionPiece.toLowerCase();
      this._board[tr][tc] = promoChar;
    }

    // Update en passant target
    if (lower === 'p' && Math.abs(tr - fr) === 2) {
      this._enPassantTarget = [(fr + tr) / 2, fc];
    } else {
      this._enPassantTarget = null;
    }

    // Update castling rights
    if (lower === 'k') {
      if (color === 'white') { this._castling.K = false; this._castling.Q = false; }
      else { this._castling.k = false; this._castling.q = false; }
    }
    if (lower === 'r') {
      if (fr === 7 && fc === 0) this._castling.Q = false;
      if (fr === 7 && fc === 7) this._castling.K = false;
      if (fr === 0 && fc === 0) this._castling.q = false;
      if (fr === 0 && fc === 7) this._castling.k = false;
    }
    // If a rook is captured
    if (tr === 7 && tc === 0) this._castling.Q = false;
    if (tr === 7 && tc === 7) this._castling.K = false;
    if (tr === 0 && tc === 0) this._castling.q = false;
    if (tr === 0 && tc === 7) this._castling.k = false;

    // Update halfmove clock
    if (lower === 'p' || captured) {
      this._halfmoveClock = 0;
    } else {
      this._halfmoveClock++;
    }

    // Update fullmove number
    if (color === 'black') {
      this._fullmoveNumber++;
    }

    // Switch turn
    this._turn = this._opponent(color);
  }

  // ------------------------------------------------------------------
  // State save/restore (for legality testing)
  // ------------------------------------------------------------------

  _saveState() {
    return {
      board: this._board.map(r => [...r]),
      turn: this._turn,
      castling: { ...this._castling },
      enPassantTarget: this._enPassantTarget ? [...this._enPassantTarget] : null,
      halfmoveClock: this._halfmoveClock,
      fullmoveNumber: this._fullmoveNumber,
    };
  }

  _restoreState(s) {
    this._board = s.board;
    this._turn = s.turn;
    this._castling = s.castling;
    this._enPassantTarget = s.enPassantTarget;
    this._halfmoveClock = s.halfmoveClock;
    this._fullmoveNumber = s.fullmoveNumber;
  }
}

// Export for both CommonJS and ES module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChessEngine };
}
export { ChessEngine };
