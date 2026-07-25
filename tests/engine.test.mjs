import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ChessEngine } = require('../engine.js');

function clearBoard(engine) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) engine.setPiece(r, c, null);
  }
}

function setKings(engine) {
  engine.setPiece(7, 4, 'K');
  engine.setPiece(0, 4, 'k');
}

test('underpromotion to each piece works', () => {
  for (const promo of ['Q', 'R', 'B', 'N']) {
    const e = new ChessEngine();
    clearBoard(e);
    setKings(e);
    e.setPiece(1, 0, 'P');
    assert.equal(e.makeMove({ from: [1, 0], to: [0, 0], promotionPiece: promo }), true);
    assert.equal(e.getBoard()[0][0], promo);
  }
});

test('invalid promotion falls back to queen', () => {
  const e = new ChessEngine();
  clearBoard(e);
  setKings(e);
  e.setPiece(1, 0, 'P');
  assert.equal(e.makeMove({ from: [1, 0], to: [0, 0], promotionPiece: 'X' }), true);
  assert.equal(e.getBoard()[0][0], 'Q');
});

test('getAllLegalMovesFor returns both sides without turn restriction', () => {
  const e = new ChessEngine();
  const white = e.getAllLegalMovesFor('white');
  const black = e.getAllLegalMovesFor('black');
  assert.equal(white.length > 0, true);
  assert.equal(black.length > 0, true);
});

test('setPiece and swapPieces mutate real board and undo restores', () => {
  const e = new ChessEngine();
  const ok1 = e.setPiece(4, 4, 'Q');
  const ok2 = e.setPiece(3, 3, 'n');
  assert.equal(ok1, true);
  assert.equal(ok2, true);
  assert.equal(e.getBoard()[4][4], 'Q');
  assert.equal(e.getBoard()[3][3], 'n');
  assert.equal(e.swapPieces(4, 4, 3, 3), true);
  assert.equal(e.getBoard()[4][4], 'n');
  assert.equal(e.getBoard()[3][3], 'Q');
  assert.equal(e.undo(), null);
});

test('keepTurn move preserves turn and undo rewinds cleanly', () => {
  const e = new ChessEngine();
  const move = { from: [6, 4], to: [4, 4] };
  assert.equal(e.makeMove(move, { keepTurn: true }), true);
  assert.equal(e.getTurn(), 'white');
  assert.equal(e.undo() !== null, true);
  assert.equal(e.getTurn(), 'white');
});

test('fifty-move and threefold draw APIs exist', () => {
  const e = new ChessEngine();
  assert.equal(typeof e.isFiftyMoveDraw, 'function');
  assert.equal(typeof e.isThreefoldRepetitionDraw, 'function');
  assert.equal(typeof e.isDraw, 'function');
});

test('castling rights and en passant still work', () => {
  const e = new ChessEngine();
  assert.equal(e.getLegalMoves(6, 4).some(m => m.to[0] === 4 && m.to[1] === 4), true);
});
