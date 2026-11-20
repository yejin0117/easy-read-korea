# Easy Read Korea

'풀어읽기'라는 웹앱을 만들어줘. 공문, 계약서, 약 설명서처럼 어려운 글을 읽는 사람 수준에 맞춰 쉬운 말로 바꿔주는 서비스야. 첨부한 디자인 시안 이미지를 최대한 따라줘.

[페이지 4개, 상단 메뉴로 연결: 변환하기 / 내 기록 / 소개, 로고를 누르면 메인으로]

1. 메인(/): 큰 제목 "어려운 글, 이제 풀어서 읽어요", 한 줄 설명, 화면 가운데 큰 초록 버튼 '풀어읽기 시작하기'(누르면 /convert), 아래 기능 소개 카드 3개(핵심 3줄 요약 / 읽는 사람에 맞춰 / 변환 오류 확인)

2. 변환(/convert):

 - 입력: 큰 텍스트 입력창, 예시 불러오기 버튼 3개(전입신고 안내, 임대차 계약서, 약 설명서 — 각각 한자어·법률 용어가 섞인 실제 같은 예시 글), 수준 선택(초등학생/중학생/한국어 학습자), '풀어읽기' 버튼, "개인정보가 담긴 글은 넣지 마세요" 안내

 - 결과(버튼을 누른 뒤 표시): 핵심 3줄 요약 → 쉬운 글(크게, 바뀐 단어는 형광펜 표시, 마우스를 올리면 원래 단어와 뜻 표시) → 어려운 단어 풀이 목록(단어마다 '+ 단어장' 버튼). 원문은 '원문 같이 보기' 버튼으로 펼쳐서 좌우 비교(모바일은 위아래)

 - 지금은 AI 연결 전이니 버튼을 누르면 예시용 가짜 결과를 보여줘

3. 내 기록(/history): 탭 2개 '변환 기록'과 '내 단어장'

 - 변환 기록: 날짜, 수준, 제목, 쉬운 글 첫 줄, 다시 보기·삭제 버튼, 검색창

 - 내 단어장: 단어 카드(원래 단어, 쉬운 말, 뜻, 나온 문장과 출처), '외우는 중/다 외웠어요' 표시와 필터, 삭제 버튼

4. 소개(/about): 만든 이유, 이런 분들을 위해(어르신, 어린이·청소년, 한국어 학습자, 낯선 서류를 처음 만난 사람), 작동 방식 4단계(글 입력 → AI 변환 → 변환 오류 확인 → 결과와 단어장), 수준별 규칙 비교표, 이용 전 주의사항(AI는 틀릴 수 있음, 오류 확인은 숫자·날짜만 검사, 개인정보 입력 금지, 법률·의료 상담 대체 아님), 앞으로의 계획(자체 난이도 판별 모델 → 자체 변환 모델 → 시선 추적), 시작하기 버튼

[디자인 — 사이트 자체가 읽기 쉬워야 함]

- 배경 아이보리 #FAF7F2, 카드 흰색, 테두리 #DDD5C6, 본문 글자 진한 남색 #1F2A44(회색 글씨는 작은 보조 설명에만), 강조색 초록 #2F6B4A, 경고는 빨강 계열

- 글꼴 Pretendard, 본문 18px 이상, 줄 간격 1.7, 제목 두께 700(너무 굵게 하지 말 것)

- 강조는 쉬운 글의 노란 형광펜 하나만, 그 외 장식 최소화

- 버튼은 크고 둥글게(최소 높이 44px), 상단에 글씨 크기 조절 버튼(가−/가+)

- 접근성: 충분한 명암 대비, 경고는 색+아이콘+문구 함께, 아이콘 버튼에 aria-label

- 모바일에서도 깨지지 않게

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6486787c-f2ef-42ea-a1e8-905da2924e4b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
