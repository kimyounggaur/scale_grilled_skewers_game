import { expect, test } from '@playwright/test';

const save = {
  v: 1,
  records: {},
  settings: { notation: 'both', solfege: true, sound: false, unlock: 'all', hints: true, motion: 'reduce', largeText: false, theme: 'light' },
  introDone: true,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(data => localStorage.setItem('scale-skewer:v1', JSON.stringify(data)), save);
});

test('홈에서 그림 롤북을 열고 목차로 이동하고 닫을 수 있다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '게임 롤북' }).click();
  const dialog = page.getByRole('dialog', { name: '게임 롤북' });
  await expect(dialog).toBeVisible();
  const navigation = dialog.getByRole('navigation', { name: '롤북 목차' });
  await expect(navigation.getByRole('button')).toHaveCount(10);
  await navigation.getByRole('button', { name: /반음과 온음/ }).click();
  const chapter = dialog.locator('[data-chapter="steps"]');
  await expect(chapter.getByRole('heading', { name: '반음과 온음' })).toBeInViewport();
  await expect(chapter).toContainText('검은 건반도 한 칸');
  const image = chapter.getByRole('img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  const dimensions = await dialog.evaluate(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: '게임 롤북' })).toBeVisible();
});

test('주문 중 롤북을 읽고 닫아도 선택한 재료가 남는다', async ({ page }) => {
  await page.goto('/order/?scale=C&kind=learn');
  const first = page.getByTestId('slot-0');
  await page.getByTestId('key-0').click();
  await expect(first).toHaveAttribute('data-key', '0');
  await page.getByRole('button', { name: '게임 롤북', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '게임 롤북' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('navigation', { name: '롤북 목차' }).getByRole('button', { name: /별과 잠금/ }).click();
  await expect(dialog.locator('[data-chapter="stars"]').getByRole('heading', { name: '별과 잠금' })).toBeInViewport();
  await dialog.getByRole('button', { name: '닫기' }).click();
  await expect(dialog).toBeHidden();
  await expect(first).toHaveAttribute('data-key', '0');
  await page.getByTestId('key-2').click();
  await expect(page.getByTestId('slot-1')).toHaveAttribute('data-key', '2');
});
