TILE_SIZE = 60;
PADDING = 6;

_GRID_WIDTH_TILES = 7;
_GRID_HEIGHT_TILES = 10;


class Tile {
    constructor(letter, row, col) {
        this.row = row;
        this.col = col;
        this.letter = letter;

        this._createElement();
        this.updatePosition(row, col);
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

    _onMouseEnter(ev) {
        if (GameManager.PointerDown) {
            var tile = GameManager.Grid.getFromDiv(ev.target);
            if (tile) GameManager.Select(tile);
        }
    }

    _createElement() {
        this._$div = $(document.createElement("div"));
        this._$div.addClass('tile');
        // are variables in css a thing?

        this._$div.css({
            "width": `${TILE_SIZE}px`,
            "height": `${TILE_SIZE}px`,
            "line-height": `${TILE_SIZE}px`,
        });
        this._$div.text(this.letter.toUpperCase());
        this._$div.on("mouseenter", this._onMouseEnter);
    }
}


function generateLetterFrequencies(letterMap) {
    var letterString = ""
    for (const [key, value] of Object.entries(letterMap)) {
        letterString += key.repeat(value);
    }
    return letterString.toLowerCase();
}

// Scrabble frequencies
_LETTERS = generateLetterFrequencies({
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
    }

    _initialize() {
        for (var row = 0; row < this._numRows; row++) {
            this._grid[row] = []
            for (var col = 0; col < this._numCols; col++) {
                var tile = new Tile(randomLetter(), row, col);
                this._$container.append(tile.div());

                this._divMap.set(tile.div(), tile);
                this.updateTilePosition(tile, row, col);
            }
        }
    }

    getFromDiv(div) {
        return this._divMap.get(div);
    }

    updateTilePosition(tile, newRow, newCol) {
        this._grid[tile.row][tile.col] = null;
        this._grid[newRow][newCol] = tile;
        tile.updatePosition(newRow, newCol);
    }

    removeTile(tile) {
        this._grid[tile.row][tile.col] = null;
        this._divMap[tile.div()] = null;

        // Apply gravity to above tiles
        for (var row = tile.row - 1; row >= 0; row--) {
            var nextTile = this._grid[row][tile.col];
            if (!nextTile)
                break;

            // move it down
            this.updateTilePosition(nextTile, row + 1, tile.col);
        }
    }
}

// Singleton game manager;
class Game {
    constructor($container) {
        this._$container = $container;
        this.PointerDown = false;
        this.Selection = [];
    }

    _constructGrid() {
        this.Grid = new Grid(this._$container, _GRID_HEIGHT_TILES, _GRID_WIDTH_TILES);
    }

    Start() {
        // Resize container to look a bit nicer.
        this._$container.css({
            "width": `${PADDING + _GRID_WIDTH_TILES * (TILE_SIZE + PADDING)}px`,
            "height": `${PADDING + _GRID_HEIGHT_TILES * (TILE_SIZE + PADDING)}px`,
        });

        this._$container.on("mousedown", this._onMouseDown);
        this._$container.on("mouseup", this._onMouseUp);

        this._constructGrid();
    }

    _onMouseDown(ev) {
        GameManager.PointerDown = true;
        var tile = GameManager.Grid.getFromDiv(ev.target);
        if (tile) GameManager.Select(tile);
    }

    CurrentWord() {
        var word = "";
        this.Selection.forEach((tile) => word += tile.letter);
        return word;
    }

    ClearSelection() {
        this.Selection.forEach((tile) => {
            tile.unselect();
        })
        this.Selection = [];
    }

    PopSelection() {
        this.Selection.forEach((tile) => {
            tile.pop();
            this.Grid.removeTile(tile);
        })
    }

    Select(tile) {
        if (this.Selection.includes(tile))
            return;

        tile.select();
        this.Selection.push(tile);
    }

    _onMouseUp() {
        GameManager.PointerDown = false;
        var currentWord = GameManager.CurrentWord();
        console.log(currentWord);
        if (WordList.has(GameManager.CurrentWord())) {
            GameManager.PopSelection();
        }
        GameManager.ClearSelection();
    }
};

$(document).ready(() => {
    GameManager = new Game($('.game-container'));
    GameManager.Start();
});