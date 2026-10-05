# Apple 오디오 진단 근거 — 2026-10-06

[Loading media data asynchronously](https://developer.apple.com/documentation/avfoundation/loading-media-data-asynchronously)의 공식 Markdown 자체 본문을 읽었어요. Discussion, 비동기 속성 읽기, 속성 상태, 컬렉션 필터링 구역의 설명·주의·선언 예제·코드 예제를 확인했어요. 원문 `native/build/apple-loading-media-data.md`, SHA256 `dfa91be7dd33390077e5aacdf9331106928af52f2d9cacd4b211ec9aad659ef8`에 보존돼 있어요. 연결 타입·개별 API·다른 버전의 전체 본문을 읽었다는 뜻은 아니에요.

문서는 에셋 생성과 실제 속성 로딩을 구분하고, 비동기 `load`가 타입에 맞는 결과를 반환하거나 오류를 던진다고 설명해요. 여러 속성의 동시 로딩, 미로딩·진행·성공·실패 상태 확인과 오디오 트랙의 형식 조회를 보여줘요. HB의 Mac 진단은 공개 AVURLAsset에 실제 앱 서버 WAV URL을 주고 `.duration`만 비동기로 읽어요. 파일 분석은 성공했는데 WKWebView 길이가 틀린 상황에서 HTTP를 통한 Apple 디코더와 웹 재생 경로를 대조하기 위한 검사예요. 앱의 오디오 구현을 이 진단으로 교체하거나 Mac 결과를 iOS 기기 재생 성공으로 계산하지 않아요.

연결된 AVAsset·AVAssetTrack·AVMetadataItem·AVAsyncProperty·AVAsynchronousKeyValueLoading과 개별 load/status/트랙·메타데이터 항목은 같은 Apple 출처에 미독 발견 대상으로 등록해요. 등록에는 원문 Markdown의 실제 링크와 고정 hash를 사용하며 전체 API/overload 분모를 닫거나 원장 상태를 승격하지 않아요.

현재 실행 사실: iOS37330057221의 Xcode 앱 WAV hash와 서버 전체·부분 바이트는 원본과 일치하고 `afinfo`도2초로 읽었어요. WKWebView는 약6마이크로초/time0/믹서 신호 거의0이라 실패했어요. 37332059720은 진단 코드의 C++ 메서드 호출 문법 오류로 컴파일에서 멈췄고, 수정한0b81d0e의37332792293은 두 Xcode 컴파일·게임을 통과한 뒤 Swift HTTP 진단60초 제한으로 중단됐어요. 최초 보고의 실제 WK 요청은 GET bytes=0-1과bytes=0-176443이며 길이는약1.9마이크로초/time0였어요. Swift 컴파일 시작 지연인지 AVURLAsset 로딩 지연인지는 아직 구분하지 못했어요.

후속 검사는 Swift 진단의 시작 문구·출력을 즉시 보존하고 시간 초과도 진단 결과로 기록해요. 실제 오디오 검사는 그대로 이어가며 재생 시간과 믹서 신호의 통과 조건을 유지해요. 실패 시 가장 마지막 실행 보고를 복사하고, WK가 사용한 전체 범위 응답의 Content-Range와 바이트도 대조해요. 시뮬레이터·실물 기기·청취·배포 서명을 구분하며 설치본 업데이트는 실제 검증 뒤 진행해요.

37335923351은 CI success였지만 오디오 정상 완료로 인정하지 않아요. 첫 통과 표본도duration/time약1.9마이크로초였고 복귀 보고의 출력은거의0이었어요. 아주 작은time>0와 한 번의 RMS만으로2초 WAV의 정상 재생을 판단한 검사가 부족했어요. Swift 시작 문구도 없어 해당 디코더 실행은 미확인이에요. 잘못된 실제 표본을 거부하는 길이·여러 보고의 시간 진행/신호·복귀 뒤 재검사를 추가해요. 격리된 검사 앱의 개발 소스에만 HTTP바이트 decodeAudioData·BufferSource·기본Audio·MediaElementSource 대조를 삽입하며 원본/삽입소스 hash를 기록해요. 제품 오디오 구현과 사용자 설치본은 아직 변경하지 않아요.

37338308632의 대조는phase done, HTTP176444bytes→decodeAudioData의2초/48000Hz/96000샘플을 확인했어요. BufferSource의12표본 RMS는약0.0344–0.0346으로 지속됐어요. 기본Audio와MediaElementSource 모두 최초 구간의duration2와 시간 진행은 정상이지만 첫 반복 이후duration/time이마이크로초로 바뀌었어요. 믹서 라우팅만의 문제나 파일 자체의 손상으로 확정하지 않아요. Swift 컴파일은60초 제한으로 진단 실행 전 실패했으며, HTTP초기 디코딩을 실제 WK에서 확인했으므로 이 별도 중복 진단은 제거해요. 다음은 자동 반복과ended에서 재생 재개·DOM에 부착한Audio·같은 바이트 Blob 주소를 같은 창에서 대조해요. 아직 제품 재생 방식을 바꾸지 않았어요.
