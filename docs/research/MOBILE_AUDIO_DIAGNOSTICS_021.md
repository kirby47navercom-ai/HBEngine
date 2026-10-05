# Apple 오디오 진단 근거 — 2026-10-06

[Loading media data asynchronously](https://developer.apple.com/documentation/avfoundation/loading-media-data-asynchronously)의 공식 Markdown 자체 본문을 읽었어요. Discussion, 비동기 속성 읽기, 속성 상태, 컬렉션 필터링 구역의 설명·주의·선언 예제·코드 예제를 확인했어요. 원문 `native/build/apple-loading-media-data.md`, SHA256 `dfa91be7dd33390077e5aacdf9331106928af52f2d9cacd4b211ec9aad659ef8`에 보존돼 있어요. 연결 타입·개별 API·다른 버전의 전체 본문을 읽었다는 뜻은 아니에요.

문서는 에셋 생성과 실제 속성 로딩을 구분하고, 비동기 `load`가 타입에 맞는 결과를 반환하거나 오류를 던진다고 설명해요. 여러 속성의 동시 로딩, 미로딩·진행·성공·실패 상태 확인과 오디오 트랙의 형식 조회를 보여줘요. HB의 Mac 진단은 공개 AVURLAsset에 실제 앱 서버 WAV URL을 주고 `.duration`만 비동기로 읽어요. 파일 분석은 성공했는데 WKWebView 길이가 틀린 상황에서 HTTP를 통한 Apple 디코더와 웹 재생 경로를 대조하기 위한 검사예요. 앱의 오디오 구현을 이 진단으로 교체하거나 Mac 결과를 iOS 기기 재생 성공으로 계산하지 않아요.

연결된 AVAsset·AVAssetTrack·AVMetadataItem·AVAsyncProperty·AVAsynchronousKeyValueLoading과 개별 load/status/트랙·메타데이터 항목은 같은 Apple 출처에 미독 발견 대상으로 등록해요. 등록에는 원문 Markdown의 실제 링크와 고정 hash를 사용하며 전체 API/overload 분모를 닫거나 원장 상태를 승격하지 않아요.

현재 실행 사실: iOS37330057221의 Xcode 앱 WAV hash와 서버 전체·부분 바이트는 원본과 일치하고 `afinfo`도2초로 읽었어요. WKWebView는 약6마이크로초/time0/믹서 신호 거의0이라 실패했어요. 37332059720은 진단 코드의 C++ 메서드 호출 문법 오류로 컴파일에서 멈췄고, 수정한0b81d0e의37332792293은 두 Xcode 컴파일·게임을 통과한 뒤 Swift HTTP 진단60초 제한으로 중단됐어요. 최초 보고의 실제 WK 요청은 GET bytes=0-1과bytes=0-176443이며 길이는약1.9마이크로초/time0였어요. Swift 컴파일 시작 지연인지 AVURLAsset 로딩 지연인지는 아직 구분하지 못했어요.

후속 검사는 Swift 진단의 시작 문구·출력을 즉시 보존하고 시간 초과도 진단 결과로 기록해요. 실제 오디오 검사는 그대로 이어가며 재생 시간과 믹서 신호의 통과 조건을 유지해요. 실패 시 가장 마지막 실행 보고를 복사하고, WK가 사용한 전체 범위 응답의 Content-Range와 바이트도 대조해요. 시뮬레이터·실물 기기·청취·배포 서명을 구분하며 설치본 업데이트는 실제 검증 뒤 진행해요.

37335923351은 CI success였지만 오디오 정상 완료로 인정하지 않아요. 첫 통과 표본도duration/time약1.9마이크로초였고 복귀 보고의 출력은거의0이었어요. 아주 작은time>0와 한 번의 RMS만으로2초 WAV의 정상 재생을 판단한 검사가 부족했어요. Swift 시작 문구도 없어 해당 디코더 실행은 미확인이에요. 잘못된 실제 표본을 거부하는 길이·여러 보고의 시간 진행/신호·복귀 뒤 재검사를 추가해요. 격리된 검사 앱의 개발 소스에만 HTTP바이트 decodeAudioData·BufferSource·기본Audio·MediaElementSource 대조를 삽입하며 원본/삽입소스 hash를 기록해요. 제품 오디오 구현과 사용자 설치본은 아직 변경하지 않아요.

37338308632의 대조는phase done, HTTP176444bytes→decodeAudioData의2초/48000Hz/96000샘플을 확인했어요. BufferSource의12표본 RMS는약0.0344–0.0346으로 지속됐어요. 기본Audio와MediaElementSource 모두 최초 구간의duration2와 시간 진행은 정상이지만 첫 반복 이후duration/time이마이크로초로 바뀌었어요. 믹서 라우팅만의 문제나 파일 자체의 손상으로 확정하지 않아요. Swift 컴파일은60초 제한으로 진단 실행 전 실패했으며, HTTP초기 디코딩을 실제 WK에서 확인했으므로 이 별도 중복 진단은 제거해요. 다음은 자동 반복과ended에서 재생 재개·DOM에 부착한Audio·같은 바이트 Blob 주소를 같은 창에서 대조해요. 아직 제품 재생 방식을 바꾸지 않았어요.

37340898874/c8dc488의 실제 대조도phase done이에요. plain·routed·DOM 부착·Blob·ended 수동 재개 모두 최초2초 뒤 마이크로초 길이 손상이 있었어요. 수동 재개는 나중에2초로 회복된 표본도 있어 일시 회복을 정상으로 인정하지 않아요. BufferSource는12표본 RMS약0.0344–0.0347을 유지했어요. iOS 공용 플레이어에 같은 PCM을 공유하는 BufferSource 재생을 적용하고, 탐색·속도·일시정지·종료·늦은 디코딩 정리와32MiB 캐시 예산 검사를 통과했어요. 두 표본만으로 첫 반복 전 통과하지 않도록 최소4초의 세 신호 표본과 중간 길이 보존 검사를 강화해요. 연결된 부분 표준 계약은 [023](WEB_MEDIA_CONTRACTS_023.md)에 있어요.

[37343333585/8e2cbd5](https://github.com/kirby47navercom-ai/HBEngine/actions/runs/37343333585)는 실제 Xcode 기기·시뮬레이터 컴파일과 독립 iPhone SE 3/iOS18.5 실행을 통과했어요. 최초 세 보고의 AudioContext 시계31.648→44.552초/480→720프레임 동안 duration2가 유지되고 믹서 master RMS0.00013188–0.00013498을 확인했어요. 배경 전환 시 context suspended/프레임 고정, 복귀 네 보고의142.048→156.117초/2760→3120프레임 동안 duration2/재생 시간/신호를 다시 확인했어요. Count1/10·배치 위치·Rapier 동기 질의·전체/부분/동시 에셋 검사가 함께 통과했고 화면의 한글 HUD·SVG·조이스틱·공격 버튼을 직접 확인했어요. 원본 증거는 native/build/ios-artifacts-37343333585, 업로드 ZIP SHA256 a3dc2a8021227c4ff64867e99f48d2b776d77559312ef66ea88335a6be6b0b9d예요. 실물 기기·스피커 청취·배포 서명은 미검증이며 설치본은 미갱신이에요.
