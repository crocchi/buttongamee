const ADVENTURE_WORLDS = [
    { id: 1, name: 'Valle dei Numeri', theme: 'meadow', description: 'Impara le regole e raccogli le prime stelle.' },
    { id: 2, name: 'Città degli Enigmi', theme: 'city', description: 'Sfide più rapide e puzzle più complessi.' },
];

const GAME_META = {
    pairs: { label: 'Coppie di numeri', icon: '7·7' },
    match3: { label: 'Number Blast', icon: '✦' },
    escape: { label: 'Escape Math', icon: '∑→' },
    sudoku: { label: 'Sudoku', icon: '9' },
};

const sequence = [
    'pairs', 'match3', 'escape', 'sudoku', 'pairs',
    'escape', 'match3', 'sudoku', 'pairs', 'escape',
    'match3', 'pairs', 'sudoku', 'escape', 'match3',
    'sudoku', 'escape', 'pairs', 'match3', 'sudoku',
];

const ADVENTURE_NODES = sequence.map((game, index) => {
    const id = index + 1;
    const world = Math.ceil(id / 10);
    const position = ((id - 1) % 10) + 1;
    const boss = position === 10;
    const difficulty = Math.min(10, 1 + Math.floor((id - 1) / 2));
    return {
        id, world, position, game, boss, difficulty,
        title: boss ? `Guardiano del mondo ${world}` : `${GAME_META[game].label} ${position}`,
        label: GAME_META[game].label,
        icon: GAME_META[game].icon,
        parMs: game === 'sudoku' ? 240000 : (game === 'escape' ? 90000 : 120000),
        target: game === 'escape' ? (boss ? 5 : 3) : 1,
    };
});

function getAdventureNode(value) {
    const id = Number(value);
    return Number.isInteger(id) ? ADVENTURE_NODES.find(node => node.id === id) || null : null;
}

function calculateStars(node, { elapsedMs = Infinity, errors = 0, lives = 3 } = {}) {
    if (!node) return 0;
    let stars = 1;
    if (Number(errors) === 0 && Number(lives) >= 2) stars += 1;
    if (Number(elapsedMs) <= node.parMs) stars += 1;
    return Math.max(1, Math.min(3, stars));
}

module.exports = { ADVENTURE_WORLDS, ADVENTURE_NODES, getAdventureNode, calculateStars };
