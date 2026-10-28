import type { SpriteKey } from '../types';

/* 11×8 のドット絵。SVG の path で描く */
export const SP: Record<SpriteKey, string> = {
  phone:'M3 0h5v1h-5zM3 1h1v1h-1zM7 1h1v1h-1zM3 2h1v1h-1zM5 2h1v1h-1zM7 2h1v1h-1zM3 3h1v1h-1zM7 3h1v1h-1zM3 4h2v1h-2zM6 4h2v1h-2zM3 5h1v1h-1zM7 5h1v1h-1zM3 6h1v1h-1zM5 6h1v1h-1zM7 6h1v1h-1zM3 7h5v1h-5z',
  monitor:'M0 0h11v1h-11zM0 1h1v1h-1zM10 1h1v1h-1zM0 2h1v1h-1zM3 2h1v1h-1zM7 2h1v1h-1zM10 2h1v1h-1zM0 3h1v1h-1zM4 3h3v1h-3zM10 3h1v1h-1zM0 4h11v1h-11zM4 5h3v1h-3zM3 6h5v1h-5z',
  server:'M0 0h11v1h-11zM0 1h1v1h-1zM2 1h1v1h-1zM8 1h3v1h-3zM0 2h11v1h-11zM0 3h1v1h-1zM2 3h1v1h-1zM8 3h3v1h-3zM0 4h11v1h-11zM0 5h1v1h-1zM2 5h1v1h-1zM8 5h3v1h-3zM0 6h11v1h-11zM1 7h1v1h-1zM9 7h1v1h-1z',
  fridge:'M2 0h7v1h-7zM2 1h1v1h-1zM8 1h1v1h-1zM2 2h1v1h-1zM4 2h1v1h-1zM6 2h1v1h-1zM8 2h1v1h-1zM2 3h7v1h-7zM2 4h1v1h-1zM8 4h1v1h-1zM2 5h2v1h-2zM8 5h1v1h-1zM2 6h1v1h-1zM8 6h1v1h-1zM2 7h7v1h-7z',
  robot:'M4 0h1v1h-1zM6 0h1v1h-1zM3 1h5v1h-5zM2 2h7v1h-7zM2 3h1v1h-1zM4 3h3v1h-3zM8 3h1v1h-1zM2 4h7v1h-7zM0 5h4v1h-4zM5 5h1v1h-1zM7 5h4v1h-4zM0 6h1v1h-1zM2 6h7v1h-7zM10 6h1v1h-1zM2 7h2v1h-2zM7 7h2v1h-2z',
  chief:'M3 0h5v1h-5zM2 1h7v1h-7zM1 2h9v1h-9zM2 3h1v1h-1zM4 3h1v1h-1zM6 3h1v1h-1zM8 3h1v1h-1zM2 4h7v1h-7zM3 5h5v1h-5zM1 6h9v1h-9zM0 7h11v1h-11z',
  senpai:'M3 0h5v1h-5zM2 1h7v1h-7zM2 2h1v1h-1zM8 2h1v1h-1zM2 3h1v1h-1zM4 3h1v1h-1zM6 3h1v1h-1zM8 3h1v1h-1zM2 4h7v1h-7zM3 5h1v1h-1zM7 5h1v1h-1zM1 6h9v1h-9zM1 7h9v1h-9z',
  phantom:'M3 0h5v1h-5zM2 1h7v1h-7zM1 2h2v1h-2zM5 2h1v1h-1zM8 2h2v1h-2zM1 3h9v1h-9zM1 4h9v1h-9zM1 5h2v1h-2zM4 5h3v1h-3zM8 5h2v1h-2zM1 6h9v1h-9zM1 7h1v1h-1zM3 7h1v1h-1zM5 7h1v1h-1zM7 7h1v1h-1zM9 7h1v1h-1z'
};

export const sprite = (n: SpriteKey, w: number, h: number) =>
  `<svg class="sp" viewBox="0 0 11 8" width="${w}" height="${h}" aria-hidden="true"><path d="${SP[n]}" fill="currentColor"/></svg>`;
