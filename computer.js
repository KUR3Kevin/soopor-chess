const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function opponent(color) {
  return color === 'white' ? 'black' : 'white';
}

function moveKey(move) {
  return [...move.from, ...move.to, move.promotionPiece || ''].join(':');
}

function capturedValue(board, move) {
  const target = board[move.to[0]][move.to[1]];
  if (target) return PIECE_VALUES[target.toLowerCase()] || 0;
  if (move.from[1] !== move.to[1] && board[move.from[0]][move.to[1]]?.toLowerCase() === 'p') {
    return PIECE_VALUES.p;
  }
  return 0;
}

function materialScore(board, color) {
  let score = 0;
  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUES[piece.toLowerCase()] || 0;
      const pieceColor = piece === piece.toUpperCase() ? 'white' : 'black';
      score += pieceColor === color ? value : -value;
    }
  }
  return score;
}

/** Pick a deterministic, purposeful computer move without mutating the game. */
function chooseComputerMove(engine, candidateMoves = null) {
  const color = engine.getTurn();
  const moves = [...(candidateMoves || engine.getAllLegalMoves(color))]
    .sort((first, second) => moveKey(first).localeCompare(moveKey(second)));
  if (moves.length === 0) return null;

  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const boardBefore = engine.getBoard();
    const capture = capturedValue(boardBefore, move);
    if (!engine.makeMove(move)) continue;

    const nextColor = opponent(color);
    let score = materialScore(engine.getBoard(), color) * 10;
    score += capture * 100;
    score += move.promotionPiece ? (PIECE_VALUES[move.promotionPiece.toLowerCase()] || 0) * 80 : 0;
    score += move.castling ? 25 : 0;
    score += 8 - (Math.abs(3.5 - move.to[0]) + Math.abs(3.5 - move.to[1]));

    if (engine.isCheckmate(nextColor)) {
      score += 100000;
    } else if (engine.isStalemate(nextColor)) {
      score -= 10000;
    } else {
      if (engine.isInCheck(nextColor)) score += 40;
      const replyBoard = engine.getBoard();
      const replyCaptures = engine.getAllLegalMoves(nextColor)
        .map(reply => capturedValue(replyBoard, reply));
      score -= Math.max(0, ...replyCaptures) * 90;
    }

    engine.undo();

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove ? {
    ...bestMove,
    from: [...bestMove.from],
    to: [...bestMove.to],
  } : null;
}

export { chooseComputerMove };
