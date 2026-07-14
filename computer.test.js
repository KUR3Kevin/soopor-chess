import assert from 'node:assert/strict';
import test from 'node:test';

import { chooseComputerMove } from './computer.js';
import { ChessEngine } from './engine.js';

test('computer chooses a legal reply without mutating the game', () => {
  const engine = new ChessEngine();
  assert.equal(engine.makeMove({ from: [6, 4], to: [4, 4] }), true);

  const fenBefore = engine.getFEN();
  const historyBefore = engine.getMoveHistory();
  const move = chooseComputerMove(engine);

  assert.ok(move);
  assert.ok(engine.getAllLegalMoves('black').some(candidate =>
    candidate.from[0] === move.from[0] &&
    candidate.from[1] === move.from[1] &&
    candidate.to[0] === move.to[0] &&
    candidate.to[1] === move.to[1]
  ));
  assert.equal(engine.getFEN(), fenBefore);
  assert.deepEqual(engine.getMoveHistory(), historyBefore);
});

test('computer prioritizes a free queen capture', () => {
  const engine = new ChessEngine();
  engine._board = Array.from({ length: 8 }, () => Array(8).fill(null));
  engine._board[0][0] = 'r';
  engine._board[0][4] = 'k';
  engine._board[7][0] = 'Q';
  engine._board[7][4] = 'K';
  engine._turn = 'black';
  engine._castling = { K: false, Q: false, k: false, q: false };

  assert.deepEqual(chooseComputerMove(engine), { from: [0, 0], to: [7, 0] });
});

test('computer respects a filtered move list', () => {
  const engine = new ChessEngine();
  assert.equal(engine.makeMove({ from: [6, 4], to: [4, 4] }), true);
  const allowedMove = engine.getAllLegalMoves('black')[0];

  assert.deepEqual(chooseComputerMove(engine, [allowedMove]), allowedMove);
});
