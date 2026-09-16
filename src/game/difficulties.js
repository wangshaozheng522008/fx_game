export const DIFFICULTIES = [
  {
    id: 'euclid',
    tier: '入门',
    title: '欧几里得级',
    slogan: '公理入门',
    blurb: '规则清晰，按部就班',
    seconds: 20,
    monsterCount: 1,
    types: ['affine', 'radialQuad', 'axisX', 'axisY'],
    scoreMul: 1,
    color: '#3dbf6a',
    colorHi: '#5ee08a',
  },
  {
    id: 'archimedes',
    tier: '进阶',
    title: '阿基米德级',
    slogan: '巧思进阶',
    blurb: '可分离、复合、三角指数',
    seconds: 25,
    monsterCount: 1,
    types: ['sinxy', 'cosSum', 'expSum', 'bilinear'],
    scoreMul: 1.2,
    color: '#3d8cff',
    colorHi: '#7cb6ff',
  },
  {
    id: 'gauss',
    tier: '困难',
    title: '高斯级',
    slogan: '严谨挑战',
    blurb: '一条等值线同时击中两只怪物',
    seconds: 30,
    monsterCount: 2,
    types: ['ellipse', 'circleFixed', 'diamond', 'atan2', 'stretchRad'],
    scoreMul: 1.5,
    color: '#8b5cf6',
    colorHi: '#b494ff',
  },
  {
    id: 'riemann',
    tier: '极限',
    title: '黎曼级',
    slogan: '抽象极限',
    blurb: '一条等值线同时击中三只怪物',
    seconds: 30,
    monsterCount: 3,
    types: ['gaussian', 'cardioid', 'saddle', 'expCos', 'polarRT'],
    scoreMul: 2,
    color: '#ff4d4d',
    colorHi: '#ffe566',
  },
];

export const DEFAULT_DIFFICULTY_ID = 'euclid';

export function getDifficulty(id) {
  return DIFFICULTIES.find((item) => item.id === id) || DIFFICULTIES[0];
}
