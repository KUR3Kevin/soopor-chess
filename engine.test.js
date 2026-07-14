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
