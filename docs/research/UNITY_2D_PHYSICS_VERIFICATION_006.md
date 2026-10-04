# Unity 2D 물리 본문 분석 006 독립 대조

주인님, 짚짱의 `/root/unreal_actor_body` 담당은 분석 담당 `root`와 별도로 2026-10-04에 [분석 문서](UNITY_2D_PHYSICS_BODY_006.md), [기계 기록](unity-2d-physics-body-006.json), 실제 공식 Unity 6000.0 영어 offline 원문과 private 추출을 모두 읽고 대조했어요. **12본문·38heading·11표시 syntax·6표(헤더 포함16행/32셀)·전체 예제3개·enum 멤버5행**을 확인했어요. 표시 내용과 분석은 일치하며, 관련 API·호환·thread·수명·실패 계약은 열려 있어요. **제한된 독립 대조, 전체 원장 promotion0, 전체 verified 단정 없음**이에요.

## 고정한 대상과 실제 scope

- 분석 MD SHA-256: `992c6b5fa9cd3bd1cfaef044289bea601c1a5e36554cdcb0669f93fc0bb6c8f5`
- 분석 JSON SHA-256: `272958e34162476a740faf4ca3f919d9e80759835192901117cf89a92441a674`
- private `native/build/reference-corpus/unity-2d-physics-batch/extraction.json` SHA-256: `88adef96463928b6a8a3e8f15d094d65663327dfcd378e24e230a3d0ddf62b70`

원문은 `native/build/reference-cache/unity-discovery/offline-6000.0/Documentation/en/ScriptReference/{파일명}`, 추출은 `native/build/reference-corpus/unity-2d-physics-batch/{파일명}.body.html`이에요. 아래 파일명은 `.html`까지 포함해요. sourceHash/bodyHash는 실제 file bytes의 SHA-256을 다시 계산했어요. 12개 모두 원본의 첫 `<h1`부터 `<div id="_content">` 직전까지의 **exact bytes**가 저장 body와 같았어요. 따라서 root 기록의 CRLF 포함 원문 bytes를 정규화해 덮어쓰지 않았어요.

실제 읽은 것은 각 technical 본문의 전체 설명·조건·주의·추가 링크 이름·선언·표 셀·전체 코드예제예요. 의미 비교에서 publisher `.suggest`/`.scrollToFeedback` UI만 제외했고, 제외 전 body bytes도 그대로 검사했어요. 원본과 body에서 heading 순서·syntax·표·예제를 독립 추출해 private extraction과 public locator/hash를 각각 비교했어요. 각 원문의 canonical·Unity 6.0(6000.0) header·job76410965/2026-09-29 footer도 확인했어요. technical image는 0개예요. 링크 대상이나 전체 owner API를 읽었다는 의미는 아니에요. ZIP 전체 CRC/취득 진위를 이번 감사에서 다시 조사한 것도 아니에요.

| 파일명 / 실제 sourceHash | 실제 bodyHash | 비교한 heading/syntax 수 |
| --- | --- | --- |
| Rigidbody2D-bodyType.html / `ccc3c5beb1b28f9a6880fd478d54ada5717f50003429aedcfd2687b3895bafb5` | `b0b4438edf884b52f5f71e1219235370949a100ea7c33267b90f47ba38bc8a0a` | 2 / 1 |
| Rigidbody2D.MovePosition.html / `049dd183222b7bcdfe939e0e4a3c495183279f69919caddf40d40c0858da30f0` | `5fca2b3c577f5f9a67fc518df6f9fa61d264fb243a7a720eb4ae82ea3ef1654d` | 4 / 1 |
| Rigidbody2D.AddForce.html / `a21c54f67210d6878c3d3f770824b36b79cc8055a7f42c3d8c80224a355ce783` | `d18b0d4f16bbfbe818666ded2987e2470dc930b69614c36f9df9f1ea1222e667` | 4 / 1 |
| Rigidbody2D-simulated.html / `23f731b1e948e5e89cc37463018368da3427b17acfbc7b5828525544f34d75b1` | `b18e1c390b2ee13a8337bde625597c5f3e5e6fdbaa0e76e54e9a0324e1efbf26` | 2 / 1 |
| Rigidbody2D-useFullKinematicContacts.html / `a7415bf2122cdcd3ff54dfcfc1be5476d4867923e0fbf143dd0a1e15ff03a6f8` | `12ceeaec8fde56892eb94c49553f7d3453b6fc609f3ad2d982b2827619edc73a` | 2 / 1 |
| Physics2D-autoSyncTransforms.html / `0f8d9a445a01172f687191c693987d62dc5652db52ad47a4e0a33aea5bc123df` | `81df82c7f427e42e97e839b4474a0a4d7a8d7a5785d7714635251fdb9845d44f` | 2 / 1 |
| Physics2D-reuseCollisionCallbacks.html / `ddfa4fb4177a1dd9290c3509276afa5759d607b0e68abb90fdc05f09e25de994` | `3bd0ac2883bb309b0254a3139f975e1b9aa656acb3be35b513d5ed0aad899a8b` | 2 / 1 |
| Collision2D.GetContacts.html / `ec556e8884d7e69243b977c0258bbc4b71e24421e42007034eb8ada2cd0755d2` | `2bd270d54ceb815353f8e0a31fba1f96c0efa6d7e6e541e8a26e13f9bd7a617e` | 9 / 2 |
| ForceMode2D.html / `6a2f26a62e03a5598932cb95c13db940a06ad6f9e0a89d2fc12fdf1d757dba9c` | `ccf8d4ace055aece9790e07532e6a415022add313a9252d545a2d9bf3598c71f` | 3 / 0 |
| Physics2D.SyncTransforms.html / `3e9e25a1072f84a20c17537272166e3192202e5580093d87c43232cde6ae6435` | `b47d0cc359c4a54da2ccd0f9419969456a2215a3ff0d9e00597042218a46f824` | 3 / 1 |
| RigidbodyType2D.html / `58eb63dc1d5b96a3e898bea2722146983c92e9dfc3a4261e9426c54a37c5d127` | `f07b3a4413de2eeb7da550037e5de451ac09c940c5937fd4de4020927c2d05a1` | 3 / 0 |
| Physics2D-maxTranslationSpeed.html / `596928daf3183ab538a23db498c757859d6c388a415adf9f357aa4a0df56aad1` | `802813f0caaf222d1e78c2e1a8c15071f8a9d8406a09e8fc68087a76c6e0b770` | 2 / 1 |

11syntax의 반환·static/instance·인수 이름/타입·default 표현이 root JSON과 같았어요. Collision2D.GetContacts의 array/list 2개를 구분했고 enum marker를 formal enum 선언으로 더하지 않았어요. RigidbodyType2D는 Dynamic/Kinematic/Static 3행, ForceMode2D는 Force/Impulse 2행이에요. 표시 property 문법만으로 실제 field storage·accessor·native binding을 확정하지 않은 판단도 유지해요.

## 표·예제 전체 대조

아래 locator는 해당 body의 기술 DOM 기준, 번호는 1부터예요. 표 hash는 각 cell text의 whitespace를 단일 공백으로 정리한 뒤 원래 행/셀 순서를 보존한 `ensure_ascii=False` compact JSON의 UTF-8 SHA-256이에요. 원문 표 모든 cell·private extraction·public hash가 같았어요. 전체 표 설명은 공개로 복제하지 않았어요.

| body / locator | 헤더 포함 행/셀 | 표 내용 hash |
| --- | --- | --- |
| Rigidbody2D.MovePosition / table[1] | 2 / 4 | `2723d42d68dc45287b741c83ffdcbd4d76fc6c55232c2f5944ffded77346af7e` |
| Rigidbody2D.AddForce / table[1] | 3 / 6 | `21cb489e38bf1ca1eb40a9c8b248fd879d919aac161b904267d5f7662bf9e3de` |
| Collision2D.GetContacts / table[1] | 2 / 4 | `af7b9bb9ce94cf367386ca2e62a7836ec4adf5bf2eac3bcb461451ce46803259` |
| Collision2D.GetContacts / table[2] | 2 / 4 | `25dd53b9b6fd2b717b9d0109916b63d1b0ed7cf06d558303dfd1c2909f771f26` |
| ForceMode2D / table[1] | 3 / 6 | `4b2db17791b6ad22fa4e29cc644b8cdd0f8a9ec049bdc168596918f462598c64` |
| RigidbodyType2D / table[1] | 4 / 8 | `022f6a720716346b6819dff464d11aef22b2266705788e71da26815c78c6c8ec` |

3개 `pre[1]`의 전체 예제는 원문에서 `BeautifulSoup pre.get_text('\n', strip=False)`로 재추출해 private text와 문자 전체가 같았어요. 다음 hash는 그 text를 UTF-8로 인코딩한 값이고 기존 CRLF는 그대로 유지했어요. 코드 전체를 이 문서에 복제하지 않았어요.

| body / locator | 전체 예제 문자 수 | 실제 text hash |
| --- | --- | --- |
| Rigidbody2D.MovePosition / pre[1] | 998 | `97586eede475a883437d746d322c781e9beb03f228694259080d4e04dc9f54ef` |
| Rigidbody2D.AddForce / pre[1] | 1,123 | `40410a976ce088d18b00227c8d728486211520591d419c11a64fcf4944731677` |
| ForceMode2D / pre[1] | 3,304 | `dc2fd3da3351433399aeab3a51c27549f6aab10db5dffc17f476a6097dc1e8c3` |

## 본문별 의미와 누락 대조

**bodyType / RigidbodyType2D.** root의 짧은 property·enum 해석이 맞아요. 타입 이름과 세 행동 종류는 표시되지만 전환 때 속도/contact/state 보존·비용·callback·default·numeric ID는 설명하지 않아요. enum 행의 짧은 설명을 Dynamic/Kinematic/Static의 전체 solver 계약으로 채우지 않았어요.

**MovePosition.** 다음 physics update 동안 필요한 선형 속도를 계산해 목표로 이동하고 그 이동에는 gravity/linearDamping이 영향을 주지 않는다는 내용이 있어요. collision/trigger가 발생하고 목표 도달을 막을 수 있으며 kinematic 본체와 dynamic 상대의 영향이 달라요. 큰 거리·짧은 시간의 속도 제한과 마지막 호출 적용을 원문에서 직접 확인했어요. 즉시 Transform teleport나 호출 때마다 독립 이동을 실행한다는 해석은 없어요. FixedUpdate·kinematic 권장과 예제의 Awake/Start/FixedUpdate 전체를 비교했고, 예제는 bodyType을 Kinematic으로 설정하지 않아요. local/world 좌표 계약과 수치 속도 한계·실패 통지는 이 본문만으로 확정하지 않은 판단이 맞아요.

**AddForce.** Vector2 X/Y, 질량을 사용한 가속, optional default=ForceMode2D.Force는 표시 선언·표·본문에 있어요. 전체 예제의 FixedUpdate에는 default Force 호출과 명시 Impulse 호출이 **둘 다 활성 코드**예요. `Alternatively` 주석은 실행 분기·첫 호출 비활성화가 아니에요. 예제를 한 가지 force만 적용하는 코드로 계산하지 않은 분석이 맞아요. body 종류·sleep·비활성·누적 호출 효과·좌표계·invalid input은 후속 확인 대기예요.

**simulated / useFullKinematicContacts.** simulated=false는 연결 Collider2D/Joint2D의 simulation 참여도 제외하지만 GameObject visibility·삭제·메모리 수명과 같은 계약은 아니에요. query 가시성과 다시 켤 때 상태를 본문에서 확인했다고 주장하지 않았어요. useFullKinematicContacts는 false 기본 관계와 true일 때 kinematic/kinematic·kinematic/static callback을 설명하고 자동 response 없이 overlap을 허용해요. Kinematic bodyType 조건과 `[[...]]` markup 잔재도 원본에 있어요. 이를 일반 trigger flag·자동 collision response와 같은 것으로 합치지 않은 판단이 맞아요.

**autoSyncTransforms / SyncTransforms.** 자동 sync 설명은 false일 때 **Fixed Update의 physics simulation step 직전**을 명시하고 수동 SyncTransforms를 따로 가리켜요. 반복 Transform 변경→query의 성능 비용과 이전 프로젝트 호환 안내가 있어요. 이를 모든 manual/Update mode·독립 Scene에 확대하지 않은 누락 판정이 타당해요. SyncTransforms의 짧은 본문은 Transform와 자식 Rigidbody2D/Collider2D의 위치·회전·크기 갱신을 설명할 뿐, physics 시간 전진·solver 실행·contact callback·세계 선택·thread를 입증하지 않아요. 따라서 HB dirty batch/flush 제안은 출처의 실행 보장이 아니라 설계 후보로 남아 있어요.

**reuseCollisionCallbacks / GetContacts.** Enter2D/Stay2D/Exit2D의 Collision2D instance를 true에서 재사용해 GC 부담을 줄이고, callback 뒤 나중에 처리할 참조가 필요하면 false를 사용하라는 안내가 있어요. saved reference를 immutable event snapshot으로 보장하지 않은 판단이 맞아요. 그러나 원문은 C++ borrowed ABI·정확한 invalidation 시점·per-world identity·thread·재진입 규약까지 정의하지 않으므로 HB borrowed/copy 분리는 설계 제안이에요. false에서도 모든 참조/ContactPoint2D가 영구 snapshot이라는 보장으로 확장하면 안 돼요.

GetContacts는 array/list 결과 container에 **실제로 쓴 수**를 반환해요. array의 재사용·무할당 설명과 충분한 크기 권고, list 부족 시 증가·증가 없을 때만 무할당, contactCount 안내를 양쪽 전체 본문에서 확인했어요. 반환을 언제나 전체 가능한 contact 수로 추정하지 않았어요. 순서·작은 array의 선택/truncation·null/exception·좌표계·재사용 Collision2D의 데이터 수명은 미상으로 유지해요.

**ForceMode2D.** enum Force/Impulse는 mass 사용과 지속 force/즉시 impulse를 구분하고 3D ForceMode는 별도 링크예요. 예제 OnGUI는 상태를 바꾸며 Update switch가 그 상태 동안 AddForce를 반복해요. Impulse 버튼 한 번에 impulse 호출 한 번이라고 해석할 수 없어요. `m_Rigidbody.velocity` 참조도 원본에 있고, offline 경로의 `Rigidbody2D-velocity.html` 파일이 실제로 없는 것을 확인했어요. 파일 부재는 API binding 삭제나 컴파일 실패의 증거가 아니므로 호환성·폐기·실제 compile 판정 미정이 맞아요. 2D enum numeric 값과 Update/fixed-step 누적 실행 관계도 후속 대기예요.

**maxTranslationSpeed.** 최대 linear speed와 physics update당 적용이라는 짧은 설명·값 증가의 numerical 문제 경고가 있어요. 단위·default·range·clamp·MovePosition의 정확한 한계 식·독립 Scene 적용 범위를 source fact로 만들지 않은 분석이 맞아요. map 크기 제한과 동일시하지 않았어요.

## 기존 live cache 비교와 남은 계약

새 network 요청은 하지 않았어요. root가 저장한 live3개 cache bytes와 hash를 읽기 전용으로 다시 확인했어요. MovePosition(`7aaed06450cf373e70a07062466feb92c0bef14e9607960defa35a101981cfc4`), simulated(`e4fd132bd7f971e86c5b96de9f351d17c729fcdbffafbaa74b2834d8429cad47`), reuseCollisionCallbacks(`d31b26d9ed21dd328ee41abc3a90d04c06c4e8408ead95a245197eb99e4eda59`)의 저장 live sourceHash가 같고, Unity6000.0/job76758565/2026-10-03 footer와 archive technical text 일치를 확인했어요. 파일 위치는 root JSON `liveTextComparisons[].sourceFile`에 고정돼 있어요. 이는 cached3 text 비교이고 새 HTTP 취득·나머지9본문 최신 동일성·모든 판본 동일성 검증은 아니에요.

root의 각 `analysis.unknowns`를 유지해요. property accessor/native binding/default, numeric enum/member 상세, 2D body 전환·힘 누적·phase·thread·invalid input·실패, world/Scene 적용 범위·sync/query 순서, callback 순서·Collision2D/ContactPoint2D 참조 수명, 예제 velocity 호환성과 실제 compile이 미완료예요. 실제 전체 namespace/module/owner/inherited/overload 분모와 linked API는 이12개로 닫히지 않아요.

사람 Inspector·C++·typed node·AI의 같은 검증/직렬화/revision/Undo, 독립 sync/step·borrowed/copy data·stable id 제안은 HB 설계 판단으로 분리돼 있어요. 이 대조는 HB 구현이나 Unity 공식 AI 계약의 동등성 증거가 아니에요. root 분석의 수정이 필요한 사실 오류는 이번 읽기에서 발견하지 않았어요. 미해결 계약이 남아 전체 verified·분모 완료·구현 gate 통과를 선언하지 않아요.

이 신규 감사 MD만 작성했어요. 원본 MD/JSON·private source/body/extraction·공유 ledger/status·엔진·GUI·network·커밋은 변경하지 않았어요. 분석 대상 bytes가 바뀌면 본 감사는 재대조가 필요하며, 원장 promotion 여부는 root의 추가 증거 판단에 맡겨요.
