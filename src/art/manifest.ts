import { ingredientSvg } from './placeholder/ingredients';

/** Artwork supplied for the acrylic-paint remaster. Pitch-class order is stable. */
const ingredientFiles = ['pepper', 'eggplant', 'mushroom', 'chili', 'bacon', 'zucchini', 'olive', 'tomato', 'chestnut', 'shrimp', 'onion', 'corn'];
const asset = (name: string) => `/assets/remaster/${name}.webp`;
export const art = {
  ingredients: ingredientFiles.map((name, pc) => ({ svg: ingredientSvg[pc] ?? '', src: asset(name) })),
  names: ['빨강 파프리카', '가지', '양송이', '꽈리고추', '고기', '애호박', '올리브', '토마토', '군밤', '새우', '자색 양파', '옥수수'],
  grillMarks: 'M11 20.5L19.5 11M13.5 28L27 13M21 29.5L29.5 20',
  chef: { normal: asset('chef-neutral'), happy: asset('chef-happy'), wonder: asset('chef-thinking') },
  customer: { src: asset('customer') },
  stall: { src: null as string | null },
};
