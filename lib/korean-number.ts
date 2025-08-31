/**
 * Korean number pronunciation utilities
 * Converts numbers to proper Korean pronunciation for voice synthesis
 */

const KOREAN_NUMBERS: { [key: number]: string } = {
  0: '',
  1: '일',
  2: '이',
  3: '삼',
  4: '사',
  5: '오',
  6: '육',
  7: '칠',
  8: '팔',
  9: '구'
}

const KOREAN_UNITS = {
  1: '',
  10: '십',
  100: '백',
  1000: '천'
}

/**
 * Converts a number to Korean pronunciation
 * Examples:
 * - 256 -> "이백 오십 육"
 * - 561 -> "오백 육십 일"  
 * - 123 -> "일백 이십 삼"
 * - 45 -> "사십 오"
 * - 7 -> "칠"
 */
export function numberToKorean(num: number): string {
  if (num === 0) return '영'
  if (num < 0 || num > 999) return num.toString()

  const result: string[] = []
  
  // Handle hundreds
  const hundreds = Math.floor(num / 100)
  if (hundreds > 0) {
    if (hundreds === 1) {
      result.push('일백')
    } else {
      result.push(KOREAN_NUMBERS[hundreds] + '백')
    }
  }
  
  // Handle tens
  const tens = Math.floor((num % 100) / 10)
  if (tens > 0) {
    if (tens === 1) {
      result.push('십')
    } else {
      result.push(KOREAN_NUMBERS[tens] + '십')
    }
  }
  
  // Handle ones
  const ones = num % 10
  if (ones > 0) {
    result.push(KOREAN_NUMBERS[ones])
  }
  
  return result.join(' ')
}

/**
 * Creates a complete Korean announcement text for order calls
 * @param orderType - 'takeout' or 'dine_in'
 * @param number - order number (1-999)
 * @returns formatted Korean text for speech synthesis
 */
export function createKoreanAnnouncement(orderType: 'takeout' | 'dine_in', number: number): string {
  const orderTypeText = orderType === 'takeout' ? '포장' : '매장'
  const koreanNumber = numberToKorean(number)
  return `${orderTypeText} ${koreanNumber}번 고객님`
}