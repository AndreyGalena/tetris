// Модуль определения устройства.
let detect = new MobileDetect(window.navigator.userAgent);
// snake.os = detect.os();

// Мобилка или компьютер.
if (detect.mobile()) {
    mobileButtons(detect);
} else {
    // Обработчик событий на компьютере.
    document.addEventListener('keydown', keyDown);
}

// Если на мобильном
function mobileButtons(detect) {
    // добавить кнопки.
    let blockButton = document.querySelector(".blockButton");
    blockButton.style.display = "block";
    // Обработка событий на мобильном устройстве.
    blockButton.addEventListener("click", mobilClick);
}

function mobilClick(event) {
    let element = event.target;
    // если такой класс в объекте есть
    if (element.classList.contains("arrowImgUp")) {
        playerRotate();
    } else if (element.classList.contains("arrowImgDown")) {
        playerDrop();
    } else if (element.classList.contains("arrowImgLeft")) {
        playerMove(-1)
    } else if (element.classList.contains("arrowImgRight")) {
        playerMove(1);
    }
}

// Получаем канвасы и масштабируем
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(30, 30);

const previewCanvas = document.getElementById('preview');
const previewCtx = previewCanvas.getContext('2d');
previewCtx.scale(30, 30);

// Элементы интерфейса
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');

// Игровое поле — матрица 12x20
const arena = createMatrix(12, 20);

// Первая фигура
let nextPiece = createPiece(randomPieceType());

// Игрок и его состояние
const player = {
    pos: { x: 5, y: 0 },
    matrix: nextPiece,
    score: 0,
    level: 1
};

// Таймеры
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

// Флаг паузы
let isPaused = false;

/* ФОНОВАЯ МУЗЫКА */
const soundImg = document.querySelector(".sound-img");

soundImg.addEventListener('click', (event) => {
    sound.play(); // проигрует звук.
})
const sound = new Audio("./music/music.mp3");
// вкл. повтор
sound.loop = true;

// Создаёт пустую матрицу
function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

// Случайный тип фигуры
function randomPieceType() {
    const pieces = 'TJLOSZI';
    return pieces[Math.floor(Math.random() * pieces.length)];
}

// Создаёт фигуру по типу
function createPiece(type) {
    switch (type) {
        case 'T': return [[0, 1, 0], [1, 1, 1], [0, 0, 0]];
        case 'O': return [[1, 1], [1, 1]];
        case 'L': return [[0, 0, 1], [1, 1, 1], [0, 0, 0]];
        case 'J': return [[1, 0, 0], [1, 1, 1], [0, 0, 0]];
        case 'I': return [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]];
        case 'S': return [[0, 1, 1], [1, 1, 0], [0, 0, 0]];
        case 'Z': return [[1, 1, 0], [0, 1, 1], [0, 0, 0]];
    }
}

// Отрисовка матрицы
function drawMatrix(matrix, offset, ctx, color = 'red') {
    ctx.fillStyle = color;
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

// Предпросмотр следующей фигуры
function drawPreview() {
    previewCtx.fillStyle = '#000';
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    drawMatrix(nextPiece, { x: 1, y: 1 }, previewCtx, 'orange');
}

// Основной рендеринг
function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    // 1) сначала ghost-piece
    drawGhost();

    // 2) потом статические блоки
    drawMatrix(arena, { x: 0, y: 0 }, context, 'blue');

    // 3) и в завершение — активная фигура
    drawMatrix(player.matrix, player.pos, context, 'red');
}


function drawGrid() {
    context.strokeStyle = '#333'; // Цвет линий сетки
    context.lineWidth = 0.05;

    // Вертикальные линии
    for (let x = 0; x <= canvas.width / 20; x++) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height / 20);
        context.stroke();
    }

    // Горизонтальные линии
    for (let y = 0; y <= canvas.height / 20; y++) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width / 20, y);
        context.stroke();
    }
}

// 🕯️ Рисует призрачную тень текущей фигуры
function drawGhost() {
    const { matrix, pos } = player;
    let ghostY = pos.y;

    // Поднимаем ghostY, пока нет коллизии
    while (!collide(arena, { pos: { x: pos.x, y: ghostY + 1 }, matrix })) {
        ghostY++;
    }

    // Рисуем тень с низкой прозрачностью
    context.globalAlpha = 0.3;
    drawMatrix(matrix, { x: pos.x, y: ghostY }, context, 'white');
    context.globalAlpha = 1;
}


// Отображение паузы
function drawPause() {
    draw(); // Отрисовываем текущее состояние
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
    context.fillStyle = 'white';
    context.font = '1.5px Arial';
    context.textAlign = 'center';
    context.fillText('PAUSE', canvas.width / 60, canvas.height / 60);
}

// Объединяет фигуру с ареной
function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

// Проверка столкновений
function collide(arena, player) {
    const m = player.matrix;
    const o = player.pos;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] &&
                (arena[y + o.y] &&
                    arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// Поворот матрицы
function rotate(matrix) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    matrix.forEach(row => row.reverse());
}

// Поворот фигуры игрока
function playerRotate() {
    const original = JSON.parse(JSON.stringify(player.matrix));
    rotate(player.matrix);
    if (collide(arena, player)) {
        player.matrix = original;
    }
}

// Падение фигуры
function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

// Движение фигуры
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

// Сброс фигуры и генерация новой
function playerReset() {
    player.matrix = nextPiece;
    nextPiece = createPiece(randomPieceType());
    player.pos.y = 0;
    player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);

    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        player.level = 1;
        dropInterval = 1000;
    }

    updateScore();
    drawPreview();
}

// Очистка заполненных строк
function arenaSweep() {
    let linesCleared = 0;

    for (let y = arena.length - 1; y >= 0; --y) {
        if (arena[y].every(cell => cell !== 0)) {
            arena.splice(y, 1);
            arena.unshift(new Array(arena[0].length).fill(0));
            linesCleared++;
            y++; // пересмотреть ту же строку после сдвига
        }
    }

    if (linesCleared > 0) {
        const pointsTable = [0, 40, 100, 300, 1200];
        player.score += pointsTable[linesCleared]; //  * player.level

        const oldLevel = player.level;

        // Повышение уровня каждые 10 линий (по желанию)
        player.level = Math.floor(player.score / 1000) + 1;

        if (player.level > oldLevel) {
            updateDropInterval(); // ⬅️ Ускоряем падение при повышении уровня
        }

        updateScore();
    }
}


// Обновление очков и уровня
function updateScore() {
    scoreEl.textContent = player.score;
    levelEl.textContent = player.level;
}

function updateDropInterval() {
    dropInterval = Math.max(1000 - (player.level - 1) * 100, 100);
}


// Главный цикл игры
function update(time = 0) {
    if (isPaused) {
        drawPause();
        return requestAnimationFrame(update);
    }

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

// Обработка клавиш
// document.addEventListener('keydown', event => {
//     if (event.key === 'p' || event.key === 'з') {
//         isPaused = !isPaused;
//         if (!isPaused) lastTime = performance.now();
//     }

//     if (!isPaused) {
//         if (event.key === 'ArrowLeft') playerMove(-1);
//         else if (event.key === 'ArrowRight') playerMove(1);
//         else if (event.key === 'ArrowDown') playerDrop();
//         else if (event.key === 'ArrowUp') playerRotate();
//     }
// });
function keyDown(event) {
    if (event.key === 'p' || event.key === 'з') {
        isPaused = !isPaused;
        if (!isPaused) lastTime = performance.now();
    }

    if (!isPaused) {
        if (event.key === 'ArrowLeft') playerMove(-1);
        else if (event.key === 'ArrowRight') playerMove(1);
        else if (event.key === 'ArrowDown') playerDrop();
        else if (event.key === 'ArrowUp') playerRotate();
    }
}

// Запуск игры
playerReset();
update();