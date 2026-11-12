# 음계 꼬치구이 — 검증 자료 생성기 (참조 구현 1: 파이썬)
# TypeScript 참조 엔진과 일부러 다른 방식으로 짰다. 음계는 "조표 표 → 음 이름 → 음높이" 순서로 만들고 간격 순서로 검산한다.
import json, sys
LET = 'CDEFGAB'
NAT = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
PAT = {'major':[2,2,1,2,2,2,1], 'minor':[2,1,2,2,1,2,2]}
SOL = {'major':list('도레미파솔라시도'), 'minor':list('라시도레미파솔라')}
SIG = {'major':{'C':0,'G':1,'D':2,'A':3,'E':4,'B':5,'F#':6,'C#':7,'F':-1,'Bb':-2,'Eb':-3,'Ab':-4,'Db':-5,'Gb':-6,'Cb':-7},
       'minor':{'A':0,'E':1,'B':2,'F#':3,'C#':4,'G#':5,'D#':6,'A#':7,'D':-1,'G':-2,'C':-3,'F':-4,'Bb':-5,'Eb':-6,'Ab':-7}}
SH = 'FCGDAEB'; FL = 'BEADGCF'
KS_STEPS = {'sharp':[38,35,39,36,33,37,34], 'flat':[34,37,33,36,32,35,31]}
BLACK = {1,3,6,8,10}
KO = {'C':'다','D':'라','E':'마','F':'바','G':'사','A':'가','B':'나'}
BASIC = ['C','F','G','Bb','Am','Dm']
CH_MAJOR = ['D','A','Eb','E','Ab','B','Db','F#']
CH_MINOR = ['Em','Gm','Bm','Cm','F#m','Fm','C#m','Bbm','G#m','D#m']
TWINS = {'F#':'Gb','Gb':'F#','D#m':'Ebm','Ebm':'D#m'}
TWIN_IDS = ['Gb','Ebm']
ENGINE_ONLY = ['C#','Cb','A#m','Abm']
CONTENT = BASIC + CH_MAJOR + CH_MINOR + TWIN_IDS
ALL = CONTENT + ENGINE_ONLY

def txt(n): return n[0] + ('#' if n[1] == 1 else 'b' if n[1] == -1 else '')
def uni(n): return n[0] + ('♯' if n[1] == 1 else '♭' if n[1] == -1 else '')
def ko(n): return ('올림' if n[1] == 1 else '내림' if n[1] == -1 else '') + KO[n[0]]
def parse(s): return (s[0], s.count('#') - s.count('b'))
def split_id(i): return (i[:-1], 'minor') if i.endswith('m') else (i, 'major')
def ledger(step):
    out = []
    q = 28
    while q >= step: out.append(q); q -= 2
    q = 40
    while q <= step: out.append(q); q += 2
    return out

SC = {}
def scale(i):
    if i in SC: return SC[i]
    t, mode = split_id(i); n = SIG[mode][t]
    acc = {L:1 for L in SH[:n]} if n > 0 else {L:-1 for L in FL[:-n]} if n < 0 else {}
    letter, alt = parse(t); li = LET.index(letter); notes = []
    for k in range(8):
        L = LET[(li + k) % 7]; a = acc.get(L, 0); octv = 4 + (li + k) // 7
        notes.append({'name':(L, a), 'midi':12 * (octv + 1) + NAT[L] + a, 'step':octv * 7 + LET.index(L)})
    assert [notes[k+1]['midi'] - notes[k]['midi'] for k in range(7)] == PAT[mode], i
    assert notes[0]['name'] == (letter, alt), i
    tm = notes[0]['midi']; assert tm == 60 + NAT[letter] + alt and notes[7]['midi'] == tm + 12
    typ = 'sharp' if n > 0 else 'flat' if n < 0 else 'none'
    letters = list(SH[:n]) if n > 0 else list(FL[:-n]) if n < 0 else []
    tray = []
    for x in range(13):
        m = tm + x; pc = m % 12
        if pc in BLACK:
            lo = next(L for L in LET if NAT[L] == (pc - 1) % 12); hi = next(L for L in LET if NAT[L] == (pc + 1) % 12)
            names = [(lo, 1), (hi, -1)]
        else: names = [(next(L for L in LET if NAT[L] == pc), 0)]
        tray.append({'midi':m, 'pc':pc, 'black':pc in BLACK, 'names':names})
    SC[i] = {'id':i, 'mode':mode, 'tonic':(letter, alt), 'tonicMidi':tm, 'signed':n, 'notes':notes,
             'keySig':{'type':typ, 'count':abs(n), 'letters':letters, 'steps':KS_STEPS[typ][:abs(n)] if typ != 'none' else []}, 'tray':tray}
    return SC[i]

BY_SIG = {mode:{v:(k if mode == 'major' else k + 'm') for k, v in SIG[mode].items()} for mode in SIG}
def relative(i):
    s = scale(i)
    return txt(s['notes'][5]['name']) + 'm' if s['mode'] == 'major' else txt(s['notes'][2]['name'])
def neighbor(i):
    s = scale(i); n = s['signed']
    return None if n == 0 else BY_SIG[s['mode']][n - 1 if n > 0 else n + 1]

def spell_wrong(s, slot, pc):
    exp = s['notes'][slot]['name']
    for k in range(7):                       # ① 음계에 있는 음이면 음계의 이름
        if s['notes'][k]['midi'] % 12 == pc: return s['notes'][k]['name']
    for L in LET:                            # ② 흰건반은 제 이름
        if NAT[L] == pc: return (L, 0)
    d = ((pc - NAT[exp[0]] + 6) % 12) - 6    # ③ 정답 글자에서 반음 차이
    if d in (1, -1): return (exp[0], d)
    if s['keySig']['type'] == 'flat':        # ④ 조표 쪽
        return (next(L for L in LET if NAT[L] == (pc + 1) % 12), -1)
    return (next(L for L in LET if NAT[L] == (pc - 1) % 12), 1)
def step_of(name, midi):
    o, r = divmod(midi - name[1] - NAT[name[0]], 12); assert r == 0
    return (o - 1) * 7 + LET.index(name[0])
def place(s, slot, key):
    tap = s['tonicMidi'] + key; pc = tap % 12; exp = s['notes'][slot]; ok = pc == exp['midi'] % 12
    midi = exp['midi'] if ok else tap
    name = exp['name'] if ok else spell_wrong(s, slot, pc)
    return {'ok':ok, 'pc':pc, 'midi':midi, 'name':name, 'step':step_of(name, midi)}
def diagnose(prev, cur, need):
    d = cur - prev
    kind = 'half' if d == 1 else 'whole' if d == 2 else 'wider' if d > 2 else 'notHigher'
    return {'semitones':d, 'kind':kind, 'match':d == need}
def hint(s, slot, level):
    exp = s['notes'][slot]; key = exp['midi'] - s['tonicMidi']
    if slot == 0: return ['start', None, 0, txt(exp['name'])]
    need = 'half' if PAT[s['mode']][slot - 1] == 1 else 'whole'
    if level <= 1: return ['interval', need, None, None]
    if level == 2: return ['position', need, key, None]
    return ['name', need, key, txt(exp['name'])]
def judge(s, keys):
    ps = [place(s, k, keys[k]) for k in range(8)]
    wrong = [k for k in range(8) if not ps[k]['ok']]
    first = None
    if wrong:
        k = wrong[0]; st = PAT[s['mode']]
        b = diagnose(ps[k-1]['midi'], ps[k]['midi'], st[k-1]) if k > 0 else None
        a = diagnose(ps[k]['midi'], ps[k+1]['midi'], st[k]) if k < 7 else None
        first = {'slot':k, 'before':[b['semitones'], b['kind'], st[k-1]] if b else None, 'after':[a['semitones'], a['kind'], st[k]] if a else None}
    return {'ok':not wrong, 'slots':''.join('1' if p['ok'] else '0' for p in ps), 'firstWrong':wrong[0] if wrong else -1, 'wrongCount':len(wrong), 'first':first}
def alt_name(n):
    pc = (NAT[n[0]] + n[1]) % 12
    for L in LET:
        if NAT[L] == pc: return (L, 0)
    if n[1] < 0: return (next(L for L in LET if NAT[L] == (pc - 1) % 12), 1)
    return (next(L for L in LET if NAT[L] == (pc + 1) % 12), -1)
def name_choice(s, slot):
    if slot < 1 or slot > 6: return None
    n = s['notes'][slot]['name']
    if n[1] == 0: return None
    return {'answer':txt(n), 'other':txt(alt_name(n)), 'prevLetter':s['notes'][slot-1]['name'][0], 'letter':n[0]}

M32 = 0xFFFFFFFF
def mulberry32(seed):
    st = [seed & M32]
    def rnd():
        st[0] = (st[0] + 0x6D2B79F5) & M32
        t = st[0]
        t = ((t ^ (t >> 15)) * (t | 1)) & M32
        t = ((t + (((t ^ (t >> 7)) * (t | 61)) & M32)) & M32) ^ t
        return ((t ^ (t >> 14)) & M32) / 4294967296
    return rnd
def make_fill(s, seed, n):
    r = mulberry32(seed); c = [1,2,3,4,5,6]
    for i in range(5, 0, -1):
        j = int(r() * (i + 1)); c[i], c[j] = c[j], c[i]
    blanks = c[:n]; st = PAT[s['mode']]
    half = [i for i in range(1, 7) if st[i-1] == 1 or st[i] == 1]
    if not any(b in half for b in blanks):
        blanks.remove(max(blanks)); blanks.append(min(h for h in half if h not in blanks))
    return sorted(blanks)
def make_fix(s, seed):
    r = mulberry32(seed); slot = 1 + int(r() * 6); exp = s['notes'][slot]; pc = exp['midi'] % 12; key = exp['midi'] - s['tonicMidi']
    if exp['name'][1] != 0:
        delta = -exp['name'][1]; kind = 'forgot'       # 변화표를 빼먹은 실수: 같은 글자의 제자리 음
    else:
        cands = [d for d in (-1, 1) if (pc + d) % 12 not in (s['notes'][slot-1]['midi'] % 12, s['notes'][slot+1]['midi'] % 12)]
        delta = cands[int(r() * len(cands))]; kind = 'low' if delta < 0 else 'high'
    wk = key + delta; p = place(s, slot, wk); assert not p['ok']
    return {'slot':slot, 'wrongKey':wk, 'wrongName':txt(p['name']), 'kind':kind}
def neighbor_fix(i):
    s = scale(i); src = neighbor(i)
    if src is None: return None
    spcs = {n['midi'] % 12 for n in scale(src)['notes']}
    diff = [k for k in range(7) if s['notes'][k]['midi'] % 12 not in spcs]; assert len(diff) == 1 and diff[0] != 0, i
    k = diff[0]; key = s['notes'][k]['midi'] - s['tonicMidi']; wk = key - 1 if s['signed'] > 0 else key + 1
    p = place(s, k, wk); assert not p['ok'] and (p['midi'] % 12) in spcs
    return {'source':src, 'slot':k, 'wrongKey':wk, 'wrongName':txt(p['name'])}
def has_name_slots(s): return any(s['notes'][k]['name'][1] != 0 for k in range(1, 7))
def stars(rec, s):
    if not rec['learned']: return 0
    if not rec['challengeClean']: return 1
    if rec['fill'] and rec['fix'] and (rec['name'] or not has_name_slots(s)): return 3
    return 2
def unlocked(i, prog, setting):
    if i not in CONTENT: return False
    if setting == 'all': return True
    g = lambda x: prog.get(x, 0)
    if i in BASIC:
        k = BASIC.index(i); return k == 0 or g(BASIC[k-1]) >= 1
    if setting == 'basicOnly': return False
    basic_done = all(g(b) >= 1 for b in BASIC)
    if i in TWIN_IDS: return basic_done and g(TWINS[i]) >= 1
    return basic_done

G = {'version':1, 'title':'음계 꼬치구이 엔진 검증 자료',
     'course':{'basic':BASIC, 'challengeMajor':CH_MAJOR, 'challengeMinor':CH_MINOR, 'twins':{'F#':'Gb','D#m':'Ebm'}, 'engineOnly':ENGINE_ONLY},
     'keySigSteps':KS_STEPS, 'scales':{}, 'place':{}, 'hint':{}, 'nameChoice':{}, 'neighborFix':{}}
for i in ALL:
    s = scale(i); t = s['tonic']
    G['scales'][i] = {'mode':s['mode'], 'tonic':txt(t), 'tonicMidi':s['tonicMidi'], 'signed':s['signed'], 'steps':PAT[s['mode']], 'solfege':SOL[s['mode']],
        'labels':{'ko':ko(t) + ('장조' if s['mode'] == 'major' else '단조'), 'en':uni(t) + ('장음계' if s['mode'] == 'major' else '단음계'), 'short':uni(t) + ('' if s['mode'] == 'major' else 'm')},
        'notes':[{'name':txt(n['name']), 'midi':n['midi'], 'step':n['step'], 'ledger':ledger(n['step']), 'ko':ko(n['name']), 'en':uni(n['name'])} for n in s['notes']],
        'keySig':s['keySig'], 'tray':[{'midi':k['midi'], 'black':k['black'], 'names':[txt(x) for x in k['names']]} for k in s['tray']],
        'relative':relative(i), 'neighbor':neighbor(i), 'twin':TWINS.get(i), 'hasNameSlots':has_name_slots(s),
        'group':'basic' if i in BASIC else 'challenge' if i in CH_MAJOR + CH_MINOR else 'twin' if i in TWIN_IDS else 'engineOnly'}
    G['place'][i] = [['%d|%s|%d|%d' % (p['ok'], txt(p['name']), p['midi'], p['step']) for p in (place(s, slot, key) for key in range(13))] for slot in range(8)]
    G['hint'][i] = [[hint(s, slot, lv) for lv in (1, 2, 3)] for slot in range(8)]
    G['nameChoice'][i] = [name_choice(s, slot) for slot in range(8)]
    G['neighborFix'][i] = neighbor_fix(i)
G['diagnose'] = [[60, 60 + d, need, diagnose(60, 60 + d, need)['kind'], diagnose(60, 60 + d, need)['match']] for d in range(-12, 13) for need in (1, 2)]
G['rng'] = [[seed, [int(v * 1e9) for v in (lambda r: [r() for _ in range(6)])(mulberry32(seed))]] for seed in (0, 1, 7, 42, 2026, 123456789, 4294967295)]
G['judge'] = []
for si, i in enumerate(CONTENT):
    s = scale(i); good = [n['midi'] - s['tonicMidi'] for n in s['notes']]
    cases = [good, good[:7] + [0], [12] + good[1:]]
    for seed in (1, 2, 3):
        r = mulberry32(seed * 1000 + si); ks = list(good); slot = 1 + int(r() * 7); nk = int(r() * 13)
        while (s['tonicMidi'] + nk) % 12 == s['notes'][slot]['midi'] % 12: nk = (nk + 1) % 13
        ks[slot] = nk
        if seed == 3:
            slot2 = int(r() * 8); nk2 = int(r() * 13)
            while (s['tonicMidi'] + nk2) % 12 == s['notes'][slot2]['midi'] % 12: nk2 = (nk2 + 1) % 13
            ks[slot2] = nk2
        cases.append(ks)
    for ks in cases: G['judge'].append({'scale':i, 'keys':ks, **judge(s, ks)})
G['fill'] = [{'scale':i, 'seed':seed, 'blanks':n, 'expect':make_fill(scale(i), seed, n)} for i in CONTENT for seed in (1, 7, 42, 2026) for n in (2, 3, 4)]
G['fix'] = [{'scale':i, 'seed':seed, **make_fix(scale(i), seed)} for i in CONTENT for seed in range(1, 13)]
G['stars'] = [{'scale':i, 'record':{'learned':bool(b & 16), 'challengeClean':bool(b & 8), 'fill':bool(b & 4), 'fix':bool(b & 2), 'name':bool(b & 1)},
               'expect':stars({'learned':bool(b & 16), 'challengeClean':bool(b & 8), 'fill':bool(b & 4), 'fix':bool(b & 2), 'name':bool(b & 1)}, scale(i))} for i in ('C', 'F') for b in range(32)]
PROG = [{}, {'C':1}, {'C':1,'F':2,'G':1}, {'C':3,'F':1,'G':1,'Bb':1,'Am':1}, {b:1 for b in BASIC}, {**{b:1 for b in BASIC}, 'F#':1}, {**{b:2 for b in BASIC}, 'D#m':3, 'F#':0}, {'F':3,'Dm':3}]
G['unlock'] = [{'setting':st, 'progress':p, 'expect':{i:unlocked(i, p, st) for i in ALL}} for st in ('sequence', 'basicOnly', 'all') for p in PROG]
json.dump(G, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
nplace = sum(len(row) for i in G['place'] for row in G['place'][i])
print('음계', len(G['scales']), '| 자리 판정', nplace, '| 힌트', sum(len(r) for i in G['hint'] for r in G['hint'][i]), '| 굽기 판정', len(G['judge']),
      '| 빈자리', len(G['fill']), '| 고쳐 굽기', len(G['fix']), '| 이웃 꼬치', sum(1 for v in G['neighborFix'].values() if v), '| 별', len(G['stars']), '| 잠금', len(G['unlock']))
# 눈으로 볼 요약
for i in ('F', 'G', 'Bb', 'Dm', 'F#', 'Gb', 'Ebm'):
    nf = G['neighborFix'][i]; print(' ', i, [n['name'] for n in G['scales'][i]['notes']], '이웃:', nf['source'], '자리', nf['slot'] + 1, nf['wrongName'], '| 이름표:', [c['answer'] + '/' + c['other'] for c in G['nameChoice'][i] if c])
print('  고쳐 굽기 예:', [(x['scale'], x['slot'] + 1, x['wrongName'], x['kind']) for x in G['fix'][:6]])
print('  빈자리 예:', [(x['scale'], x['blanks'], x['expect']) for x in G['fill'][:4]])
