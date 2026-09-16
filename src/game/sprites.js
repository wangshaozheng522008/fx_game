export const PALETTE = {
  '.': null,
  k: '#140c22',
  w: '#3a2410',
  s: '#f0c090',
  r: '#3d8cff',
  b: '#7ce7ff',
  g: '#ffe566',
  e: '#ff3b5c',
  d: '#9b1d32',
  h: '#ff8fa0',
  n: '#f4e8c8',
  m: '#1a1028',
  y: '#fff1a8',
};

export const PLAYER = [
  '.......gg......',
  '......gggg.....',
  '.....kkkkkk....',
  '.....kssssk....',
  '....kksssskk...',
  '.....kssssk....',
  '.....k.ss.k....',
  '...ggrrrrrrgg..',
  '..gggrrrrrrggg.',
  '...ggrrrrrrgg..',
  '....rrrrrrrr...',
  '....rr....rr...',
  '....rr....rr...',
  '....ww....ww...',
  '...............',
];

export const MONSTER = [
  '...............',
  '......kkkk.....',
  '....kkddddkk...',
  '...kddhhhhddk..',
  '..kddhhhhhhddk.',
  '..kdhhyhhyhhdk.',
  '..kdhhkkkkhhdk.',
  '..kddhhhhhhddk.',
  '..kddhheehhddk.',
  '..kkddhhhhddkk.',
  '...kkddddddkk..',
  '....kkkkkkkk...',
  '.....k....k....',
  '...............',
];

export function drawSprite(ctx, map, px, py, scale) {
  for (let row = 0; row < map.length; row += 1) {
    const line = map[row];
    for (let col = 0; col < line.length; col += 1) {
      const color = PALETTE[line[col]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(px + col * scale, py + row * scale, scale, scale);
    }
  }
}

export function spriteSize(map, scale) {
  return {
    w: (map[0] ? map[0].length : 0) * scale,
    h: map.length * scale,
  };
}
