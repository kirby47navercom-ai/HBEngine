# HBEngine 현재 인계 (2026-10-25)

최신 사용자: 계속 구현·여러 분야 묶어 마지막 영향검사. 설치 업데이트 보류(native/build/UPDATE_HOLD.json active), 예약 재생성금지(hbengine삭제2160). 사용자 창/탭/프로필/게임/Versions 변경금지·새에이전트금지. Mac/Xcode/Android폰없음. 한글 동일 kirby47navercom-ai author/committer·AI trailer없이commit/push.
보호: prototype/player.js, tools/check-player-keyboard-release.mjs 읽기/편집/실행/stage금지. docs/NODE_CATALOG.md 기존dirty 미stage. core-api ignored generatedCore()만·카탈로그CLI금지. hb context --compact 등록keyword/실제symbol·focused-routes 확인; broad/--all금지. 새원장은 기록Map합성+명시own whitelist만새해시. updatedAt은YYYY-MM-DD·validate/read필수.

core cb0fd90a0f938e7ba34368054cc4437e5f57f284; canonical WORK2920/ENGINE_STATUS. 78행37verified/37partial/1unimplemented/3unverified·전체율null. 기록hash2720압축기준→...2890→2920; 60전Map재압축. 설치완료아님.

신규2920(2891–2920):
- ANM: TwoBone opt-in groundProjection Bool/pose-or-target/2D3D/world ray/법선offset/경사·최소swing·기존가중치/길이/관절. nohit/비활성 입력통과·현재plant문맥해제·budgetskip0질의. 기존준비Rapier와SetBool 공용. 독립player는groundQuery주입·dispose해제. 양의균일프레임 회전제약·unreachable잔여오차정직표시. editor접힘typed폼/legacydefaults/Boolrename/Undo·AI schema. ANIMATION_GROUND_PROJECTION.md.
- Preview: selected/target/hint/source/plantAnchor/FBIK effector만시각복사. 지면은차원/mask/trigger/mode필터·collider/tileColliders/부모TRS만복사·시각/native/audio미복제. absent components원본불변·parentId우선·선택모델parentattach. 합성JSON100630→351B; 전체RAM/GPU/FPS측정아님.
- PHY: query-only sensor와authored trigger구분·7종질의/live/immutable native adapter일치. 진짜trigger는includeTriggers필수.
- 제작: Cloth격자·2D/3D로프 질량브러시 radius/strength/target/falloff. swept segment·한획시작값/최대영향·기본1희소삭제. 한획Undo/기존scene/BP검증·상속기본값·원본저장→공용queued JSON→실제입자질량. Escape/cancel/capture/blur/hidden·changed/detached/disabled owner거절·keyboard·focus/settings복원. SVG상수path수·타이머/worker/런타임paintpass0. CLOTH_MASS_BRUSH.md. 거리tether/이동반경·부분핀별도.

최종 group2908.json: 신규46=ground16+preview11+brush13+query6, 관련19=massUI5+distribution14. 같은실행 earlier foot14 재사용(6N3lUd). syntax22. 최종 preview JKWqmI, brush IBszul, ground IY5toE, query xlUBOg; 보고서/fixture보존. GUI/GPU/device/install0.
실제C++ ground-ik-cpp-cVylnL:2메서드4호출4읽기4쓰기·2D3D VM/물리/골격포즈. 동일PlantProbe/SDK cachehit b283e77e7ab52dcb8fee. binary SHA b07d1aded7e0411a3b19689b3b2ba15ccef4bbcbce5db51cb3b90cf874faa930; SDK6ae42160cdb0e8cdce5bcea410ec666c86453519087ed1901192da45f46811da; used0a684c26d26b98e7e13c07850428a36d1d67f89230356a4d210508711620d050. 현재binary해시재확인·UI후재build0. 첫부모회전불가/extent대신size fixture실패는성과제외(DEBUG_HANDOFF).

직전:2890 context opt-incompact 신규6+legacy1058·응답9325→4870B(-47.8%)·I/O/모델시간아님. 2880 BT owner services stable목록/관계diff/충돌/CAS/Undo/save→실제주기. 2870 disk mip source공유·마지막leaseCPU0. 2860 array/cube/volume authoredRGBA8 디스크꼬리·binding/물리한도·BT/FSM관계선택. 각receipt/전용doc근거·끝난검사재반복금지.
다음 실제잔여: 접촉phase/stride/골반·고급리그, 거리tether/이동반경/부분핀·일반관절반력/소성, HDR/압축/cook·서비스flow/임의계층·mobileeditor 등 canonical remaining. GL1728 ANGLE6878.6/FXC6836.439ms미해결·실패실험반복금지. USER_INSTALL2145 Versions/73341067df5a12be는역사. 새설치copy/예약0. 무거운검사전activeInstalledVersions·nativeCacheOnly만32cache·소유regularhelper만삭제. fixture/report/recipe/SDK/사용자데이터보존. 새goal/재개질문으로중단하지않음.
