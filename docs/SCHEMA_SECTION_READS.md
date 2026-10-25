# 필요한 스키마만 읽기

AI가 엔진 계약 하나를 확인할 때는 전체 스키마를 받을 필요가 없어요.

```powershell
node tools/hb.mjs schema --local --list
node tools/hb.mjs schema --local --section poleControl
node tools/hb.mjs schema --section poleControl.fields.angle --url http://127.0.0.1:5173
```

`--list`는 상위 항목 이름만 반환하고 값은 만들지 않아요. `--section`은 요청한 상위 계약만 만든 뒤 그 안의 점 경로를 읽어요. 중첩 객체·배열 번호·문자열·0·false·null을 지원해요. 출력은 기존 CLI의 `{section,value}` 형식을 유지해요. `--local`은 편집기나 서버 없이 현재 소스를 읽어요.

HTTP는 `GET /api/schema?section=poleControl.fields.angle`, 이름 목록은 `GET /api/schema?list=1`을 사용해요. 프로젝트를 아직 열지 않은 허브에서도 이 읽기 API를 사용할 수 있어요. 이전 `GET /api/schema`의 전체 JSON과 순서는 유지해요. 새 CLI가 이전 서버에 연결해 전체 응답을 받으면 기존처럼 잘라서 반환하지만, 그 경우에는 전송량 감소가 적용되지 않아요.

빈 경로·위험한 프로토타입 경로·겹친 조회 옵션·없는 상위 항목은 값을 만들기 전에 거부해요. 중첩 항목의 존재 여부는 선택한 계약을 만든 뒤 확인해요. 선택한 응답은 기존 전체 JSON 전송에서 보였을 값과 같고 다른 조회의 계약 데이터를 수정하지 않아요. 선택하지 않은 계약의 깊은 복제와 직렬화는 실행하지 않아요. 요청한 상위 계약 자체가 큰 경우에는 그 계약을 만드는 비용이 남고, 모듈 가져오기·C++ 컴파일·엔진 전체 시작 시간을 줄였다는 뜻은 아니에요.

격리된 메타데이터 검사에는 `HB_SCHEMA_ONLY=1`로 스키마 읽기만 여는 서버를 사용해요. 이 모드는 기본/사용자 프로젝트를 열거나 초기화하지 않고, 네이티브 채널·프로젝트·파일·실행 API를 제공하지 않아요. 사용자 앱의 창이나 프로필을 테스트에 사용하지 않아요.
