const test = require('node:test');
const assert = require('node:assert/strict');
const {
    ADVENTURE_WORLDS, ADVENTURE_NODES, getAdventureNode, calculateStars,
} = require('../game/adventureMap');

test('la Mappa Avventura contiene due mondi e venti livelli consecutivi', () => {
    assert.equal(ADVENTURE_WORLDS.length, 2);
    assert.equal(ADVENTURE_NODES.length, 20);
    assert.deepEqual(ADVENTURE_NODES.map(node => node.id), Array.from({ length: 20 }, (_, index) => index + 1));
    assert.equal(ADVENTURE_NODES.filter(node => node.boss).length, 2);
    assert.equal(getAdventureNode(20).boss, true);
});

test('ogni mondo include tutti i giochi del progetto', () => {
    for (const world of ADVENTURE_WORLDS) {
        const games = new Set(ADVENTURE_NODES.filter(node => node.world === world.id).map(node => node.game));
        assert.deepEqual([...games].sort(), ['escape', 'match3', 'pairs', 'sudoku']);
    }
});

test('le stelle premiano precisione e rispetto del tempo obiettivo', () => {
    const node = getAdventureNode(1);
    assert.equal(calculateStars(node, { elapsedMs: node.parMs - 1, errors: 0, lives: 3 }), 3);
    assert.equal(calculateStars(node, { elapsedMs: node.parMs + 1, errors: 1, lives: 2 }), 1);
    assert.equal(calculateStars(node, { elapsedMs: node.parMs + 1, errors: 0, lives: 3 }), 2);
});
