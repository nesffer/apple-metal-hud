# Apple Metal HUD

Apple 디바이스에서 Metal HUD를 활성화하여 앱을 실행하는 CLI 도구입니다. GPU 성능 모니터링을 위해 Metal 프레임워크의 HUD(Heads-Up Display)를 활성화하여 실시간으로 GPU 사용률, 프레임률, 메모리 사용량 등을 확인할 수 있습니다.

## 설치

```bash
# npx를 사용하여 바로 실행 (권장)
npx @nesffer/apple-metal-hud

# 또는 전역 설치
npm install -g @nesffer/apple-metal-hud
apple-metal-hud
```

## 사용법

### 기본 사용법

```bash
npx @nesffer/apple-metal-hud
```

### 옵션

```bash
# 앱을 실행하지 않고 명령어만 표시
npx @nesffer/apple-metal-hud --no-launch

# 연결된 디바이스 목록만 표시
npx @nesffer/apple-metal-hud --list

# 도움말 표시
npx @nesffer/apple-metal-hud --help
```

## 실행 과정

1. **디바이스 탐지**: 연결된 Apple 디바이스를 자동으로 탐지합니다
2. **디바이스 선택**: 사용 가능한 디바이스 목록에서 선택합니다
3. **앱 목록 표시**: 선택한 디바이스에서 실행 중인 앱들을 표시합니다
4. **앱 선택**: Metal HUD를 적용할 앱을 선택합니다
5. **Metal HUD 실행**: 선택한 앱을 Metal HUD가 활성화된 상태로 실행합니다

## 지원 플랫폼

- iOS
- iPadOS
- watchOS
- tvOS
- macOS

## 요구사항

- macOS (Xcode Command Line Tools 필요)
- Node.js 16.0.0 이상
- 연결된 Apple 디바이스
- 디바이스에서 개발자 모드 활성화

## 설치 전 준비사항

### 1. Xcode Command Line Tools 설치

```bash
xcode-select --install
```

### 2. 디바이스 개발자 모드 활성화

- iOS/iPadOS: 설정 > 개인정보 보호 및 보안 > 개발자 모드
- macOS: 시스템 환경설정 > 개인정보 보호 및 보안 > 개발자 도구

## 예시 출력

```
🔍 디바이스 목록을 가져오는 중...

📱 사용 가능한 디바이스 목록:

1. iPhone 15 Pro
   🆔 Identifier: 9ABF9F72-7AAF-5C9E-BDD3-0A781FD70C58
   🖥️  Platform: iOS

2. iPad Pro
   🆔 Identifier: AB8A73D5-2572-5E8A-A900-3BF456112EEA
   🖥️  Platform: iPadOS

디바이스를 선택하세요 (1-2): 1

📱 실행 중인 애플리케이션 목록:

1. MyGame.app
   📦 Bundle ID: com.example.mygame
   🆔 PID: 12345

애플리케이션을 선택하세요 (1): 1

🚀 Metal HUD를 활성화하여 애플리케이션을 실행합니다...
✅ 애플리케이션이 성공적으로 실행되었습니다!
📊 Metal HUD가 활성화되어 GPU 성능 정보를 확인할 수 있습니다.
```

## Metal HUD 정보

Metal HUD가 활성화되면 화면에 다음 정보가 오버레이로 표시됩니다:

- **GPU 사용률**: 현재 GPU 사용량 백분율
- **프레임률 (FPS)**: 초당 프레임 수
- **프레임 시간**: 각 프레임 렌더링에 소요된 시간
- **메모리 사용량**: GPU 메모리 사용량
- **Draw Call 수**: 렌더링 호출 횟수

## 문제 해결

### "command not found" 오류

```bash
xcode-select --install
```

### "permission denied" 오류

디바이스에서 개발자 모드가 활성화되어 있는지 확인하세요.

### "No matching processes" 메시지

선택하려는 앱이 디바이스에서 실행 중인지 확인하세요.

## 라이선스

MIT

## 기여

버그 리포트나 기능 요청은 [GitHub Issues](https://github.com/nesffer/apple-metal-hud/issues)에 올려주세요.

## 관련 링크

- [Apple Developer Documentation - Metal Performance HUD](https://developer.apple.com/documentation/metal)
- [Xcode Command Line Tools](https://developer.apple.com/xcode/)
