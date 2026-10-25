# HBEngine 현재 인계 (2026-10-25)

최신 사용자: 멈추지말고 여러분야 실제구현·검사는마지막한묶음. 설치업데이트보류(native/build/UPDATE_HOLD.json active), 예약재생성금지(hbengine삭제2160). 사용자창/탭/프로필/게임/Versions 변경금지·새에이전트금지. Mac/Xcode/Android폰없음. 한글 동일 kirby47navercom-ai author/committer·AI trailer없이commit/push.
보호: prototype/player.js, tools/check-player-keyboard-release.mjs 읽기/편집/실행/stage금지. docs/NODE_CATALOG.md 기존dirty 미stage. core-api ignored generatedCore()만·카탈로그CLI금지. hb context --compact 등록keyword/실제symbol·focused-routes; broad/--all금지. 원장은 기록Map합성+명시own whitelist만새해시. updatedAt YYYY-MM-DD·validate/read필수.

canonical WORK3000/ENGINE_STATUS·implementationRevision참조. 78행37verified/37partial/1unimplemented/3unverified·전체율null. 소스hash계보2720→...2960→2980·60전Map재압축. 설치완료아님.

신규2983–3000: 단축키 v1 Mouse1..5/Primary/Shift/Alt·뷰포트가능명령만·기존충돌/override/reset/프로필/원자저장. 실제record UI 포인터/키보드/Escape·대화상자/게임/현재drag/터치/pen보존·sidebutton을기존camera전단에연결. 클릭viewport활성/소유문서dialog·기본profile/wheel추가조회0. tools/check-pointer-shortcuts-2987 신규11, 기존shortcut199명령 gate+viewport185검사/Material격리gate통과. 실제브라우저back/forward/분리창/DPI/픽셀미검증. 초기hookfixture누락콜백만수정·실제앱변경0. docs/VIEWPORT_POINTER_SHORTCUTS.md. 연속gesture축/뷰포트외포인터재지정별도.

직전2961–2980:
- TwoBone opt-in strideWarp: Float배율/clamp·pose/target·평면/진행축·위쪽높이/옆걸음·기존positionWeight한번·길이/관절/Alpha. ground pose광선warped foot·plant우선/해제→stride. typed접힘폼/Float rename/legacydefaults/Undo/schema/실제VM nativeFloat재생. tools/check-stride-warp-2964 신규14.
- Cloth격자/3Drope/Rope2D motionLimits/distanceTethers/pinWeights/distanceIterations. Rapier후 희소위치투영·질량역수보정/분리속도제거·이동기준점·hardpin/실강체attachment우선. 부분핀은60Hz기준 blend=1-(1-weight)^(dt*60), 한step한번·기준속도추종. Hot편집 세대/속도/고정/attachment/plasticrest보존·topology범위제거. 기존C++ Components::SetText/BP JSON 경로. backend접촉/반력연립아님·residual명시.
- 기존질량브러시 한획/Undo/cancel/키보드/owner충돌 흐름 재사용한 부분핀 painter·0해제/1고정·최대4색SVGpath·추가listener/timer0. scene/BP 같은handler.
최종 final2976.json: weighted16+distance13+editor4, 기존massbrush13/UI5/hot7/distribution14/cloth8. 애니메이션 소스무변경으로 group2967 stride14/ground16/foot14 재사용. 신규47+관련77. 초기distance nativefixture인자value→기존json수정(검증약화0); 실패성과제외. 신규SDKcompile/GUI/GPU/device/install0. docs/ANIMATION_STRIDE_WARP.md·DEFORMABLE_DISTANCE_LIMITS.md.

직전2960 source7f1b9497: 다중ParticleSystem ID별CPU/GPU JS소유/정렬/ribbon/lifetime·Cuev4 선택emit·EQS atomicbatch 한actor sync. 신규26+관련39+2Dgate. 실제CPP engine-batch-cpp-aW5pB4 현재SDK5ec98440ee5a1dd798879aaa5a2fbfac6a19bf3e837bee30b7df59c1a03c138d·cache30ffbdd2cbacdef5bf10·binarySHA8c175acf2faab9a1c096dd63bcaa77a8de396ed594ab333a630629f7f1f33024. CPP5메서드5호출10live+2queue. 이단계SDK무변경, 새기능은common nativeoperation재생증거만·freshCPP라고세지않음.

다음 실제잔여: 자동접촉phase/골반·고급Pole/리그, 자동geodesic tether·projection/contact/rigid반력연립, 임의관절반력/소성·고급self-contact, HDR/압축/cook·서비스flow/임의계층·mobileeditor 등 canonical remaining. 일반EQS 가변월드O(N), 실제GPU픽셀/입자별리본별도. GL1728 ANGLE6878.6/FXC6836.439ms미해결·실패실험반복금지. USER_INSTALL2145 Versions/73341067df5a12be는역사. 무거운검사전activeInstalledVersions·nativeCacheOnly만32cache·소유regularhelper만삭제. fixtures/reports/SDK/user보존. 새goal/재개질문/일정으로중단하지않음.
