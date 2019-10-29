TILE_SIZE = 80;
PADDING = 0;

_GRID_WIDTH_TILES = 10;
_GRID_HEIGHT_TILES = 7;


//URL is http://www.example.com/mypage?ref=registration&email=bobo@example.com
$.urlParam = function (name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)')
        .exec(window.location.search);

    return (results !== null) ? results[1] || 0 : false;
}

//new puzzle every day
var daysSinceEpoch = Math.floor(new Date().getTime() / 1000 / 60 / 60 / 24);
Math.seed = $.urlParam("seed") || daysSinceEpoch;

// in order to work 'Math.seed' must NOT be undefined,
// so in any case, you HAVE to provide a Math.seed
Math.random = function (max, min) {
    max = max || 1;
    min = min || 0;

    Math.seed = (Math.seed * 9301 + 49297) % 233280;
    var rnd = Math.seed / 233280;

    return min + rnd * (max - min);
}

function distance(x1, y1, x2, y2) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};


class Tile {
    constructor(letter, row, col) {
        this.row = row;
        this.col = col;
        this.letter = letter;
        this.score = _LETTER_SCORES[letter];

        this._createElement();
        this.updatePosition(row, col);
    }

    refreshDivs() {
        this._$div.removeClass("vowel");
        this._$div.removeClass("wild");

        if ("aeiouy".includes(this.letter))
            this._$div.addClass("vowel");

        if (this.letter == " ")
            this._$div.addClass("wild");

        this._$div.children(".letter").text(this.letter.toUpperCase());
        this._$div.children(".score").text(this.score);
    }

    div() {
        return this._$div[0];
    }

    // Left position (in px) of this tile.
    left() {
        return PADDING + this.col * (TILE_SIZE + PADDING);
    }

    // Top position (in px) of this tile.
    top() {
        return PADDING + this.row * (TILE_SIZE + PADDING);
    }

    makeWild() {
        this.letter = " ";
        this.score = _LETTER_SCORES[" "];

        this.refreshDivs();
    }

    touchIsClose(x, y) {
        let tileRadius = TILE_SIZE / 2;
        let centerX = this.left() + tileRadius;
        let centerY = this.top() + tileRadius;

        return distance(centerX, centerY, x, y) < tileRadius * 0.75;
    }

    updatePosition(newRow, newCol) {
        this.row = newRow;
        this.col = newCol;
        this._$div.css({
            "left": `${this.left()}px`,
            "top": `${this.top()}px`,
        });
    }

    select() {
        this._$div.addClass("selected");
    }

    unselect() {
        this._$div.removeClass("selected");;
    }

    pop() {
        var $div = this._$div;
        $div.removeClass("selected");
        $div.addClass("popped");
        $div.css({
            "left": `${parseInt($div.css("left"), 10) + 150 - (Math.random() * 300)}px`,
            "top": `${parseInt($div.css("top"), 10) + 1000}px`,
            "z-index": "100",
        });
    }

    _createElement() {
        let $div = $(document.createElement("div"));
        let $score = $(document.createElement("div"));
        let $text = $(document.createElement("div"));

        $text.addClass("letter");
        $score.addClass("score");

        $div.append($text[0]);
        $div.append($score[0]);

        $div.addClass('tile');

        $div.css({
            "width": `${TILE_SIZE}px`,
            "height": `${TILE_SIZE}px`,
            "line-height": `${TILE_SIZE}px`,
        });

        this._$div = $div;
        this.refreshDivs();
    }
}


function generateLetterFrequencies(letterMap) {
    var letterString = ""
    for (const [key, value] of Object.entries(letterMap)) {
        letterString += key.repeat(value);
    }
    return letterString.toLowerCase();
}


function generateLetterScores(scoreMap) {
    var scores = {}
    for (const [key, value] of Object.entries(scoreMap)) {
        for (const char of key) {
            scores[char] = value;
        }
    }
    return scores;
}

// https://scrabble.hasbro.com/en-us/faq
_LETTER_SCORES = generateLetterScores({
    " ": 0,
    aeioulnstr: 1,
    dg: 2,
    bcmp: 3,
    fhvwy: 4,
    k: 5,
    jx: 8,
    qz: 10,
});


_LETTERS = generateLetterFrequencies({
    " ": 2,
    a: 9,
    b: 2,
    c: 2,
    d: 4,
    e: 12,
    f: 2,
    g: 3,
    h: 2,
    i: 9,
    j: 1,
    k: 1,
    l: 4,
    m: 2,
    n: 6,
    o: 8,
    p: 2,
    q: 1,
    r: 6,
    s: 4,
    t: 6,
    u: 4,
    v: 2,
    w: 2,
    x: 1,
    y: 2,
    z: 1,
});
function randomLetter() {
    return _LETTERS.charAt(Math.floor(Math.random() * _LETTERS.length));
}

class Grid {
    constructor($container, numRows, numCols) {
        this._$container = $container;
        
        // A map of div -> Tile object
        this._divMap = new Map();

        // 2d array of index -> Tile
        this._grid = [];
        this._numRows = numRows;
        this._numCols = numCols;

        this._initialize();
        this._undo = null;
    }

    pushUndo() {
        this._undo = JSON.parse(JSON.stringify(this));
    }

    popUndo() {
        let undo = this._undo;
        if (undo) {
            this._grid = undo._grid;
            this._divMap = undo._divMap;
            this._undo = undo.undo;

            for (const row of this._grid) {
                for (const tile of row) {
                    tile.refreshDivs();
                }
            }
        }
    }

    _initialize() {
        for (var row = 0; row < this._numRows; row++) {
            this._grid[row] = []
            for (var col = 0; col < this._numCols; col++) {
                var tile = new Tile(randomLetter(), row, col);
                this._$container.append(tile.div());

                this._divMap.set(tile.div(), tile);
                this._updateTilePosition(tile, row, col);
            }
        }
    }

    makeWild(tile) {
        //this.pushUndo();
        tile.makeWild();
    }

    getFromDiv(div) {
        return this._divMap.get(div) || this._divMap.get(div.parentNode);
    }

    _updateTilePosition(tile, newRow, newCol) {
        this._grid[tile.row][tile.col] = null;
        this._grid[newRow][newCol] = tile;
        tile.updatePosition(newRow, newCol);
    }

    removeTiles(tiles) {
        //this.pushUndo();
        for (let tile of tiles) {
            this.removeTile(tile);
        }            
    }

    removeTile(tile) {
        tile.pop();
        this._grid[tile.row][tile.col] = null;
        this._divMap.delete(tile.div());

        var gravityMovedTile = false;

        // Apply gravity to above tiles
        for (var row = tile.row - 1; row >= 0; row--) {
            var nextTile = this._grid[row][tile.col];
            if (!nextTile)
                continue; // Don't break incase of a C shape word.

            // move it down
            this._updateTilePosition(nextTile, row + 1, tile.col);
            gravityMovedTile = true;
        }

        // if this created an empty column, move it all left.
        if (!gravityMovedTile && tile.row == this._numRows - 1) {
            for (var row = 0; row < this._numRows; row++) {
                for (var col = tile.col + 1; col < this._numCols; col++) {
                    var nextTile = this._grid[row][col];
                    if (!nextTile)
                        continue;
                    this._updateTilePosition(nextTile, row, col - 1);
                }
            }
        }
    }
}

// Singleton game manager;
class Game {
    constructor($container, $score, $words, $wordPreview) {
        this._$container = $container;
        this._$score = $score;
        this._$words = $words;
        this._score = 0;
        this.PointerDown = false;
        this.Selection = [];
        this.Hints = 3;
        this._$wordPreview = $wordPreview;
        this._longTapToken = null;
        this._longTapStartX;
        this._longTapStartY;
    }

    _clearLongTap() {
        clearTimeout(this._longTapToken);
        this._longTapToken = null;
    }

    _startLongTap(x, y) {
        this._longTapStartX = x;
        this._longTapStartY = y;
        this._longTapToken = setTimeout(() => {
            GameManager.MakeWild();
            GameManager.ClearSelection();
        }, 750);
    }

    _constructGrid() {
        this.Grid = new Grid(this._$container, _GRID_HEIGHT_TILES, _GRID_WIDTH_TILES);
    }

    Start() {
        let gameWidth = PADDING + _GRID_WIDTH_TILES * (TILE_SIZE + PADDING);
        // Resize container to look a bit nicer.
        this._$container.css({
            "width": `${gameWidth}px`,
            "height": `${PADDING + _GRID_HEIGHT_TILES * (TILE_SIZE + PADDING)}px`,
        });

        this._$wordPreview.css({
            "width": `${gameWidth}px`
        })

        this._$container.on("pointerdown", this._onPointerDown);
        this._$container.on("pointerup", this._onPointerUp);
        this._$container.on("pointermove", this._onPointerMove);

        this._constructGrid();
    }

    _onPointerMove(ev) {
        if (GameManager.PointerDown) {
            let x = ev.clientX;
            let y = ev.clientY;
            var target = document.elementFromPoint(x, y);
            var tile = GameManager.Grid.getFromDiv(target);
            var lastTile = GameManager.GetLastSelected();

            if (distance(x, y, GameManager._longTapStartX, GameManager._longTapStartY) > 10)
                GameManager._clearLongTap();

            if (tile && tile != lastTile && tile.touchIsClose(x, y)) {
                GameManager.Select(tile);
            }
        }
    }


    _onPointerDown(ev) {
        GameManager.PointerDown = true;
        var tile = GameManager.Grid.getFromDiv(ev.target);
        if (tile) {
            GameManager.Select(tile);
            GameManager._startLongTap(ev.clientX, ev.clientY);
        }
    }

    _wildWordFind(wildWord) {
        if (WordList.has(wildWord)) {
            return wildWord;
        }
        let pattern = wildWord.split(" ").join(".");
        let regex = new RegExp(pattern);
        for (let word of WordList) {
            if (word.length != wildWord.length)
                continue;
            if (regex.test(word))
                return word;
        }
        return null;
    }

    ScoreCurrentWord() {
        let sum = 0;
        this.Selection.forEach((tile) => sum += tile.score);
        sum *= this.Selection.length / 2;
        return sum;
    }

    _onPointerUp() {
        GameManager.PointerDown = false;
        GameManager._clearLongTap();

        var currentWordWithWilds = GameManager.CurrentWord();

        var currentWord = GameManager._wildWordFind(currentWordWithWilds);
        if (WordList.has(currentWord)) {
            GameManager.PopSelection();
            let score = GameManager.ScoreCurrentWord();
            GameManager.Log(`Found ${currentWord} (${score})`);
            GameManager.UpdateScore(score);
        }
        GameManager.ClearSelection();
    }


    MakeWild() {
        if (GameManager.Hints-- > 0) {
            GameManager.Log(`Turned ${GameManager.GetLastSelected().letter.toUpperCase()} wild! (${GameManager.Hints} wildcards remaining.)`);
            this.Grid.makeWild(GameManager.Selection[0]);
        }
    }

    Log(msg) {
        this._$words.append(`<div>${msg}</div>`);
    }

    UpdateScore(value) {
        this._score += value;
        this._$score.text(this._score);
    }

    CurrentWord() {
        var word = "";
        this.Selection.forEach((tile) => word += tile.letter);
        return word;
    }

    CurrentWordScore() {
        var sum = 0;
        this.Selection.forEach((tile) => sum += tile.score);
        return sum;
    }

    ClearSelection() {
        this.Selection.forEach((tile) => {
            tile.unselect();
        })
        this.Selection = [];
        this._$wordPreview.text(" ");
    }

    PopSelection() {
        this.Grid.removeTiles(this.Selection);
    }

    Select(tile) {
        // Don't select a tile twice
        if (this.Selection.includes(tile))
            return;

        var lastTile = this.GetLastSelected();
        if (lastTile) {
            var deltaRow = Math.abs(tile.row - lastTile.row);
            var deltaCol = Math.abs(tile.col - lastTile.col);
            if (deltaRow > 1 || deltaCol > 1)
                return;
        }

        this._select(tile);
        this._$wordPreview.text(this.CurrentWord().toUpperCase());
    }

    _select(tile) {
        tile.select();
        this.Selection.push(tile);
    }

    GetLastSelected() {
        return this.Selection[this.Selection.length - 1];
    }
};

$(document).ready(() => {
    GameManager = new Game(
        $(".game-container"),
        $(".game-score"),
        $(".words-container"),
        $(".word-preview-container"),
    );
    GameManager.Start();
});
