# 새로운 알림 시스템 (Enhanced Notification System)

DID 알림이 제대로 동작하지 않는 문제를 해결하기 위해 새로운 통합 알림 시스템을 구현했습니다.

## 🎯 주요 특징

### 1. 단일 Queue 기반 관리
- 모든 알림을 하나의 queue에서 순차 처리
- 중복 알림 방지 로직
- 알림 상태 추적 (pending → first_call → second_call → completed)

### 2. 정확히 2번 안내
- 각 주문 호출을 정확히 2번씩 음성 안내
- 첫 번째 호출 후 4초 대기
- 두 번째 호출 후 자동 완료

### 3. 실시간 DB 연동
- Supabase Realtime을 통한 즉시 반영
- INSERT/UPDATE/DELETE 이벤트 자동 처리
- 삭제된 호출 자동 큐 제거

## 📁 파일 구조

```
lib/
├── enhanced-notification-queue.ts      # 핵심 Queue 관리자
├── hooks/
│   ├── useNotificationController.ts    # React Controller Hook
│   └── useOrderCallsRealtime.ts       # 기존 Realtime Hook (여전히 사용)
components/
├── ui/
│   ├── SimpleCallNotificationPopup.tsx # 새로운 간소화된 팝업
│   └── CallNotificationPopup.tsx      # 기존 팝업 (비활성화)
└── display/
    └── DisplayScreen.tsx              # 업데이트된 디스플레이 화면
```

## 🔧 사용 방법

### 1. Display 화면에서 사용
```typescript
// DisplayScreen.tsx에서 자동으로 사용됨
const {
  currentNotification,
  isVisible,
  queueStatus,
  isConnected
} = useNotificationController({
  storeId,
  audioEnabled: true,
  debug: true
})
```

### 2. 디버그 페이지에서 테스트
1. `/debug/realtime` 페이지 접속
2. Store ID 입력
3. "새로운 알림 시스템 테스트" 섹션에서 체크박스 활성화
4. 다양한 테스트 버튼으로 알림 시스템 테스트

## 🎮 테스트 기능

### 디버그 페이지 테스트
- **포장 테스트 알림**: 랜덤 번호로 포장 주문 알림 생성
- **매장 테스트 알림**: 랜덤 번호로 매장 주문 알림 생성
- **현재 알림 강제 완료**: 진행 중인 알림 즉시 완료
- **큐 전체 초기화**: 모든 대기 중인 알림 삭제

### 실시간 상태 모니터링
- Queue 처리 상태
- 대기 중인 알림 수
- 현재 알림 정보 (타입, 번호, 상태, 호출 횟수)
- Realtime 연결 상태

## 🔄 알림 흐름

```
1. 새 주문 호출 생성 (DB INSERT)
   ↓
2. Realtime 이벤트 수신
   ↓
3. Queue에 알림 추가
   ↓
4. 첫 번째 호출 실행 (팝업 + 음성)
   ↓ (4초 대기)
5. 두 번째 호출 실행 (팝업 + 음성)
   ↓ (6초 대기)
6. 알림 완료 및 다음 알림 처리
```

## 🎵 음성 안내

### 설정
- 브라우저 SpeechSynthesis API 사용
- 한국어 (ko-KR) 음성
- 볼륨 0.8, 속도 0.9, 음높이 1.0

### 안내 메시지
- **포장**: "포장 {번호}번 고객님, 주문하신 음식이 준비되었습니다."
- **매장**: "매장 {번호}번 고객님, 주문하신 음식이 준비되었습니다."

## 🚫 중복 방지

### 논리
1. 같은 타입(포장/매장)과 번호의 미완료 알림이 있는지 확인
2. 현재 처리 중인 알림과 중복인지 확인
3. 중복이면 새 알림 무시

### 삭제 처리
- soft delete (deleted_at 설정): 큐에서 자동 제거
- hard delete: 큐에서 자동 제거
- 현재 처리 중인 알림이 삭제되면 즉시 완료 처리

## 🐛 디버깅

### 로그 확인
모든 주요 동작에 대해 상세한 콘솔 로그 제공:
```
[EnhancedNotificationQueue] 새 알림 추가: {...}
[NotificationController] 팝업 표시: {...}
[NotificationController] 알림 완료: {...}
```

### 개발 모드 디버그 정보
음성 활성화 화면에서 현재 시스템 상태 표시:
- Queue 상태 및 크기
- 현재 알림 정보
- 연결 상태

## 🔧 설정 옵션

### useNotificationController 옵션
```typescript
{
  storeId: string          // 매장 ID
  audioEnabled?: boolean   // 음성 활성화 (기본: true)
  debug?: boolean         // 디버그 로그 (기본: false)
}
```

### Queue 타이밍 설정
```typescript
// enhanced-notification-queue.ts에서 수정 가능
CALL_DURATION = 3000    // 각 호출 표시 시간 (3초)
CALL_INTERVAL = 4000    // 호출 간격 (4초)  
HIDE_DELAY = 1000       // 숨김 지연 시간 (1초)
```

## 🎨 UI 개선사항

### 새로운 팝업 특징
- 호출 횟수에 따른 다른 메시지
- 동적 펄스 애니메이션 (호출 횟수에 따라 변경)
- 호출 진행 상태 표시 (점 2개로 1/2차 호출 표시)
- 더 부드러운 애니메이션 전환

### 상태 표시
- **첫 번째 호출**: "📢 첫 번째 호출"
- **두 번째 호출**: "🔔 마지막 호출 - 픽업 준비가 완료되었습니다"

## 🚀 배포 후 확인사항

1. **기존 시스템과의 호환성**: 기존 admin 페이지 호출 기능 정상 작동 확인
2. **음성 품질**: 실제 환경에서 음성 안내 품질 확인
3. **성능**: 다수의 동시 호출 처리 성능 확인
4. **안정성**: 장시간 운영 시 메모리 누수 없음 확인

## 📝 향후 개선 계획

1. **사용자 정의 음성**: 녹음된 음성 파일 사용 옵션
2. **알림 우선순위**: VIP 고객 우선 처리
3. **통계 대시보드**: 알림 처리 통계 및 분석
4. **다국어 지원**: 영어, 중국어 등 다국어 음성 안내
