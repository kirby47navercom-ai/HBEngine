# Android 저장 API 015 독립 본문 대조

2026-10-04, `research_only`. 분석 담당자는 `root`, 독립 대조 담당자는 `/root/android_editor_lifecycle_013`이에요. [분석 MD](ANDROID_STORAGE_API_BODY_015.md)의 SHA256은 `8a5a8af8330d97fe08b1606d020827d7708b53af406381a4f0c852ed2b19b521`, [분석 JSON](android-storage-api-body-015.json)은 `fb9dcd8fbcd6f7a55fb64713c812fdd7cdc973922eee665780def26981406054`로 고정했어요. 분석 파일은 직접 수정하지 않았어요.

## 실제 대조한 범위와 결과

네 source HTML의 hash를 재계산하고, exact `h3.api-name`의 부모 구역을 source에서 다시 추출해 18개 body hash와 맞췄어요. owner title/class 머리 부분 4개도 source에서 다시 추출했어요. **4개 owner 전체는 미독**, Kotlin owner 대안·다른 멤버·연결 API의 전체 계약도 미독이에요.

18개 선택 Java 멤버 구역의 설명·추가 API level·선언·인수·반환·실패 문구·참고 목록과 모든 표 셀을 실제로 직접 읽었어요. **20heading·18선언(메서드 10/상수 8)·14표/30행/46셀**, 선택 구역의 구현 예제·기술 media는 각각 0개로 재집계했어요. body/text/source·선언·heading·API added metadata와 표 fingerprint는 모두 일치해요. scope 안의 새 사실 오류나 계산 오류는 발견하지 않았어요. hash 재계산과 직접 읽기는 별도의 증거예요.

표 fingerprint는 행별 direct `th/td` 텍스트 배열을 UTF-8 compact JSON으로 직렬화해 계산했어요. DOM cell은 colspan과 관계없이 1개로 세고 텍스트 내부 공백을 추가로 합치지 않아요. 이 규칙은 분석 JSON의 `hashRules`와 같아요. 두 descriptor 구역의 mode/cancellation 설명처럼 집계된 table 밖에 있는 parameter 텍스트도 구역 전체에서 읽었어요. 표 수만 확인하고 parameter 계약을 생략하지 않았어요.

## 의미 대조

| 선택 구역 | 독립 대조 결과 |
| --- | --- |
| `AS015-01–03`, resolver 영속 grant | 제공된 persistable grant의 취득·이미 취득한 시간 touch, release 후 비영속 grant 유지, 호출 앱이 취득한 목록과 unlock 전 사용 제한을 구분했어요. non-null 목록을 파일 사용 성공으로 해석하지 않아요. |
| `AS015-04–05`, descriptor 두 overload | URI/mode의 non-null 조건·6 mode·provider별 truncate 차이, exclusive stream과 seek 가능 `rw`, subsection 제한, provider crash 시 null, 호출자 close 책임과 파일/모드 오류를 대조했어요. API 19 cancel overload의 nullable signal·취소 예외는 parameter 설명에도 있어요. 취소 race/이미 열린 descriptor 수명까지 완료했다는 주장은 없어요. |
| `AS015-06–09`, Intent grant/getFlags | READ/WRITE/PERSISTABLE의 값과 top-level grant의 data/ClipData 적용, 가능한 영속 grant를 실제 take하는 절차, getFlags의 현재 bit 목록을 대조했어요. 다른 flag의 연결 본문을 읽은 것으로 세지 않았어요. |
| `AS015-10–13`, provider document capability | COLUMN_FLAGS의 문자열 column 이름과 조회 int 값, write/delete의 별도 지원, 바뀔 수 있는 writability, virtual document의 API 24·512·대체 stream format을 확인했어요. grant와 provider capability를 같은 타입으로 취급하지 않는 HB 판단이 출처와 구분돼 있어요. |
| `AS015-14–18`, UriPermission | URI 반환·UTC epoch millisecond·미영속 long sentinel·read/write 제공 여부를 대조했어요. getUri 반환 표에 명시되지 않은 nullability를 만들어 넣지 않았고 time을 stable asset ID/revision으로 해석하지 않았어요. |

분석의 두 출처 차이는 그대로 남겨요. resolver의 재-take 시간 touch와 getter의 최초 영속 시간 설명은 양쪽 원문에서 각각 확인했어요. 012의 SAF guide에서도 `open-virtual-file` subsection 전체를 별도 부분 읽기로 재확인했으며, guide의 API 25 표시와 상수 reference의 API 24 표시는 같지 않아요. 이 보조 subsection의 Kotlin·Java 예제 4개를 읽었지만 **015 선택 API 구역의 구현 예제 0개에 합치지 않아요**. 나머지 SAF article을 이번 독립 대조에서 전체 읽었다고 표현하지 않아요.

## HB 판단과 현재 코드의 경계

grant flag·provider capability·project revision·asset ID를 분리하고, 실제 저장 commit 전 완료를 보고하지 않으며, URI/descriptor의 소유권·취소·복원을 공용 명령에서 다룬다는 내용은 **HB 설계 판단**이에요. Android 공식 API가 HB transaction·AI idempotency·JNI resource cleanup을 이미 제공했다는 사실로 표시하지 않았어요.

`tools/project-storage.mjs` 전체와 `tools/project-service.mjs:23–29/61–73`을 독립적으로 읽었고 두 파일 hash도 재계산했어요. 전자는 에디터 상태/SaveGame 키 map·크기 제한·queue와 Node fs 임시파일 교체를 사용해요. 후자의 선택 구역은 path/realpath 검증·import/read·원본 비교·backup·형식 검증·임시파일 교체를 다뤄요. 분석은 이 PC 경로를 SAF provider의 rename/seek/overwrite·durability와 동일하다고 주장하지 않아요. 읽지 않은 다른 코드의 부재 판정도 하지 않아요.

## 남은 검증

이 결과는 **고정된 선택 구역과 분석의 일치 대조 통과**예요. 전체 owner/API/Kotlin·linked type·overload·thread·권한 실패·취소/철회·SDK edition/JNI ABI·provider 지원과 실제 파일 사용은 미해결이에요. 중간 redirect hop과 정확한 판본 고정의 제한도 유지해요. 선택 18개를 Android API 전체분모로 쓰지 않고 분모는 미확정으로 남겨요.

엄격한 원장 `verified`와 승격은 **0**이에요. 기기/SDK/JNI/provider/engine/runtime/GUI 실행이나 실제 파일 I/O 테스트는 **0**이고, 미래의 모바일 저장·복구 구현 완료도 아니에요. [검증 JSON](android-storage-api-verification-015.json)에 source/body/analysis hash, 실제 읽기 범위, 기계 재계산과 의미 판단을 분리해 기록했어요. 원문·전체 표·보조 예제는 무시 캐시에만 있어요.
