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
  timeZoneNote: '날짜와 시간은 필리핀 시간(PHT, UTC+8) 기준이에요.',
  foodsLabel: '먹고 싶은 음식',
  foodPlaceholder: '예: sisig, 할로할로',
  add: '추가',
  removeFood: (food: string) => `${food} 빼기`,
  mustVisitLabel: '꼭 가보고 싶은 곳',
  searchSoonTitle: '관광지 검색은 준비 중이에요',
  searchAttractions: '관광지 검색',
  soon: '준비 중',
  startLabel: '출발 위치',
  useMyLocation: '현재 위치로',
  locating: '찾는 중…',
  cancelLocate: '취소',
  addressPlaceholder: '주소나 장소 이름으로 검색 (예: Intramuros)',
  search: '검색',
  addressNone: '찾는 곳이 없어요. 다른 이름으로 검색하거나 지도를 눌러 골라 주세요.',
  addressFailed: '지금은 주소 검색이 안 돼요. 지도를 눌러 골라 주세요.',
  startFrom: (name: string) => `${name}에서 출발해요. 핀을 끌어서 정확한 위치로 옮길 수 있어요.`,
  endLabel: '도착 위치',
  sameAsStart: '출발지와 동일',
  elsewhere: '다른 곳',
  endSame: '마지막 장소에서 출발지로 돌아와요.',
  endPicked: '지도에서 고른 곳에서 하루를 마쳐요. 주소로 검색해도 돼요.',
  endAt: (name: string) => `${name}에서 하루를 마쳐요.`,
  startStatus: {
    default: '지도를 누르거나 핀을 끌어서 출발할 곳을 정해 주세요. 지금은 마닐라 시내 기본 위치예요.',
    locating: '현재 위치를 찾고 있어요. 그동안 지도에서 골라도 돼요.',
    here: '현재 위치에서 출발해요. 다른 곳이면 지도를 눌러 바꿔 주세요.',
    picked: '지도에서 고른 곳에서 출발해요.',
    searched: '',
    denied: '현재 위치를 가져오지 못했어요. 지도를 눌러 출발할 곳을 정해 주세요.',
    abroad: '지금 필리핀 밖에 계신 것 같아요. 지도에서 출발할 곳을 골라 주세요.',
  },
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
  toEnd: '도착지로',
  again: '조건 바꿔서 다시 추천받기',

  // Place
  back: '뒤로',
  placeNotFound: '장소 정보를 찾지 못했어요.',
  loading: '불러오는 중…',
  nextPhoto: '다음 사진',
  noPhoto: '사진 없음',
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
  /** "10:00" → "오전 10:00", "16:30" → "오후 4:30". */
  clock: (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(m).padStart(2, '0')}`
  },
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
  timeZoneNote: 'Dates and times are in Philippine time (PHT, UTC+8).',
  foodsLabel: 'Food you want to try',
  foodPlaceholder: 'e.g. sisig, halo-halo',
  add: 'Add',
  removeFood: (food: string) => `Remove ${food}`,
  mustVisitLabel: 'Places you must see',
  searchSoonTitle: 'Attraction search is coming soon',
  searchAttractions: 'Search attractions',
  soon: 'Soon',
  startLabel: 'Starting point',
  useMyLocation: 'Use my location',
  locating: 'Locating…',
  cancelLocate: 'Cancel',
  addressPlaceholder: 'Search an address or place (e.g. Intramuros)',
  search: 'Search',
  addressNone: 'No matches. Try another name or tap the map.',
  addressFailed: "Address search isn't working right now. Tap the map instead.",
  startFrom: (name: string) => `Starting from ${name}. Drag the pin to fine-tune it.`,
  endLabel: 'Ending point',
  sameAsStart: 'Same as start',
  elsewhere: 'Somewhere else',
  endSame: 'You’ll head back to your start after the last stop.',
  endPicked: 'Ending at the spot you picked on the map. You can also search an address.',
  endAt: (name: string) => `Ending the day at ${name}.`,
  startStatus: {
    default: 'Tap the map or drag the pin to set where you start. For now it’s a default spot in central Manila.',
    locating: 'Finding your location. You can pick on the map meanwhile.',
    here: 'Starting from where you are. Tap the map to change it.',
    picked: 'Starting from the spot you picked on the map.',
    searched: '',
    denied: "We couldn't get your location. Tap the map to set your start.",
    abroad: 'You seem to be outside the Philippines. Pick your start on the map.',
  },
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
  toEnd: 'To your end point',
  again: 'Change preferences and try again',

  back: 'Back',
  placeNotFound: "We couldn't find this place.",
  loading: 'Loading…',
  nextPhoto: 'Next photo',
  noPhoto: 'No image',
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
  clock: (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
  },
  minutes: (m: number) => `${m} min`,
  hoursMinutes: (h: number, m: number) => (m ? `${h} h ${m} min` : `${h} h`),
  category: { restaurant: 'Restaurant', market: 'Market', shop: 'Shop', attraction: 'Attraction' },
  mode: { walk: 'Walk', jeepney: 'Jeepney', tricycle: 'Tricycle', taxi: 'Taxi', other: 'Travel' },
}

const MESSAGES: Record<Lang, Messages> = { ko, en }
