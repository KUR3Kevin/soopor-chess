import assert from 'node:assert/strict';
import test from 'node:test';

import { ChessEngine } from './engine.js';

test('normal moves do not carry promotion metadata', () => {
  const engine = new ChessEngine();

  assert.equal(engine.makeMove({ from: [6, 4], to: [4, 4] }), true);
  assert.deepEqual(engine.getMoveHistory(), [{ from: [6, 4], to: [4, 4] }]);
});

test('underpromotion uses the requested piece', () => {
  const engine = new ChessEngine();
  engine._board = Array.from({ length: 8 }, () => Array(8).fill(null));
  engine._board[7][4] = 'K';
  engine._board[0][4] = 'k';
  engine._board[1][0] = 'P';

  assert.equal(
    engine.makeMove({ from: [1, 0], to: [0, 0], promotionPiece: 'N' }),
    true,
  );
  assert.equal(engine.getBoard()[0][0], 'N');
  assert.deepEqual(engine.getMoveHistory(), [
    { from: [1, 0], to: [0, 0], promotionPiece: 'N' },
  ]);
});

test('invalid promotion pieces are rejected', () => {
  const engine = new ChessEngine();
  engine._board = Array.from({ length: 8 }, () => Array(8).fill(null));
  engine._board[7][4] = 'K';
  engine._board[0][4] = 'k';
  engine._board[1][0] = 'P';

  assert.equal(
    engine.makeMove({ from: [1, 0], to: [0, 0], promotionPiece: 'K' }),
    false,
  );
  assert.equal(engine.getBoard()[1][0], 'P');
});

test('castling metadata and rook movement are preserved', () => {
  const engine = new ChessEngine();
  engine._board = Array.from({ length: 8 }, () => Array(8).fill(null));
  engine._board[7][4] = 'K';
  engine._board[7][7] = 'R';
  engine._board[0][4] = 'k';
  engine._castling = { K: true, Q: false, k: false, q: false };

  assert.equal(engine.makeMove({ from: [7, 4], to: [7, 6] }), true);
  assert.equal(engine.getBoard()[7][5], 'R');
  assert.deepEqual(engine.getMoveHistory(), [
    { from: [7, 4], to: [7, 6], castling: 'K' },
  ]);
});

test('opening move generation matches standard chess perft counts', () => {
  const engine = new ChessEngine();

  assert.equal(engine.getAllLegalMoves('white').length, 20);
  let depthTwoCount = 0;
  for (const move of engine.getAllLegalMoves('white')) {
    assert.equal(engine.makeMove(move), true);
    depthTwoCount += engine.getAllLegalMoves('black').length;
    engine.undo();
  }
  assert.equal(depthTwoCount, 400);
});

test('en passant capture and undo restore the full position', () => {
  const engine = new ChessEngine();
  const initialFen = engine.getFEN();
  const moves = [
    { from: [6, 4], to: [4, 4] },
    { from: [1, 0], to: [2, 0] },
    { from: [4, 4], to: [3, 4] },
    { from: [1, 3], to: [3, 3] },
    { from: [3, 4], to: [2, 3] },
  ];

  for (const move of moves) assert.equal(engine.makeMove(move), true);
  assert.equal(engine.getBoard()[3][3], null);
  assert.equal(engine.getBoard()[2][3], 'P');

  for (let index = 0; index < moves.length; index++) engine.undo();
  assert.equal(engine.getFEN(), initialFen);
});

test('fools mate is detected as checkmate', () => {
  const engine = new ChessEngine();
  const moves = [
    { from: [6, 5], to: [5, 5] },
    { from: [1, 4], to: [3, 4] },
    { from: [6, 6], to: [4, 6] },
    { from: [0, 3], to: [4, 7] },
  ];

  for (const move of moves) assert.equal(engine.makeMove(move), true);
  assert.equal(engine.isCheckmate('white'), true);
});

test('stalemate is detected', () => {
  const engine = new ChessEngine();
  engine._board = Array.from({ length: 8 }, () => Array(8).fill(null));
  engine._board[0][0] = 'k';
  engine._board[2][1] = 'Q';
  engine._board[2][2] = 'K';
  engine._turn = 'black';
  engine._castling = { K: false, Q: false, k: false, q: false };

  assert.equal(engine.isInCheck('black'), false);
  assert.equal(engine.isStalemate('black'), true);
});

test('analysis can inspect the non-turn side without changing the turn', () => {
  const engine = new ChessEngine();

  assert.equal(engine.getAllLegalMoves('black').length, 0);
  assert.equal(engine.getAllLegalMovesFor('black').length, 20);
  assert.equal(engine.getTurn(), 'white');
});

test('variant abilities update the engine board safely', () => {
  const engine = new ChessEngine();
  engine._board[7][3] = null;

  assert.equal(engine.restorePiece('Q', 7, 3), true);
  assert.equal(engine.getBoard()[7][3], 'Q');
  assert.equal(engine.swapPieces([7, 3], [7, 4]), true);
  assert.equal(engine.getBoard()[7][3], 'K');
  assert.equal(engine.getBoard()[7][4], 'Q');
  assert.equal(engine.getFEN().split(' ')[2].includes('K'), false);
});

test('retained turns support an overclocked follow-up move and undo', () => {
  const engine = new ChessEngine();

  assert.equal(engine.makeMove({ from: [7, 6], to: [5, 5] }, { retainTurn: true }), true);
  assert.equal(engine.getTurn(), 'white');
  assert.equal(engine.makeMove({ from: [5, 5], to: [3, 4] }), true);
  assert.equal(engine.getTurn(), 'black');
  engine.undo();
  assert.equal(engine.getTurn(), 'white');
  engine.undo();
  assert.equal(engine.getFEN(), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
});
