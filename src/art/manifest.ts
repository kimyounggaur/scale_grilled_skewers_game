import { ingredientSvg } from './placeholder/ingredients';
/** Replace a single path here to substitute production artwork without changing the game. */
export const art = {
  ingredients: Array.from({ length: 12 }, (_, pc) => ({ svg: ingredientSvg[pc] ?? '', src: null as string | null })),
  names: ['빨강 파프리카', '가지', '양송이', '꽈리고추', '고기', '애호박', '올리브', '토마토', '군밤', '새우', '자색 양파', '옥수수'],
  grillMarks: 'M11 20.5L19.5 11M13.5 28L27 13M21 29.5L29.5 20',
  chef: { src: null as string | null },
  customer: { src: null as string | null },
  stall: { src: null as string | null },
};
