# 개별 열거형·구조체 에셋

콘텐츠 브라우저의 만들기/우클릭 → 데이터에서 **열거형**(`enumasset`, `.hbenum.json`)과 **구조체**(`structasset`, `.hbstruct.json`)을 만들어요. 별도 타입 편집기로 열고 대표 선언의 항목·필드·기본값·표시 이름·설명을 편집해요. 같은 파일의 보조 열거형·구조체는 중첩 필드/배열 자료형으로 쓸 수 있어요. 기존 `.hbtypes.json` 공유 라이브러리는 그대로 지원해요.

세 형식은 동일한 version1 선언 모델과 컴파일러를 사용해요. 개별 에셋에는 `primary:{kind:"enum"|"struct",id:"선언 UUID"}`가 있고, 파일 확장자와 대표 선언의 종류가 일치해야 해요. 저장된 대표 ID·namespace·멤버 ID·C++ 이름·열거형 숫자·기존 필드 순서를 지켜요. 파일 이름/폴더/표시 이름은 이 C++ identity와 별개예요.

블루프린트 클래스 기본값의 가져온 자료형에서 파일을 추가해요. 저장 형태는 기존 `native:{version:1,sourceReference:true,typeLibraries:["Assets/F_Stats.hbstruct.json","Assets/E_Mode.hbenum.json"]}`예요. 로드한 메타데이터는 기존 변수 자료형 선택, 열거형 컨트롤/Switch, 구조체 Make/Break/SetMembers·분할 핀, 배열·Actor 참조와 공용 런타임으로 연결돼요. 원본 참조만 있는 저장 문서의 열거형 변수/Set 입력값도 허용하고, 실제 원본을 해석한 뒤 존재·숫자 범위를 다시 검증해요. 순수 BP에는 별도 C++ 클래스/빌드가 필요하지 않아요.

C++에서는 `compileNativeTypeAsset(data).path`의 `Source/`를 뺀 경로를 include해요. 생성 헤더 경로는 에셋 UUID로 고정돼요. 구조체·열거형은 같은 선언을 사용하며 수동 복사/이중 정의가 필요하지 않아요. 파일/폴더 이동은 ID와 헤더 경로를 유지하고 기존 디스크 참조는 프로젝트 redirect로 읽어요. 열린 BP의 `typeLibraries`와 이력은 새 경로로 바뀌어요. 이름 변경으로 파일의 자료형 종류를 바꾸는 것은 거절해요.

새 구조체 필드의 기본값은 [공용 이관](NATIVE_TYPE_MIGRATION.md)을 통해 BP·장면·프리팹·시퀀스의 선언된 값에 보완해요. 타입 JSON·C++ 헤더·소비자·깨끗한 열린 문서는 같은 파일 묶음/UndoRedo/읽기 기준/계획 CAS를 사용해요. 열거형만 있는 메타데이터에 구조체 배열이 없는 경우도 저장·그룹 복원을 처리해요. 삭제·이름/자료형 변경의 강제 변환은 이 절차로 허용하지 않아요.

AI는 `engine.schema.nativeTypeDeclarations`, `createNativeTypeDeclaration`, `compileNativeTypeAsset`, 기존 `files.get/apply/undo/redo`와 `document.*`을 사용해요. 개별 에셋도 기존 프로젝트 인덱스/필터/의존 참조에 나타나요. 상주 registry·폴링·worker·GPU 리소스를 새로 만들지 않아요. **다른 에셋의 선언을 필드 typeId로 직접 참조하는 의존성, 전역 자동 발견, ABI hot reload는 별도 잔여예요.** 파일 안 보조 선언과 명시적 BP 가져오기를 이 기능의 근거로 사용해요.

대조한 공식 원문은 [Unreal 구조체 변수](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-struct-variables-in-unreal-engine)의 사용자 구조체 생성/필드 기본값/변수 자료형/Make·Break·SetMembers와 [C++ Struct](https://dev.epicgames.com/documentation/en-us/unreal-engine/structs-in-unreal-engine)의 BlueprintType 노출이에요. 이 두 원문의 관련 본문만 대조했고 UE/Unity 전체 본문/API 분석 완료로 계산하지 않아요.

검사 소유자는 `tools/check-native-type-declarations-1821.mjs`와 `tools/check-native-type-declarations-1822-window.mjs`예요. 실제 C++/독립 D3D11 게임에서는 생성 enum37·새 중첩 필드2+2를 읽어 `[99,4,37]` 이동, 순수 BP는 `[99,3,2]` 이동을 확인해요. 실제 실행 결과가 통과한 기록만 WORK/USER_INSTALL에 연결해요.
