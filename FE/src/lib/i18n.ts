import { useSyncExternalStore } from 'react'

// Traveler screens in Korean or English. The merchant screens are English-only.
// The choice is sent as `lang` in POST /api/recommendations (docs/API.md), so the
// AI's summary and reasons come back in the same language.

export type Lang = 'ko' | 'en'

const KEY = 'taratrip.lang'
const listeners = new Set<() => void>()

function isLang(v: unknown): v is Lang {
  return v === 'ko' || v === 'en'
}

/** ?lang=en in a shared link > the last choice on this device > the browser language. */
function initialLang(): Lang {
  const fromUrl = new URLSearchParams(window.location.search).get('lang')
  if (isLang(fromUrl)) return fromUrl
  try {
    const saved = localStorage.getItem(KEY)
    if (isLang(saved)) return saved
  } catch {
    // Storage blocked: fall through to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

function save(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    // Not remembered; the choice still holds for this visit.
  }
}

let current: Lang = initialLang()
document.documentElement.lang = current
// A ?lang= link sticks, so a tester who reloads without it stays in that language.
if (new URLSearchParams(window.location.search).has('lang')) save(current)

export function setLang(lang: Lang) {
  if (lang === current) return
  current = lang
  document.documentElement.lang = lang
  save(lang)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, () => current)
}

/** Screen text for the current language. */
export function useT(): Messages {
  return MESSAGES[useLang()]
}

const ko = {
  // Input
  regionLabel: '지역',
  title: (day: string) => `${day} 하루,\n어떻게 보내고 싶나요?`,
  freeTextLabel: '편하게 적어도 돼요',
  freeTextPlaceholder: '예: 1,000페소로 현지 음식 먹고 시장 구경하고 싶어',
  budgetLabel: '하루 예산',
  pesoUnit: '페소',
  rateNote: '오늘 환율 기준',
  whenLabel: '언제 가요?',
  otherDay: '다른 날',
  pickDate: '여행 날짜 고르기',
  startTime: '출발',
  endTime: '마무리',
  timeError: '마무리 시간은 출발 시간보다 늦어야 해요.',
  foodsLabel: '먹고 싶은 음식',
  mustVisitLabel: '꼭 가보고 싶은 곳',
  searchSoonTitle: '관광지 검색은 준비 중이에요',
  searchAttractions: '관광지 검색',
  soon: '준비 중',
  startLabel: '출발 위치',
  locate: { idle: '현재 위치로 설정', locating: '찾는 중…', here: '현재 위치 사용 중', denied: '기본 위치 사용 중' },
  startDenied: '위치를 쓸 수 없어서 기본 출발점으로 추천해요. 지도에서 고르는 기능은 곧 열려요.',
  submit: '코스 추천받기',
  langSwitch: 'English로 보기',
  bizTitle: '가게를 운영하시나요?',
  bizBody: '무료로 등록하면 여행자 코스에 소개돼요',

  // Loading
  loadingSteps: ['요청 읽기', '예산 안의 가게 찾기', '동선 잇기'],
  loadingTitle: (region: string) => `${region}의 하루를\n엮고 있어요`,
  stepState: { done: '완료', active: '진행 중', waiting: '대기' },
  cancel: '추천 그만두기',

  // Result
  backToInput: '조건 입력으로 돌아가기',
  ticketSub: (region: string, n: number) => `${region} 하루 코스 · ${n}곳`,
  budget: '예산',
  left: '남는 돈',
  totalTime: '소요 시간',
  food: '식비',
  entry: '입장료',
  transport: '교통비',
  why: '왜 이 코스냐면',
  stopsHeading: '코스 순서',
  fromStart: '출발지에서',
  toStart: '출발지로',
  again: '조건 바꿔서 다시 추천받기',

  // Place
  back: '뒤로',
  placeNotFound: '장소 정보를 찾지 못했어요.',
  loading: '불러오는 중…',
  nextPhoto: '다음 사진',
  photoAlt: (name: string, i: number) => `${name} 사진 ${i}`,
  backToRoute: '코스로 돌아가기',
  stopNth: (n: number) => `코스 ${n}번째 · `,
  cashOnly: '현금만 가능',
  signatureMenu: '대표 메뉴',
  priceRange: '가격대',
  hours: '영업시간',
  address: '주소',
  inRoute: '이 코스에서는',
  stay: (d: string) => `${d} 머물러요`,
  directions: '길찾기',

  // Errors
  errors: {
    budget: (budget: string) => ({
      title: '예산이 조금 부족해요',
      body: `${budget}으로는 하루 코스를 짜기 어려워요. 예산을 조금 올리거나, 가고 싶은 곳을 줄여 보세요.`,
      edit: '예산 다시 정하기',
    }),
    noResults: (region: string) => ({
      title: '맞는 장소를 찾지 못했어요',
      body: `${region}에서 고른 조건에 맞는 곳이 아직 없어요. 다른 음식을 고르거나 조건을 줄여 보세요.`,
      edit: '조건 바꾸기',
    }),
    timeout: {
      title: '추천이 평소보다 오래 걸려요',
      body: '잠시 후 다시 시도해 주세요. 입력한 조건은 그대로 남아 있어요.',
      edit: '조건 바꾸기',
    },
    other: {
      title: '추천을 받지 못했어요',
      body: '연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요. 입력한 조건은 그대로 남아 있어요.',
      edit: '조건 바꾸기',
    },
    retry: '다시 시도하기',
  },

  // Splash
  tagline: '예산 안에서 만나는 현지의 하루',
  start: 'TaraTrip 시작하기',

  // Formatting
  free: '무료',
  today: '오늘',
  tomorrow: '내일',
  weekdays: ['일', '월', '화', '수', '목', '금', '토'],
  date: (m: number, d: number, weekday: string) => `${m}월 ${d}일 (${weekday})`,
  minutes: (m: number) => `${m}분`,
  hoursMinutes: (h: number, m: number) => (m ? `${h}시간 ${m}분` : `${h}시간`),
  category: { restaurant: '식당', market: '시장', shop: '가게', attraction: '관광지' },
  mode: { walk: '도보', jeepney: '지프니', tricycle: '트라이시클', taxi: '택시', other: '이동' },
}

export type Messages = typeof ko

const en: Messages = {
  regionLabel: 'Area',
  title: (day: string) => `How do you want\nto spend ${day === 'Today' || day === 'Tomorrow' ? day.toLowerCase() : day}?`,
  freeTextLabel: 'Tell us in your own words',
  freeTextPlaceholder: 'e.g. Local food and a market walk for about 1,000 pesos',
  budgetLabel: 'Budget for the day',
  pesoUnit: 'PHP',
  rateNote: "today's rate",
  whenLabel: 'When?',
  otherDay: 'Other day',
  pickDate: 'Pick a trip date',
  startTime: 'Start',
  endTime: 'End',
  timeError: 'The end time must be later than the start time.',
  foodsLabel: 'Food you want to try',
  mustVisitLabel: 'Places you must see',
  searchSoonTitle: 'Attraction search is coming soon',
  searchAttractions: 'Search attractions',
  soon: 'Soon',
  startLabel: 'Starting point',
  locate: { idle: 'Use my location', locating: 'Locating…', here: 'Using my location', denied: 'Using default start' },
  startDenied: "We couldn't get your location, so the route starts from a default point. Picking on the map is coming soon.",
  submit: 'Plan my day',
  langSwitch: '한국어로 보기',
  bizTitle: 'Own a local business?',
  bizBody: 'List it free and get suggested in travelers’ routes',

  loadingSteps: ['Reading your request', 'Finding places in budget', 'Connecting the stops'],
  loadingTitle: (region: string) => `Putting together\nyour day in ${region}`,
  stepState: { done: 'Done', active: 'Working', waiting: 'Waiting' },
  cancel: 'Stop planning',

  backToInput: 'Back to your preferences',
  ticketSub: (region: string, n: number) => `A day in ${region} · ${n} ${n === 1 ? 'stop' : 'stops'}`,
  budget: 'Budget',
  left: 'Left over',
  totalTime: 'Duration',
  food: 'Food',
  entry: 'Entry fees',
  transport: 'Transport',
  why: 'Why this route',
  stopsHeading: 'Your stops',
  fromStart: 'From start',
  toStart: 'Back to start',
  again: 'Change preferences and try again',

  back: 'Back',
  placeNotFound: "We couldn't find this place.",
  loading: 'Loading…',
  nextPhoto: 'Next photo',
  photoAlt: (name: string, i: number) => `${name} photo ${i}`,
  backToRoute: 'Back to the route',
  stopNth: (n: number) => `Stop ${n} · `,
  cashOnly: 'Cash only',
  signatureMenu: 'Signature dish',
  priceRange: 'Price range',
  hours: 'Opening hours',
  address: 'Address',
  inRoute: 'On this route',
  stay: (d: string) => `${d} here`,
  directions: 'Directions',

  errors: {
    budget: (budget: string) => ({
      title: 'Your budget is a little short',
      body: `${budget} is too tight for a full day. Try raising the budget or asking for fewer places.`,
      edit: 'Change budget',
    }),
    noResults: (region: string) => ({
      title: "We couldn't find a match",
      body: `Nothing in ${region} fits these choices yet. Try other food or fewer conditions.`,
      edit: 'Change preferences',
    }),
    timeout: {
      title: 'This is taking longer than usual',
      body: 'Please try again in a moment. Your preferences are still filled in.',
      edit: 'Change preferences',
    },
    other: {
      title: "We couldn't get a route",
      body: 'The connection may have dropped. Please try again. Your preferences are still filled in.',
      edit: 'Change preferences',
    },
    retry: 'Try again',
  },

  tagline: 'A local day within your budget',
  start: 'Start TaraTrip',

  free: 'Free',
  today: 'Today',
  tomorrow: 'Tomorrow',
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  date: (m: number, d: number, weekday: string) =>
    `${weekday}, ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${d}`,
  minutes: (m: number) => `${m} min`,
  hoursMinutes: (h: number, m: number) => (m ? `${h} h ${m} min` : `${h} h`),
  category: { restaurant: 'Restaurant', market: 'Market', shop: 'Shop', attraction: 'Attraction' },
  mode: { walk: 'Walk', jeepney: 'Jeepney', tricycle: 'Tricycle', taxi: 'Taxi', other: 'Travel' },
}

const MESSAGES: Record<Lang, Messages> = { ko, en }
