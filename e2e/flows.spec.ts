import { expect, test, type Page } from '@playwright/test';
import golden from '../docs/reference/skewer_golden_v1.json';

type Notation = 'both' | 'ko' | 'en';
type OrderKind = 'learn' | 'challenge' | 'fill' | 'fix' | 'name';
type RecordState = {
  learned: boolean; challengeClean: boolean; fill: boolean; fix: boolean; name: boolean;
  plays: Record<OrderKind, number>;
};
type ScaleFixture = { tonicMidi: number; labels: { ko: string; en: string; short: string }; notes: Array<{ midi: number; name: string; step: number; ko: string; en: string }>; keySig: { type: string; count: number; steps: number[] } };
const fixtures = golden.scales as unknown as Record<string, ScaleFixture>;
const course = golden.course;
const ids = [...course.basic, ...course.challengeMajor, ...course.challengeMinor, ...Object.values(course.twins)];
const STORAGE_KEY = 'scale-skewer:v1';
const emptyRecord = (): RecordState => ({
  learned: false, challengeClean: false, fill: false, fix: false, name: false,
  plays: { learn: 0, challenge: 0, fill: 0, fix: 0, name: 0 },
});

async function seed(page: Page, options: { notation?: Notation; records?: Record<string, RecordState>; introDone?: boolean; unlock?: 'all' | 'sequence' | 'basicOnly' } = {}) {
  const value = {
    v: 1,
    records: options.records ?? {},
    settings: { notation: options.notation ?? 'both', solfege: true, sound: false, unlock: options.unlock ?? 'all', hints: true, motion: 'reduce', largeText: false },
    introDone: options.introDone ?? true,
  };
  await page.addInitScript(({ key, data }) => {
    if (!sessionStorage.getItem('test-seeded')) {
      localStorage.setItem(key, JSON.stringify(data));
      sessionStorage.setItem('test-seeded', 'yes');
    }
  }, { key: STORAGE_KEY, data: value });
}
const scaleFixture = (id: string): ScaleFixture => {
  const fixture = fixtures[id];
  if (!fixture) throw new Error(`Missing fixture ${id}`);
  return fixture;
};
const keysFor = (id: string) => {
  const scale = scaleFixture(id);
  return scale.notes.map(note => note.midi - scale.tonicMidi);
};
async function openOrder(page: Page, id: string, kind: OrderKind = 'learn') {
  await page.goto(`/order/?scale=${encodeURIComponent(id)}&kind=${kind}`);
  await expect(page.getByTestId('key-0')).toBeVisible();
}
async function enterScale(page: Page, id: string, keys = keysFor(id)) {
  for (const key of keys) await page.getByTestId(`key-${key}`).click();
}
async function bake(page: Page) {
  await page.getByRole('button', { name: /굽기/ }).click();
  await expect(page.getByTestId('key-signature')).toHaveCount(1);
}
async function readRecords(page: Page): Promise<Record<string, RecordState>> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').records ?? {}, STORAGE_KEY) as Promise<Record<string, RecordState>>;
}
async function expectNoOverflow(page: Page, verticalTolerance = 0) {
  const box = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewportWidth: innerWidth, height: document.documentElement.scrollHeight, viewportHeight: innerHeight }));
  expect(box.width).toBeLessThanOrEqual(box.viewportWidth);
  expect(box.height).toBeLessThanOrEqual(box.viewportHeight + verticalTolerance);
}

// R-11..R-14, R-60: all menu scales, all three naming formats, all configured browsers/sizes.
for (const notation of ['both', 'ko', 'en'] as const) {
  for (const id of ids) {
    test(`${id} learn: ${notation} labels, pitches, staff and signature match independent golden data`, async ({ page }) => {
      await seed(page, { notation });
      await openOrder(page, id);
      await expect(page.locator('[data-testid^="key-"]')).toHaveCount(13);
      await enterScale(page, id);
      const fixture = scaleFixture(id);
      const expectedScaleLabel = notation === 'both' ? `${fixture.labels.ko}(${fixture.labels.short})` : notation === 'ko' ? fixture.labels.ko : fixture.labels.en;
      await expect(page.getByRole('heading', { level: 1 })).toContainText(expectedScaleLabel);
      for (const [i, note] of fixture.notes.entries()) {
        const rendered = page.getByTestId(`staff-note-${i}`);
        const expectedNoteLabel = notation === 'both' ? `${note.ko}(${note.en})` : notation === 'ko' ? note.ko : note.en;
        expect(await page.getByTestId(`slot-${i}`).getAttribute('aria-label')).toContain(expectedNoteLabel);
        await expect(rendered).toHaveAttribute('data-midi', String(note.midi));
        await expect(rendered).toHaveAttribute('data-step', String(note.step));
        await expect(rendered).toHaveAttribute('data-alter', note.name.endsWith('#') ? '1' : note.name.endsWith('b') ? '-1' : '0');
      }
      await bake(page);
      await expect(page.getByTestId('key-signature')).toHaveAttribute('data-count', String(fixture.keySig.count));
      await expect(page.getByTestId('key-signature')).toHaveAttribute('data-type', fixture.keySig.type);
      expect(await page.getByTestId('key-signature').locator('[data-step]').evaluateAll(elements => elements.map(element => Number(element.getAttribute('data-step'))))).toEqual(fixture.keySig.steps);
      await expectNoOverflow(page);
      await expect.poll(async () => (await readRecords(page))[id]?.learned).toBe(true);
    });
  }
}

test('F wrong B gives escalating hints, then accepts B-flat without losing correct slots', async ({ page }) => {
  await seed(page);
  await openOrder(page, 'F');
  await enterScale(page, 'F', [0, 2, 4]);
  for (let i = 0; i < 3; i++) await page.getByTestId('key-6').click();
  await expect(page.getByRole('status')).toContainText(/내림나|B♭/);
  await page.getByTestId('key-5').click();
  await expect(page.getByRole('status')).toContainText(/내림나|B♭/);
  await enterScale(page, 'F', [7, 9, 11, 12]);
  await bake(page);
  await expect(page.getByTestId('key-signature')).toHaveAttribute('data-count', '1');
  await expect.poll(async () => (await readRecords(page)).F?.learned).toBe(true);
});

test('challenge does not reveal correctness until baking and only identifies the first mistake', async ({ page }) => {
  const records = { G: { ...emptyRecord(), learned: true } };
  await seed(page, { records });
  await openOrder(page, 'G', 'challenge');
  // G major seventh should be F# (11); put F (10). Also make 4th wrong.
  await enterScale(page, 'G', [0, 2, 4, 6, 7, 9, 10, 12]);
  await expect(page.getByRole('status')).not.toContainText(/정답|틀렸|오답|다시 볼까요/);
  await expect(page.locator('.ss-slot.ss-bad')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^힌트/ })).toHaveCount(0);
  await page.getByRole('button', { name: /굽기/ }).click();
  await expect(page.getByRole('status')).toContainText(/4번째/);
  await expect(page.locator('.ss-slot.ss-bad')).toHaveCount(1);
  await page.getByTestId('key-5').click();
  await page.getByRole('button', { name: /굽기/ }).click();
  await expect(page.getByRole('status')).toContainText(/7번째/);
  await page.getByTestId('key-11').click();
  await bake(page);
  expect((await readRecords(page)).G?.challengeClean).toBe(false);
});

test('F all five order kinds yield three stars and records survive reload', async ({ page }) => {
  test.setTimeout(60_000);
  await seed(page);
  await openOrder(page, 'F');
  await enterScale(page, 'F');
  await bake(page);
  await openOrder(page, 'F', 'challenge');
  await enterScale(page, 'F');
  await bake(page);
  await openOrder(page, 'F', 'fill');
  for (let i = 0; i < 8; i++) {
    const slot = page.getByTestId(`slot-${i}`);
    if ((await slot.getAttribute('data-key')) === '') {
      const key = keysFor('F')[i];
      if (key !== undefined) await page.getByTestId(`key-${key}`).click();
    }
  }
  await bake(page);
  // A learned C neighbor makes the first F fix order the predictable neighbor exercise (R-46).
  await page.evaluate(key => {
    const save = JSON.parse(localStorage.getItem(key) ?? '{}');
    save.records.C = { learned: true, challengeClean: false, fill: false, fix: false, name: false, plays: { learn: 1, challenge: 0, fill: 0, fix: 0, name: 0 } };
    localStorage.setItem(key, JSON.stringify(save));
  }, STORAGE_KEY);
  await openOrder(page, 'F', 'fix');
  await page.getByTestId('slot-3').click();
  await page.getByTestId('key-5').click();
  await bake(page);
  await openOrder(page, 'F', 'name');
  await expect(page.getByTestId('staff-note-3')).toHaveCount(0);
  await page.getByRole('button', { name: /내림나|B♭/ }).last().click();
  await bake(page);
  await expect.poll(async () => {
    const record = (await readRecords(page)).F;
    return record ? [record.learned, record.challengeClean, record.fill, record.fix, record.name] : [];
  }).toEqual([true, true, true, true, true]);
  await page.reload();
  expect((await readRecords(page)).F?.name).toBe(true);
});

test('name correction starts with sound-is-correct feedback and hides unanswered note position', async ({ page }) => {
  await seed(page, { records: { F: { ...emptyRecord(), learned: true, challengeClean: true } } });
  await openOrder(page, 'F', 'name');
  await expect(page.getByTestId('staff-note-3')).toHaveCount(0);
  await page.getByRole('button', { name: /올림가|A♯/ }).last().click();
  await expect(page.getByRole('status')).toContainText(/^소리는 맞아요/);
  await expect(page.getByTestId('staff-note-3')).toHaveCount(0);
  await page.getByRole('button', { name: /내림나|B♭/ }).last().click();
  await expect(page.getByTestId('staff-note-3')).toBeVisible();
  await bake(page);
  expect((await readRecords(page)).F?.name).toBe(false);
});

test('corrupt local storage opens safely and soundless intro C→F→comparison persists', async ({ page }) => {
  await page.addInitScript(key => {
    if (!sessionStorage.getItem('corrupt-seeded')) {
      localStorage.setItem(key, '{corrupt');
      sessionStorage.setItem('corrupt-seeded', 'yes');
    }
  }, STORAGE_KEY);
  await page.goto('/');
  await page.getByRole('button', { name: /처음 시작/ }).click();
  await page.getByRole('button', { name: /소리 없이 시작/ }).click();
  await enterScale(page, 'C');
  await bake(page);
  await page.getByRole('button', { name: /다음 주문 받기/ }).click();
  await enterScale(page, 'F');
  await bake(page);
  await page.getByRole('button', { name: /두 꼬치 비교/ }).click();
  await expect(page.getByText(/어떤 음에서 시작하든/)).toBeVisible();
  await page.getByRole('link', { name: /홈으로/ }).click();
  await expect(page.getByRole('button', { name: /오늘의 주문/ })).toBeVisible();
  await expect.poll(async () => Object.keys(await readRecords(page)).sort()).toEqual(['C', 'F']);
});

test('all orders remain playable with dark appearance and reduced motion', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await seed(page);
  await openOrder(page, 'Bb');
  await enterScale(page, 'Bb');
  await bake(page);
  await expectNoOverflow(page);
});

for (const viewport of [{ width: 360, height: 560 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
  test(`order fits ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seed(page);
    await openOrder(page, 'Bbm');
    await expectNoOverflow(page, viewport.height === 560 ? 10 : 0);
    const key = await page.getByTestId('key-1').boundingBox(); // B is the first white key in Bbm.
    expect(key?.height).toBeGreaterThanOrEqual(100);
    expect(key?.width).toBeGreaterThanOrEqual(37);
  });
}

test('settings modal preserves order and notation preference survives reopening', async ({ page }) => {
  await seed(page);
  await openOrder(page, 'F');
  await enterScale(page, 'F', [0, 2, 4]);
  await page.getByRole('button', { name: /설정/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '영어', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '영어', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: /닫기/ }).click();
  await expect(page.getByTestId('slot-2')).toHaveAttribute('data-key', '4');
  await expect(page.getByTestId('slot-2')).toContainText('A');
  await page.reload();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').settings?.notation, STORAGE_KEY)).toBe('en');
});

test('native keyboard activation works on ingredient buttons with visible focus', async ({ page }) => {
  await seed(page);
  await openOrder(page, 'C');
  const key = page.getByTestId('key-0');
  await key.focus();
  await expect(key).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('slot-0')).toHaveAttribute('data-key', '0');
  await page.getByTestId('key-2').focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('slot-1')).toHaveAttribute('data-key', '2');
});


test('teacher controls require a long press, scope and hint preferences persist, reset can cancel then confirm', async ({ page }) => {
  const records = { C: { ...emptyRecord(), learned: true }, F: { ...emptyRecord(), learned: true } };
  await seed(page, { records });
  await page.goto('/settings/');
  const teacherEntry = page.getByRole('button', { name: /선생님용/ });
  await teacherEntry.click();
  await expect(page.getByRole('heading', { name: '선생님 설정' })).toHaveCount(0);
  const bounds = await teacherEntry.boundingBox();
  if (!bounds) throw new Error('Teacher entry has no clickable bounds');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2100);
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: '선생님 설정' })).toBeVisible();
  await page.getByLabel('열어 둘 범위', { exact: true }).selectOption('basicOnly');
  await page.getByLabel('힌트 버튼 보이기', { exact: true }).uncheck();
  await expect.poll(() => page.evaluate(key => {
    const settings = JSON.parse(localStorage.getItem(key) ?? '{}').settings;
    return [settings?.unlock, settings?.hints];
  }, STORAGE_KEY)).toEqual(['basicOnly', false]);
  await page.getByRole('button', { name: '기록 지우기', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: '모든 별과 기록을 지울까요?' });
  await expect(confirm).toContainText('되돌릴 수 없어요');
  await confirm.getByRole('button', { name: '취소', exact: true }).click();
  expect((await readRecords(page)).C?.learned).toBe(true);
  await page.getByRole('button', { name: '기록 지우기', exact: true }).click();
  await confirm.getByRole('button', { name: '모든 기록 지우기', exact: true }).click();
  await expect.poll(() => readRecords(page)).toEqual({});
  await page.goto('/');
  await expect(page.getByRole('button', { name: /처음 시작/ })).toBeVisible();
  await page.goto('/menu/');
  await expect(page.getByTestId('recipe-D')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByTestId('recipe-C')).toHaveAttribute('aria-disabled', 'false');
});
