/**
 * Grandmaster Chess AI - Core Logic
 */

class ChessGame {
    constructor() {
        this.board = [];
        this.turn = 'white';
        this.history = [];
        this.gameOver = false;
        this.selectedSquare = null;
        this.validMoves = [];
        this.initBoard();
    }

    initBoard() {
        // Standard starting position
        // r n b q k b n r
        // p p p p p p p p
        // . . . . . . . .
        // . . . . . . . .
        // . . . . . . . .
        // . . . . . . . .
        // P P P P P P P P
        // R N B Q K B N R

        const layout = [
            ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
            ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
            ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
        ];
        this.board = layout.map(row => [...row]);
    }

    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.getPiece(fromRow, fromCol);
        if (!piece || piece[0] !== this.turn[0]) return false;

        const moves = this.getValidMoves(fromRow, fromCol);
        return moves.some(m => m.row === toRow && m.col === toCol);
    }

    getValidMoves(row, col) {
        const piece = this.getPiece(row, col);
        if (!piece) return [];

        const type = piece[1];
        const color = piece[0];
        let moves = [];

        switch (type) {
            case 'p': moves = this.getPawnMoves(row, col, color); break;
            case 'r': moves = this.getRookMoves(row, col, color); break;
            case 'n': moves = this.getKnightMoves(row, col, color); break;
            case 'b': moves = this.getBishopMoves(row, col, color); break;
            case 'q': moves = this.getQueenMoves(row, col, color); break;
            case 'k': moves = this.getKingMoves(row, col, color); break;
        }

        // Filter moves that would put/leave king in check
        return moves.filter(move => !this.wouldBeInCheck(row, col, move.row, move.col, color));
    }

    getPawnMoves(row, col, color) {
        const moves = [];
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;

        // Forward
        if (!this.getPiece(row + dir, col)) {
            moves.push({ row: row + dir, col });
            // Double jump
            if (row === startRow && !this.getPiece(row + 2 * dir, col)) {
                moves.push({ row: row + 2 * dir, col });
            }
        }

        // Captures
        for (let dCol of [-1, 1]) {
            const target = this.getPiece(row + dir, col + dCol);
            if (target && target[0] !== color) {
                moves.push({ row: row + dir, col: col + dCol });
            }
        }

        // TODO: En passant
        return moves;
    }

    getRookMoves(row, col, color) {
        const moves = [];
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let [dr, dc] of dirs) {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const target = this.getPiece(r, c);
                if (!target) moves.push({ row: r, col: c });
                else {
                    if (target[0] !== color) moves.push({ row: r, col: c });
                    break;
                }
                r += dr; c += dc;
            }
        }
        return moves;
    }

    getKnightMoves(row, col, color) {
        const moves = [];
        const steps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (let [dr, dc] of steps) {
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const target = this.getPiece(r, c);
                if (!target || target[0] !== color) moves.push({ row: r, col: c });
            }
        }
        return moves;
    }

    getBishopMoves(row, col, color) {
        const moves = [];
        const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (let [dr, dc] of dirs) {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const target = this.getPiece(r, c);
                if (!target) moves.push({ row: r, col: c });
                else {
                    if (target[0] !== color) moves.push({ row: r, col: c });
                    break;
                }
                r += dr; c += dc;
            }
        }
        return moves;
    }

    getQueenMoves(row, col, color) {
        return [...this.getRookMoves(row, col, color), ...this.getBishopMoves(row, col, color)];
    }

    getKingMoves(row, col, color) {
        const moves = [];
        const steps = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        for (let [dr, dc] of steps) {
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const target = this.getPiece(r, c);
                if (!target || target[0] !== color) moves.push({ row: r, col: c });
            }
        }
        // TODO: Castling
        return moves;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const captured = this.board[toRow][toCol];
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Handle pawn promotion (auto-queen for simplicity)
        if (piece[1] === 'p' && (toRow === 0 || toRow === 7)) {
            this.board[toRow][toCol] = piece[0] + 'q';
        }

        this.turn = this.turn === 'white' ? 'black' : 'white';
        this.history.push({
            piece,
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            captured
        });

        this.checkGameState();
    }

    checkGameState() {
        const color = this.turn === 'white' ? 'w' : 'b';
        const hasMoves = this.hasValidMoves(color);

        if (!hasMoves) {
            this.gameOver = true;
            if (this.isInCheck(color)) {
                this.winner = color === 'w' ? 'black' : 'white';
            } else {
                this.winner = 'draw';
            }
        }
    }

    hasValidMoves(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece[0] === color) {
                    if (this.getValidMoves(r, c).length > 0) return true;
                }
            }
        }
        return false;
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
        const originalBoard = this.board.map(row => [...row]);

        // Simulate move
        this.board[toRow][toCol] = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;

        const inCheck = this.isInCheck(color);

        // Restore board
        this.board = originalBoard;
        return inCheck;
    }

    isInCheck(color) {
        // Find king
        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece === color + 'k') {
                    kingPos = { r, c };
                    break;
                }
            }
            if (kingPos) break;
        }

        if (!kingPos) return false; // Should not happen in normal chess
        return this.isSquareAttacked(kingPos.r, kingPos.c, color === 'w' ? 'b' : 'w');
    }

    isSquareAttacked(row, col, attackerColor) {
        const dirs = [
            [0, 1], [0, -1], [1, 0], [-1, 0], // Rook/Queen
            [1, 1], [1, -1], [-1, 1], [-1, -1] // Bishop/Queen
        ];

        // Check sliding pieces
        for (let i = 0; i < 8; i++) {
            const [dr, dc] = dirs[i];
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const piece = this.board[r][c];
                if (piece) {
                    if (piece[0] === attackerColor) {
                        const type = piece[1];
                        if (i < 4 && (type === 'r' || type === 'q')) return true;
                        if (i >= 4 && (type === 'b' || type === 'q')) return true;
                    }
                    break;
                }
                r += dr; c += dc;
            }
        }

        // Check knights
        const knightSteps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (let [dr, dc] of knightSteps) {
            const r = row + dr, c = col + dc;
            const piece = this.getPiece(r, c);
            if (piece === attackerColor + 'n') return true;
        }

        // Check pawns
        const pawnDir = attackerColor === 'w' ? 1 : -1;
        for (let dc of [-1, 1]) {
            const piece = this.getPiece(row + pawnDir, col + dc);
            if (piece === attackerColor + 'p') return true;
        }

        // Check king (to prevent kings from moving next to each other)
        const kingSteps = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        for (let [dr, dc] of kingSteps) {
            const r = row + dr, c = col + dc;
            const piece = this.getPiece(r, c);
            if (piece === attackerColor + 'k') return true;
        }

        return false;
    }
}

class ChessUI {
    constructor(game) {
        this.game = game;
        this.boardElement = document.getElementById('chessboard');
        this.init();
    }

    init() {
        this.render();
        document.getElementById('new-game').addEventListener('click', () => {
            this.game = new ChessGame();
            const statusAlert = document.getElementById('game-status');
            if (statusAlert) statusAlert.classList.add('hidden');
            document.getElementById('ai-status').innerText = 'Waiting...';
            document.getElementById('player-status').innerText = 'Your turn';
            this.render();
        });
    }

    render() {
        this.boardElement.innerHTML = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');
                square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = r;
                square.dataset.col = c;

                const piece = this.game.board[r][c];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.classList.add('piece');
                    pieceElement.classList.add(piece);
                    square.appendChild(pieceElement);
                }

                square.addEventListener('click', () => this.handleSquareClick(r, c));
                this.boardElement.appendChild(square);
            }
        }
        this.updateMoveHistory();
    }

    updateMoveHistory() {
        const historyContainer = document.getElementById('move-history');
        if (!historyContainer) return;
        historyContainer.innerHTML = '';

        for (let i = 0; i < this.game.history.length; i += 2) {
            const row = document.createElement('div');
            row.className = 'move-row';

            const num = document.createElement('span');
            num.className = 'move-num';
            num.innerText = `${Math.floor(i / 2) + 1}.`;
            row.appendChild(num);

            const whiteMove = document.createElement('span');
            whiteMove.innerText = this.formatMove(this.game.history[i]);
            row.appendChild(whiteMove);

            if (this.game.history[i + 1]) {
                const blackMove = document.createElement('span');
                blackMove.innerText = this.formatMove(this.game.history[i + 1]);
                row.appendChild(blackMove);
            }

            historyContainer.appendChild(row);
        }

        requestAnimationFrame(() => {
            historyContainer.scrollTop = historyContainer.scrollHeight;
        });
    }

    formatMove(move) {
        const cols = 'abcdefgh';
        const toSquare = cols[move.to.col] + (8 - move.to.row);
        let pieceLetter = move.piece[1].toUpperCase();

        if (pieceLetter === 'P') {
            return move.captured ? cols[move.from.col] + 'x' + toSquare : toSquare;
        }
        return pieceLetter + (move.captured ? 'x' : '') + toSquare;
    }

    handleSquareClick(row, col) {
        if (this.game.gameOver) return;
        const piece = this.game.getPiece(row, col);

        if (this.game.selectedSquare) {
            const { row: fromRow, col: fromCol } = this.game.selectedSquare;
            if (this.game.isValidMove(fromRow, fromCol, row, col)) {
                this.game.makeMove(fromRow, fromCol, row, col);
                this.game.selectedSquare = null;
                this.render();

                if (this.game.gameOver) {
                    this.showGameOver();
                } else {
                    setTimeout(() => this.makeAIMove(), 500);
                }
            } else {
                this.game.selectedSquare = (piece && piece[0] === this.game.turn[0]) ? { row, col } : null;
                this.render();
                if (this.game.selectedSquare) this.highlightSquare(row, col);
            }
        } else if (piece && piece[0] === this.game.turn[0]) {
            this.game.selectedSquare = { row, col };
            this.render();
            this.highlightSquare(row, col);
        }
    }

    showGameOver() {
        const statusAlert = document.getElementById('game-status');
        const statusMessage = document.getElementById('status-message');
        if (statusAlert) statusAlert.classList.remove('hidden');

        if (statusMessage) {
            if (this.game.winner === 'draw') {
                statusMessage.innerText = 'Stalemate! It\'s a draw.';
            } else {
                statusMessage.innerText = `Checkmate! ${this.game.winner.charAt(0).toUpperCase() + this.game.winner.slice(1)} wins.`;
            }
        }
    }

    highlightSquare(row, col) {
        const index = row * 8 + col;
        this.boardElement.children[index].classList.add('selected');
        const moves = this.game.getValidMoves(row, col);
        moves.forEach(m => {
            this.boardElement.children[m.row * 8 + m.col].classList.add('valid-move');
        });
    }

    makeAIMove() {
        if (this.game.turn === 'black' && !this.game.gameOver) {
            const aiStatus = document.getElementById('ai-status');
            if (aiStatus) aiStatus.innerText = 'Thinking...';

            setTimeout(() => {
                const difficulty = parseInt(document.getElementById('difficulty').value);
                const bestMove = this.getBestMove(this.game, difficulty);

                if (bestMove) {
                    this.game.makeMove(bestMove.from.r, bestMove.from.c, bestMove.to.row, bestMove.to.col);
                    this.render();

                    if (this.game.gameOver) {
                        this.showGameOver();
                        if (aiStatus) aiStatus.innerText = 'Game Over';
                    } else {
                        if (aiStatus) aiStatus.innerText = 'Waiting...';
                        const playerStatus = document.getElementById('player-status');
                        if (playerStatus) playerStatus.innerText = 'Your turn';
                    }
                } else {
                    this.game.gameOver = true;
                    this.showGameOver();
                }
            }, 50);
        }
    }

    getBestMove(game, depth) {
        let bestMove = null;
        let bestValue = -Infinity;
        const moves = this.getAllMoves(game, 'black');
        moves.sort(() => Math.random() - 0.5);

        for (let move of moves) {
            const originalBoard = game.board.map(row => [...row]);
            game.board[move.to.row][move.to.col] = game.board[move.from.r][move.from.c];
            game.board[move.from.r][move.from.c] = null;

            const boardValue = -this.minimax(game, depth - 1, -Infinity, Infinity, true);
            game.board = originalBoard;

            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        }
        return bestMove;
    }

    minimax(game, depth, alpha, beta, isMaximizingPlayer) {
        if (depth === 0) return this.evaluateBoard(game.board);
        const moves = this.getAllMoves(game, isMaximizingPlayer ? 'white' : 'black');
        if (moves.length === 0) return isMaximizingPlayer ? -9999 : 9999;

        if (isMaximizingPlayer) {
            let bestValue = -Infinity;
            for (let move of moves) {
                const originalBoard = game.board.map(row => [...row]);
                game.board[move.to.row][move.to.col] = game.board[move.from.r][move.from.c];
                game.board[move.from.r][move.from.c] = null;
                bestValue = Math.max(bestValue, this.minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
                game.board = originalBoard;
                alpha = Math.max(alpha, bestValue);
                if (beta <= alpha) break;
            }
            return bestValue;
        } else {
            let bestValue = Infinity;
            for (let move of moves) {
                const originalBoard = game.board.map(row => [...row]);
                game.board[move.to.row][move.to.col] = game.board[move.from.r][move.from.c];
                game.board[move.from.r][move.from.c] = null;
                bestValue = Math.min(bestValue, this.minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
                game.board = originalBoard;
                beta = Math.min(beta, bestValue);
                if (beta <= alpha) break;
            }
            return bestValue;
        }
    }

    evaluateBoard(board) {
        let totalEvaluation = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                totalEvaluation += this.getPieceValue(board[r][c], r, c);
            }
        }
        return totalEvaluation;
    }

    getPieceValue(piece, x, y) {
        if (!piece) return 0;
        const absoluteValue = { 'p': 10, 'r': 50, 'n': 30, 'b': 30, 'q': 90, 'k': 900 }[piece[1]];
        return piece[0] === 'w' ? absoluteValue : -absoluteValue;
    }

    getAllMoves(game, color) {
        const allMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = game.getPiece(r, c);
                if (piece && (color === 'white' ? piece[0] === 'w' : piece[0] === 'b')) {
                    const moves = game.getValidMoves(r, c);
                    moves.forEach(m => allMoves.push({ from: { r, c }, to: m }));
                }
            }
        }
        return allMoves;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new ChessGame();
    new ChessUI(game);
});
