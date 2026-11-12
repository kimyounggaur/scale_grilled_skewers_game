# reference — 음계 꼬치구이 참조 자료

이 폴더의 파일은 읽기만 한다. 앱을 만드는 동안 고치지 않는다(규칙을 바꿀 때는 기획서 6-4절의 순서를 따른다).

| 파일 | 내용 |
|---|---|
| `skewer_golden_v1.json` | 검증 자료(정답표) 5,277건. 파이썬으로 따로 짠 계산의 결과 |
| `engine.reference.ts` | 규칙 엔진 참조 구현. 검증 자료와 모두 일치하고 엄격 모드 타입 검사를 통과한다 |
| `check-golden.mts` | 대조 스크립트. `npx tsx check-golden.mts` (참조 엔진), `npx tsx check-golden.mts ../../src/game/index.ts` (앱의 엔진) |
| `gen_golden.py` | 검증 자료 생성기. `python3 gen_golden.py skewer_golden_v1.json` |
| `scale-skewer-prototype.html` | 시제품. 브라우저에서 바로 열린다. 모양·색·배치·문구·소리의 본보기 |
| `staff_glyphs.json` | 악보 기호 윤곽선(높은음자리표, 내림표, 올림표, 제자리표, 온음표, 검은 음표 머리) |
| `Bravura-OFL.txt` | 악보 기호의 출처인 글꼴 Bravura 의 사용 조건(SIL Open Font License 1.1) |

시제품은 글꼴을 인터넷에서 받아 온다. 인터넷이 없으면 기기의 기본 글꼴로 보인다.
