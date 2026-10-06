# Windows에서 준비하고 원격 Mac에서 iOS를 빌드하는 흐름

HBEngine의 iOS 출력은 `HBGame.xcodeproj`, 게임 에셋, 사용자 C++ 원문과 `build-ios.sh`를 포함한다. Windows에서 생성한 프로젝트를 Mac runner로 전달한 뒤 Apple SDK로 컴파일한다. 현재 `mobile-ios.yml`은 서명 없는 기기 SDK 컴파일과 독립 시뮬레이터 설치·실행을 검증한다. IPA 배포와 TestFlight 업로드는 이 검사에 포함되지 않는다.

2026-10-06 [417f384 원격 검사](https://github.com/kirby47navercom-ai/HBEngine/actions/runs/37425093439)는 두 Xcode 대상, 실제 사용자 C++ 두 모듈, 물리 질의, 에셋 범위 읽기, 반복 오디오 신호와 백그라운드 정지·복귀 후 월드/소리 보존을 통과했다. 증거는 `ios-mobile-proof` artifact의 `ios-acceptance.json`, `ios-audio.json`, `ios-audio-resume.json`이다. `audioHeard`, `physicalDeviceVerified`, `signingVerified`는 모두 false다.

## TestFlight 배포 단계

1. Apple Developer Program의 팀, 해당 Bundle ID의 App Store Connect 앱, 유효한 배포 인증서와 프로비저닝 프로필을 준비한다. HBEngine 빌드 프로필의 applicationId와 Apple Bundle ID, 버전·빌드 번호를 맞춘다.
2. 엔진에서 실제 게임의 **release iOS 프로필**을 내보낸다. 출력 폴더 전체를 원격 Mac runner에 전달한다. 현재 CI의 검증용 게임을 Auric Loop의 배포본으로 사용하지 않는다.
3. 인증서 `.p12`, 암호, `.mobileprovision`을 GitHub Secrets로 전달한다. GitHub 공식 절차에 따라 runner의 임시 keychain에 인증서를 가져오고 프로필을 설치한다. 비밀값을 에셋·Git·빌드 보고·공개 artifact에 기록하지 않는다. runner 종료 시 keychain과 프로필을 정리한다.
4. 출력 폴더에서 `sh build-ios.sh DEVELOPMENT_TEAM=<Apple 팀 ID>`로 실제 iOS 기기 대상 archive를 만든다. 수동 서명을 쓰면 해당 팀의 실제 identity와 profile을 Xcode 설정 또는 명령행 인자로 지정한다. 서명 실패 시 성공한 배포본으로 표시하지 않는다.
5. 해당 Xcode 버전의 `xcodebuild -help`에 맞는 ExportOptions.plist로 `xcodebuild -exportArchive -archivePath HBGame.xcarchive -exportPath Export -exportOptionsPlist ExportOptions.plist`를 실행한다. SDK 검사에서 사용한 `CODE_SIGNING_ALLOWED=NO`를 배포 archive/export에 사용하지 않는다.
6. 서명된 산출물의 Bundle ID·버전·entitlements·프로필을 대조하고 App Store Connect에 업로드한다. Apple 처리와 테스트 그룹 설정이 끝난 뒤 TestFlight로 실제 iPhone에 설치하여 입력·오디오·백그라운드·발열을 확인한다. 업로드 및 심사 결과를 별도 기록한다.

Mac을 소유하지 않아도 원격 Mac runner에서 빌드할 수 있다. 현재 없는 것은 Apple 팀의 서명 자료와 실물 기기 검증이며, 서명 없는 시뮬레이터 성공을 휴대폰 설치 성공으로 바꾸지 않는다. 이 문서는 배포 절차를 정리한 것이며 서명된 IPA나 TestFlight 배포의 실행 증거가 아니다.

근거: [GitHub의 macOS runner 인증서 설치](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications), [Apple 배포 단계](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases), [App Store Connect 업로드](https://help.apple.com/xcode/mac/current/en.lproj/dev442d7f2ca.html). 이번에는 인증서 설치·archive·export·TestFlight 절차의 해당 본문을 대조했다. 연결된 전체 API·영상·그림이나 Unity·Unreal 전체 문서 분석의 완료 증거로 계산하지 않는다.
