# HBEngine 현재 인계 (2026-10-25)

최신 사용자: 멈춤=전체완료가 아님을 분명히 하고 계속 구현. 예약 재생성 금지(hbengine 삭제2160), native/build/UPDATE_HOLD.json active 보류. 창/탭/프로필/게임 원본/Versions 변경 금지. 새 에이전트 금지. Mac/Xcode/Android폰 없음. 여러 변경 후 영향 검사 묶음·실패 도구만 재실행. 불변 SDK/렌더러 반복금지. 한글 동일 kirby47navercom-ai author/committer·AI trailer 없이 commit/push.
보호: prototype/player.js, tools/check-player-keyboard-release.mjs 읽기/편집/실행/stage 금지. docs/NODE_CATALOG.md 기존dirty 미stage. core-api ignored; generatedCore()만 사용·CLI카탈로그생성 금지. hb context 등록keyword/실제symbol·focused-routes 확인, broad/--all 금지. 2490/2710 fallback 보호player 도구읽기 경계위반은 WORK2520/2720 기록(편집/실행/stage0); 자동fallback 차단 완료. 새 원장은 기록된 해시 Map만 합성·보호 파일 새해시 금지.

core 41dcd47ca9c99288b24c0464202c4f06c6b7d2ba; WORK2790/ENGINE_STATUS.78행37verified/37partial/1unimplemented/3unverified·전체율null. 해시2720압축 기준·60전기록Map재압축. 전체/설치완료 아님.

새 구현:
- 그래프: stable-ID 기준/현재/다른버전 SVG 노드/명시edge diff, root nodes/중첩graph·legacy material edge 변환. 충돌필드만 선택·재선택/키보드·삭제·페이지·기존 CAS/Undo 적용; document.graph.diff 요약/선택revision검사. 신규15/기존문서15. docs/ASSET_GRAPH_DIFF. 암시입력/서브그래프·Git marker저장 별도.
- 천/2D·3D로프: edge 항복/creep/max/인장·압축 실제 solver 소성·hot 물성/세대·pin·부착 보존. live 복원·BP/C++ ResetCloth/RopePlasticity·edges 페이지. 신규10/기존hot7, 실제 현재SDK C++2명령 solver재생. docs/DEFORMABLE_PLASTICITY. joint소성/tether/paint/절단별도.
- 스트리밍: opt-in geometry CPU backing allocation 측정·공유buffer 중복제외·작성cost 하한·해제뒤 숫자만 관찰/재로드억제. 기본authored는 측정맵/순회 없음. runtime.streaming 페이지·명시refresh/컴포넌트관찰정리. 신규11 실제Three/RuntimeLevels. docs/STREAMING_GEOMETRY_BUDGET. 전체RAM/VRAM·동적교체자동추적/HLOD별도.

검사: group2775·group2785와 WORK2790 checks의 정확 경로 사용. source총신규36+기존22·실제CPP2. 첫 graph legacyedge 형식불일치 수정; rope 두고정입자 무부하 fixture는 자유입자 포함3개로 고침. 실패는 성과미포함. 새GUI/GPU/device/install0.
현재CPP cache a97dfbfe38a51c561cc4 binary SHA3f31f9c05d9ae948a602b64c14997c8dd114418aecf8ec51e0f7281806a78298, SDK fp6ae42160cdb0e8cdce5bcea410ec666c86453519087ed1901192da45f46811da; used2711479cd6c2027fc9dd3fd5804acc09d0712d849f8cc27e39cb6d443b9e670d. 이전2734 SDK는 역사기록. 정확 SDK/binary 불일치시 재사용금지.

이전 근거(재검사 금지):2594 Cue/stream저널;2608균일retime;2619관절색인;2632능력tick;2656소켓/부착Cuev3;2670소켓공용7조회;2690파일/sidecar rename 공동CAS/recovery;2702foliage국소작업;2720바인딩준비·context failclosed;2734휠관성/차동/ABS3조회;2744ongoing 태그증분/호출내서명;2754 2D기준체인자동대응/posebake;2762 JSONcook v3 target/SHA 중복제거·임시소유정리·동시winner검증. 각 ENGINE_WORK/전용문서 범위 유지.

다음: canonical remaining 실제 제작·실행 기능. GL1728 ANGLE6878.6/FXC6836.439ms 미해결·실패실험반복금지. 일반DCC/리그/접촉·반력/joint소성·렌더링·GPU이벤트/전체메모리·모바일에디터 등 잔여. 사용자 설치 역사 USER_INSTALL2145 Versions/73341067df5a12be, 새복사/예약0. 무거운검사전 activeInstalledVersions. CPPcache32·nativeCacheOnly는소스열거없음; storage2789 deleted0. 소유regular helpers만정리·fixture/recipe/report/SDK/사용자데이터 보존. 새목표/재개질문으로 중단하지 않음.
