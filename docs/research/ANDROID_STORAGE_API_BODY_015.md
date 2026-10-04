# Android 프로젝트 저장·권한 API 구역 분석 015

2026-10-04, `research_only`. [012의 파일 저장 분석](MOBILE_EDITOR_BODY_012.md)을 실제 Java API 구역으로 이어 읽었어요. **4개 owner 페이지 중 선택한 18개 멤버 구역 전체**와 owner title/class 선언 metadata만 읽었어요. 4페이지 전체 본문이나 전체 Android API를 읽은 것은 아니에요. Kotlin 대응 페이지와 다른 멤버는 미독이에요. source/body bytes·anchor·선언·표 fingerprint·미해결은 [기계 기록](android-storage-api-body-015.json)에 고정해요.

선택 구역은 20heading·18표시 선언(메서드 10/상수 8)·14표(헤더 포함 30행/46셀), 구현 예제 0개, 기술 그림/SVG/영상 0개예요. 표의 parameters/returns/throws와 구역 전체 텍스트를 직접 읽었어요. owner 클래스 4개의 부분 선언은 18개 멤버 선언에 더하지 않아요. API added level은 각각 표시를 읽었지만 unversioned 사이트 전체를 특정 SDK release와 동일하다고 확정하지 않아요. Last updated는 Intent 2026-09-16 UTC, 나머지 3페이지 2026-08-03 UTC예요. HTTP final URL은 확보했으나 중간 redirect hop은 추적하지 않았어요.

## 원문에서 확인한 저장 계약

[ContentResolver](https://developer.android.com/reference/android/content/ContentResolver#takePersistableUriPermission(android.net.Uri,%20int))의 take/release/getPersisted와 openFileDescriptor 두 overload를 읽었어요. persistable로 **제공된** read/write grant만 보존하며 재요청은 시간 값을 touch해요. release는 비영속 grant를 남겨요. 반환 권한 목록은 호출 앱이 얻은 것만 포함하며 unlock 전 URI가 사용 불가할 수 있어요. 목록 비-null이 파일 사용 가능을 보장하지 않아요.

openFileDescriptor는 content/file URI와 여섯 mode를 다뤄요. provider별 `w` truncate가 다르고 `r`/`w`는 pipe/socket일 수 있어요. `rw`는 seek 가능한 파일을 뜻해요. subsection provider는 이 API에 맞지 않아요. descriptor 소유자는 호출자이며 close 책임이 있어요. provider crash 때 null, 파일/모드 오류 때 FileNotFoundException을 설명해요. cancel overload의 signal은 nullable이며 취소 시 OperationCanceledException을 설명해요. linked close/asset/provider API의 전체 수명은 미확인이에요.

[Intent](https://developer.android.com/reference/android/content/Intent#FLAG_GRANT_PERSISTABLE_URI_PERMISSION)의 READ=1, WRITE=2, PERSISTABLE=64와 getFlags를 읽었어요. PERSISTABLE은 가능성을 제공하며 take 호출이 필요해요. data/ClipData의 중첩 URI에 top-level grant flag를 적용해요. getFlags는 현재 설정 flag 목록이며 세 권한 상수 외의 연결 flag 본문은 미독이에요. 반환 숫자를 provider의 쓰기 지원 여부로 바꾸지 않아요.

[DocumentsContract.Document](https://developer.android.com/reference/android/provider/DocumentsContract.Document#FLAG_SUPPORTS_WRITE)의 COLUMN_FLAGS는 column 이름 문자열 `flags`이고 조회 값은 int예요. WRITE=2와 DELETE=4는 각각 다른 provider 기능이에요. WRITE 설명은 원격 접근 변화로 실제 쓰기가 달라질 수 있다고 적어요. VIRTUAL=512의 added level은 **24**이며 원 MIME의 byte 표현 대신 대체 stream format을 요구해요. 이는 012 guide의 API25 문구와 구별한 직접 상수 metadata 근거예요. typed-stream API 전체는 미독이에요.

[UriPermission](https://developer.android.com/reference/android/content/UriPermission#getPersistedTime())의 getUri/getPersistedTime/isReadPermission/isWritePermission/INVALID_TIME을 읽었어요. time은 UTC epoch milliseconds, 미영속 sentinel은 long 최소값이에요. getter 설명의 ‘first persisted’와 resolver 재-take의 ‘touch’ 문구를 함께 보존해요. 시간 값을 immutable asset ID나 project revision으로 사용하지 않아요.

## HBEngine에서 함께 정해야 할 계약

아래는 원 Android 엔진 구현 사실이 아니라 HB 설계 판단이에요. C++·노드·사람 UI·AI 명령이 같은 파일 참조와 저장 결과를 다뤄야 해요.

- `uriGrantFlags`, `providerDocumentFlags`, `projectRevision`, `assetId`를 다른 타입으로 보관해요. grant WRITE=2와 provider WRITE=2가 숫자가 같아도 섞지 않아요. 원본 URI·표시 이름·권한 요청/취득 상태·provider capability·확인 시각은 각각 보존해요.
- 프로젝트 열기/다시 열기는 영속 grant 목록→사용 가능/lock 확인→실제 metadata/stream open→참조 검증으로 나눠요. 사용할 수 없는 원본은 누락 상태로 표시하고 다른 빈 프로젝트로 덮어쓰지 않아요. 사용자 재선택도 stable asset ID의 연결 변경으로 처리해요.
- 저장/import/cook 작업에는 source revision·요청 ID·현재 단계·취소 요청·완료 상태·artifact hash를 붙여요. provider의 overwrite/truncate/seek 기능을 확인하지 않고 desktop 임시파일 교체 규칙을 적용하지 않아요. 파일 전체 기록/검증 전에 UI와 AI에 저장 완료를 알리지 않아요.
- JNI 경계에서 descriptor/stream의 소유권을 하나로 정하고 정상·null·취소·실패·앱 중단 때의 정리를 검증해요. 노드 핀에는 원래 URI와 job/error/status를 노출하되 임의 절대 경로로 변환하지 않아요. C++ 함수 반환과 비동기 저장 완료는 별개예요.

후속 검증은 허용 grant 일부만 받은 경우, unlock 전/후, provider 권한 변경/종료, 비-seek stream, 잘못된 mode, cancel race, 기존 파일 보존, 다른 AI revision, import 중 process death, 저장 후 재열기를 PC/mobile 각각 대조해야 해요. 이번에는 Android 기기/SDK·JNI·provider·C++ 실행을 하지 않았어요.

## 현재 저장 코드의 읽기 전용 대조

`tools/project-storage.mjs` 전체를 읽었어요. 이 파일은 에디터 상태/SaveGame 키의 version1 문자열 map, 8MiB 제한과 queue·check 함수를 사용하며 Node fs의 temp `wx` 기록→rename→temp 정리로 저장해요. 프로젝트 asset 파일 전체 저장 계약이라고 확대하지 않아요. `tools/project-service.mjs`의 resolve(23–29), import/read/checkedWrite/write/writeFile(61–73) 구역도 직접 읽었어요. 여기에는 로컬 path/realpath·이름 검증, 원본 변경 비교와 backup, 파일 형식 검증 및 temp rename 경로가 있어요.

이는 현재 PC 파일 경로의 근거이며 Android provider URI에서 같은 rename/seek/overwrite·취소·durability 계약을 입증하지 않아요. 모바일 host/provider adapter와 기존 stable asset/외부변경 검사의 대응이 필요하다는 분석이에요. 다른 저장 코드나 repository 전체에 대한 부재 판정은 하지 않았고 실제 파일 쓰기/장애 테스트도 실행하지 않았어요.

## 미해결을 유지한 범위

SAF guide Kotlin의 flags OR와 Java의 returned grant mask 차이는 이 API만으로 모두 해결되지 않아요. take 본문은 가능한 mode와 offered grant 조건을 적지만 모든 초과 grant/권한 실패의 exception·thread·재진입 계약은 적지 않아요. Context.grant/revokeUriPermission·CancellationSignal·ParcelFileDescriptor.close/closeWithError·openAssetFileDescriptor·DocumentsProvider·typed stream·Cursor/query·ACTION_OPEN_DOCUMENT의 전체 계약, 다른 상수/overload와 Kotlin 대응을 이어 읽어야 해요.

owner namespace/header·Java 선언을 확인했으나 source SDK edition/native/JNI ABI 전체 일치, 배열/List/object 수명·nullability의 미표시 부분, callback phase·권한 철회와 이미 열린 descriptor 관계는 미확정이에요. linked API와 전체 플랫폼 목록/분모를 폐쇄하지 않아요. **원장 승격 0/엄격 verified 0**, 독립 source-to-analysis 대조는 별도 기록이 필요해요. 원문/전체 표는 무시 캐시에만 보존하며 선택 구역 자동 추출을 실제 읽기로 계산하지 않아요.
