# 1066–1069 위젯 제작·실행·비용 묶음

2026-10-20. 구현을 먼저 모으고 영향받는 검사만 묶었어요. Player/Host 네이티브 소유 코드는 변경하지 않았어요. 설치 지문 대조 후 실행 파일을 재사용해요.

- 부모 위젯·기본값 재정의·초기 표시·상속 슬롯·노출 플래그를 실제 디자이너에 연결했어요. 미리보기 클릭으로 상속 요소 속성을 선택하고 기존 Undo/저장을 사용해요.
- 소유 액터 커스텀 이벤트로 Initialized/PreConstruct/Construct/Destruct를 연결하고 첫 프레임 전 HUD 변경, 비동기 최신 요청, 재진입·해제 시 부활 방지, 동시 생성 예산을 함께 다뤘어요.
- 목록에 복합 위젯·자료 바인딩·항목 문맥 이벤트·공유 요소 예산·재사용 시 입력/폰트/뷰 해제를 연결했어요. 자료형 오류는 저작 기본값으로 복원해요.
- 큰 논리 스크롤을 제한된 물리 영역으로 매핑하고 휠·터치 거리, 키보드, 측정 행·너비 변경 앵커, 입력칸 키를 보존했어요.
- 동일 URL의 글꼴을 공유하고 참조 해제·늦은 로드 부활을 막았어요. AI 스키마/빠른 경로와 이름 변경·배포 콘텐츠 수집도 같은 형식을 써요.

## 확인 근거

- `native/build/widget-batch-1066.json`: 상속/불변성/잘못된 값·경로/순환·예산/행 재사용/참조 이름 변경/생명주기/재진입/논리 좌표/글꼴 참조 검사.
- 숨긴 실제 WebView 1067: 100,000행·409,600,000px에서 끝 409,599,800px, 중간 204,799,900px, 물리 높이 4,000,000px. 보존 풀 6개. 휠·합성 단일 터치의 이동 거리와 Home/End, 선택·ARIA 확인.
- 측정 목록 100,000행: 너비 변경 뒤 논리 총 높이 6,407,062px와 마지막 앵커 유지. 입력칸의 End 키 격리.
- 복합 목록 2,000개: 실제 행 7개/위젯 노드 28개, 글꼴 FontFace 1개, 마지막 버튼의 rowIndex=1999와 자료 일치, 제거 후 자원 해제. Windows 한글 글꼴은 격리 fixture로만 읽고 복사본을 검사 후 제거해요.
- 사람 속성 편집/Undo/AI 계약, 실제 시작 씬의 `inspectBuild` 콘텐츠 의존성 수집. 기존174/181/256의 관련 회귀 검사.

이 수치는 해당 fixture의 풀·좌표·자원 관찰이에요. 전체 게임 FPS·모바일 기기·모든 접근성 검증으로 확대하지 않아요. 설치본의 실제 근거 경로와 해시는 ENGINE_WORK/USER_INSTALL 영수증에 남겨요.

중간 검사에서 발견한 동시 생성 예산 경합과 물리 콘텐츠 바깥 행이 스크롤 높이를 늘리는 문제는 수정했어요. 검사 전용 선택자/글꼴 URL 실패는 구현 성과나 통과 증거로 세지 않아요.

## 읽고 대조한 출처

- [UE PreConstruct](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/UMG/UUserWidget/PreConstruct): 게임/디자이너 구분, 지역 표시 데이터와 게임 월드 접근 제한.
- [UE OnInitialized](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/UMG/UUserWidget/OnInitialized): 게임 인스턴스 한 번의 초기화와 Construct/Destruct 구분.
- [UE Named Slot](https://dev.epicgames.com/documentation/unreal-engine/using-named-slot-widgets-for-ui-templates-in-unreal-engine): 한 자식, 상속 디자이너, 인스턴스 전용 노출과 기존 내용 보존.
- [Unity UXML 재사용](https://docs.unity.com/en-us/engine/6000.3/manual/uitoolkits/uielements/uie-structure-ui/uie-uxml/uie-reuse-uxml-files): 템플릿·인스턴스와 바깥 재정의 우선순위. HB는 기존 JSON 형식을 유지해요.
- [Unity ListView](https://docs.unity.com/en-us/engine/6000.3/script-reference/unityengine/uielements/listview): 가시 행 생성/바인딩/해제/파괴의 책임 구분.
- [Unity 복합 목록](https://docs.unity3d.com/6000.0/Documentation/Manual/UIE-create-list-view-complex.html): 행의 조절기와 현재 항목 자료를 연결하는 선택 구역.

위 페이지의 지정 본문·설명/예제 구역을 읽고 HB 소유 코드·독립 결과와 대조했어요. 링크된 모든 API·영상·Unreal/Unity 전체 본문 분석을 완료했다는 기록이 아니에요. 다른 위젯 클래스의 네이티브 객체 생성, 디자이너 BP/C++ 실행 샌드박스, 조명/깊이 차폐 3D UI, 행의 양방향 원본 편집·다중 선택·재정렬 및 실기기 검증은 승격하지 않아요.
