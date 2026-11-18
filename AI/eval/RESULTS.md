# TaraTrip AI 평가 결과

- 장소 60곳(UST 리서치 데이터), 여행자 20명, 여행일 2026-11-25
- 취향 점수: 태그·키워드 방식(키 없음)
- 세 방법 모두 같은 규칙(영업시간, 예산, 종료 시각, 장소 수, 식사 제한, 이동수단)을 지킴. 차이는 "어떤 곳을 어떤 순서로 고르나"뿐
- 평균은 추천에 성공한 여행자 기준

| 지표 | TaraTrip | 가까운 곳부터 | 무작위 |
|---|---|---|---|
| 추천 성공 | 100% | 100% | 100% |
| 장소 수 | 4.2 | 4.0 | 3.7 |
| 걷는 시간(분) | 21 | 18 | 18 |
| 가장 긴 도보 구간(분) | 10 | 9 | 10 |
| 이동 시간 합(분) | 69 | 32 | 89 |
| 하루 중 이동 비율 | 25% | 12% | 30% |
| 문 열기 기다린 시간(분) | 4 | 20 | 24 |
| 교통비(페소) | 40 | 19 | 91 |
| 예산 사용률 | 61% | 70% | 54% |
| 취향 일치율 | 74% | 41% | 25% |
| 소상공인 비율 | 72% | 52% | 63% |
| 현지 평점(1~10) | 8.5 | 8.1 | 8.4 |

## 읽는 법
- **취향 일치율**: 코스의 장소 중 여행자 취향 키워드(이름·설명·태그·대표 메뉴)가 들어간 곳의 비율
- **하루 중 이동 비율**: 출발부터 출발지로 돌아올 때까지 중 이동(도보 + 탈것)에 쓴 시간
- TaraTrip은 취향·소상공인·현지 평점을 챙기느라 "가까운 곳부터"보다 조금 더 이동함. 대신 문 열기를 기다리는 시간은 거의 없음

## 예시
**기념품 쇼핑**
- TaraTrip (취향 75%, 이동 50분): 10:04 Mananzan Handicrafts → 10:53 HUB | Make Lab → 12:03 Pasig River Esplanade → 13:13 Silahis Center
- 가까운 곳부터 (취향 25%, 이동 9분): 10:03 Bacolod Chk-n-BBQ House → 11:05 The Papier Tole Shop → 11:40 Casa Manila → 12:10 San Agustin Convent Museum

**역사 덕후**
- TaraTrip (취향 100%, 이동 80분): 10:03 Bahay Tsinoy → 11:05 Casa Manila → 11:35 San Agustin Convent Museum → 12:51 Rizal Park (Luneta  Park) → 14:23 UST Museum
- 가까운 곳부터 (취향 40%, 이동 16분): 10:03 Bacolod Chk-n-BBQ House → 11:05 The Papier Tole Shop → 11:40 Archdiocesan Shrine of Nuestra Señora de la Consolación y Correa - San Agustín Church → 12:10 Barbara's Heritage Restaurant → 13:44 Silahis Center

**UST 학생 3시간**
- TaraTrip (취향 67%, 이동 22분): 14:01 UST Museum → 15:08 Lola Ely's Tapsilog Atbp. → 15:59 Mang Tootz Foodhouse
- 가까운 곳부터 (취향 33%, 이동 12분): 14:01 UST Museum → 15:04 Santisimo Rosario Parish Church → 15:37 Dominique's Kitchen

## 주의
- 받은 UST 데이터의 좌표가 소수점 2~3자리로 잘려 있어서(수백 m 오차) 이동 시간은 대략값
- 키 없이 돌리면 취향은 키워드 방식이라, 취향 일치율 지표와 같은 단어를 씀. 진짜 임베딩 결과는 `--real`로 확인
- 요금·속도는 recommend.py의 TRANSPORT 추정값

여행자별 전체 코스와 지표는 results.csv
