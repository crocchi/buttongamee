function clampLevel(value) {
    return Math.min(100, Math.max(1, Number(value) || 1));
}

function randomInt(min, max, random = Math.random) {
    return min + Math.floor(random() * (max - min + 1));
}

function shuffle(values, random = Math.random) {
    for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
}

function choicesFor(answer, level, random) {
    const spread = Math.max(2, Math.ceil(level / 8));
    const candidates = [
        answer + spread, answer - spread, answer + spread + 1, answer - spread - 1,
        answer + spread * 2, answer - spread * 2, answer + 1, answer - 1,
    ];
    const unique = new Set([answer]);
    for (const candidate of candidates) {
        if (Number.isInteger(candidate) && candidate >= 0) unique.add(candidate);
        if (unique.size === 4) break;
    }
    while (unique.size < 4) unique.add(answer + unique.size + spread);
    return shuffle(Array.from(unique), random);
}

function puzzleTypeForLevel(level) {
    if (level <= 10) return 'add-sub';
    if (level <= 20) return 'mult-div';
    if (level <= 40) return 'sequence';
    if (level <= 60) return 'target';
    if (level <= 80) return 'expression';
    return ['add-sub', 'mult-div', 'sequence', 'target', 'expression'][level % 5];
}

function createEscapePuzzle(rawLevel, random = Math.random) {
    const level = clampLevel(rawLevel);
    const type = puzzleTypeForLevel(level);
    const difficulty = 2 + Math.ceil(level / 5);
    let prompt;
    let answer;
    let hint;

    if (type === 'add-sub') {
        const first = randomInt(2, 8 + difficulty, random);
        const second = randomInt(1, 5 + difficulty, random);
        const subtract = level > 4 && random() > 0.5;
        if (subtract) {
            const high = Math.max(first, second);
            const low = Math.min(first, second);
            prompt = `${high} − ${low} = ?`;
            answer = high - low;
            hint = 'Sottrai il numero più piccolo.';
        } else {
            prompt = `${first} + ${second} = ?`;
            answer = first + second;
            hint = 'Somma i due numeri.';
        }
    } else if (type === 'mult-div') {
        const first = randomInt(2, Math.min(12, 3 + difficulty), random);
        const second = randomInt(2, Math.min(12, 4 + difficulty), random);
        if (level > 14 && random() > 0.5) {
            prompt = `${first * second} ÷ ${first} = ?`;
            answer = second;
            hint = 'La divisione è l’operazione inversa della moltiplicazione.';
        } else {
            prompt = `${first} × ${second} = ?`;
            answer = first * second;
            hint = 'Moltiplica i due fattori.';
        }
    } else if (type === 'sequence') {
        const start = randomInt(1, 8 + difficulty, random);
        const step = randomInt(2, Math.min(10, 2 + difficulty), random);
        prompt = `${start}, ${start + step}, ${start + step * 2}, ?, ${start + step * 4}`;
        answer = start + step * 3;
        hint = `Ogni numero aumenta della stessa quantità.`;
    } else if (type === 'target') {
        const hidden = randomInt(2, 8 + difficulty, random);
        const known = randomInt(2, 7 + Math.ceil(difficulty / 2), random);
        const multiply = random() > 0.45;
        if (multiply) {
            prompt = `${known} × ? = ${known * hidden}`;
            answer = hidden;
            hint = 'Trova il fattore mancante.';
        } else {
            prompt = `${known} + ? = ${known + hidden}`;
            answer = hidden;
            hint = 'Trova l’addendo mancante.';
        }
    } else {
        const first = randomInt(2, 8 + Math.ceil(difficulty / 2), random);
        const second = randomInt(2, 7, random);
        const third = randomInt(2, Math.min(9, 3 + Math.ceil(difficulty / 3)), random);
        prompt = `(${first} + ${second}) × ${third} = ?`;
        answer = (first + second) * third;
        hint = 'Risolvi prima l’operazione tra parentesi.';
    }

    return {
        type,
        prompt,
        answer,
        choices: choicesFor(answer, level, random),
        hint,
        timeLimitMs: Math.max(10000, 30000 - (level - 1) * 200),
        boss: level % 10 === 0,
    };
}

module.exports = { createEscapePuzzle, puzzleTypeForLevel, clampLevel };
