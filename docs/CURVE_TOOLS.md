# 공용 곡선 제작 도구

타임라인·시퀀스·골격 클립 메타데이터 곡선이 같은 샘플러와 편집기를 사용해요. 기존 Auto 곡선의 값은 유지하며 `clampedAuto`를 선택한 키에만 새로운 보간을 적용해요.

- **Clamped Auto**: 불균일한 키 간격을 반영하는 PCHIP 기울기를 사용해요. 이 모드인 양 끝 키 사이에서 값이 끝값 범위를 넘어가지 않아요. 명시한 수동 핸들·가중치는 자동 모드에서 무시하며, 핸들을 직접 편집하면 User/Break로 전환해요. 기존 Auto를 Unity의 현재 내부 구현과 동일하다고 주장하지 않아요.
- **평탄화 / 탄젠트 정렬 / 인접 키 향하기**: 수평 기울기, 양쪽 기울기의 평균 각도, 각 인접 키를 향한 독립 기울기를 적용해요. 선택한 채널과 키만 수정해요.
- **값 부드럽게**: 인접 값의 1:2:1 필터예요. FFT 필터는 아니에요. 선택하지 않은 채널의 수동 기울기·가중치를 유지해요.
- **시간·값 변환 / 값 반전**: 양수 시간 배율·시간 이동과 값 배율·이동을 적용해요. API는 별도 시간·값 기준점도 받아요. 가중치 길이는 유지하고 기울기는 값 배율/시간 배율로 바꿔요.
- **베이크 / 선형 키 축약**: 키를 둘 이상 선택하면 가장 앞·뒤 선택 키 사이만 지정 FPS로 베이크해요. 그 외에는 현재 곡선 전체를 베이크해요. 선형 키 축약은 모든 원본 키·채널에서 허용 오차를 넘지 않게 키를 줄여요. 기본 FPS 30, 오차 .001은 도구 설정에서 바꿔요. 곡선 사이 연속 오차나 사용자 탄젠트 곡선 축약을 보장한다고 주장하지 않아요. 베이크 후 축약할 수 있어요.
- **Euler 각도 연속화**: 일반 XYZ 회전 트랙 전체에 명시적으로 적용해요. 360도 등가 각도와 결합된 XYZ 등가 분기를 비교해서 직전 키와 가까운 값을 선택하고, 키의 방향을 유지하며 선형 키로 바꿔요. 의도한 여러 바퀴 회전은 제거될 수 있으므로 자동 가져오기에 적용하지 않아요. 쿼터니언 트랙·다른 회전 순서·리그 전체의 연속 최적화는 별도예요.

키 선택 후 `1 Auto`, `2 User`, `3 Break`, `4 Linear`, `5 Constant`, `6 Clamped Auto`를 사용할 수 있어요. `Ctrl+A` 전체 키 선택, `F` 선택 맞춤, `Home` 전체 맞춤, `A` 재생 헤드 중심 이동이에요. 입력칸의 텍스트 단축키와 Undo/저장은 기존 편집기가 처리해요. 편집기를 닫으면 키 리스너도 해제해요.

골격 클립은 왼쪽 곡선 목록, 중앙 그래프·키/가중 핸들·재생 도구, 오른쪽 구동 대상·범위 설정으로 편집해요. 원래 골격 Transform 트랙 표는 접어서 볼 수 있어요. 메타데이터 곡선의 실제 AnimationGraph 재생은 기존 공용 샘플러를 사용해요.

시퀀스 그래프의 **곡선** 선택기에서 다른 숫자 트랙으로 바로 바꿀 수 있어요. 선택은 보기 상태만 바꾸며 Undo나 에셋 수정으로 기록하지 않아요.

부분 베이크는 경계의 기존 값·도함수·유효 가중치를 보존해 바깥 보간과 범위 밖 재생을 유지해요. 필요한 경계 키와, 두 이웃을 읽던 Clamped Auto 끝 키는 원래 탄젠트를 명시화할 수 있어요. 바깥 키 시간·값은 유지해요. `rangeOnly:true`의 시작·끝은 기존 키 시간이어야 하며 결과와 외부 키의 합에도 소유자의 예산을 적용해요. 정렬되지 않거나 같은 시간인 키는 일괄 도구 적용 전에 명시적으로 정리해야 해요. 도구에 임의의 큰 `maxKeys`를 보내도 65,536개 안전 예산을 넘어선 할당을 허용하지 않아요.

AI는 `sequence.curve.tool`, `skeletal.curve.edit`를 사용해요. `path`, `expectedRevision`, `dryRun`과 기존 문서 Undo/저장을 공유해요. 잘못된 시간·shape·예산은 문서를 바꾸기 전에 거절해요. BP 타임라인은 기존 `document.patch`로도 편집할 수 있어요. 키 예산은 기존 소유자 검증을 따르며 새 상주 캐시·작업자·렌더 타깃은 만들지 않아요.

키 조회는 정렬된 배열에서 이진 검색하고, 범위 맞춤은 값을 임시 평탄 배열로 만들지 않고 순회해요. 화면에 겹친 키 마커는 채널별 화면 열당 최대 4개로 표시하며, 데이터와 전체 선택은 유지해요. 64개를 넘는 다중 선택은 주 선택 키의 핸들을 표시하고 가까이 확대해서 개별 키를 편집할 수 있어요. 골격 메타데이터 65,536키의 실제 창 검사와 65,536 벡터 키의 범위 맞춤·조회 검사는 서로 다른 증거이며, 1326 당시 시퀀스의 1,024키 예산 확대 증거는 아니었어요. 현재의 트랙당65,536키·전체 예산과 개요/속성 페이지는 docs/DENSE_SEQUENCE.md의1386 이후 증거를 봐요.

참고한 지정 본문은 [Unity 6000.0 곡선의 tangent mode](https://docs.unity3d.com/6000.0/Documentation/Manual/EditingCurves.html)의 Clamped Auto/수동 전환과 [Epic 5.8 Curve Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-curve-editor-in-unreal-engine)의 도구·선택·베이크·축약이에요. [Unity TangentMode API](https://docs.unity.com/en-us/engine/6000.7/script-reference/unityeditor/animationutility/tangentmode)는 enum 정의·필드만 대조했어요. 지정 절을 읽은 범위이며 전체 문서/API 분석 완료는 아니에요. 구현 수식과 필터는 HB 자체 코드이고 UE/Unity의 비공개 내부 수식 복제라고 주장하지 않아요.

쿼터니언 각속도·누적 외삽, 다중 곡선 동시 편집, 고급 리그 Euler 필터는 별도 잔여예요. 쿼터니언·이산 값의 범위 반복은 CURVE_INFINITY.md를 봐요. 1378 이후의 키 사이 경계 베이크와 Butterworth 주파수 필터는 아래 범위를 지원해요. 새 증거는 ENGINE_WORK 후속 기록을 확인해요.


## 키 클립보드와 공통 조작

선택 키는 Ctrl+C/X/V와 곡선 우클릭 메뉴로 복사·잘라내기·붙여넣기해요. 첫 복사 키를 현재 재생 헤드에 놓고 상대 시간 간격, 전체 채널 값, 보간·탄젠트·가중치를 보존해요. 같은 자료형의 다른 곡선에도 붙일 수 있어요. 같은 시간의 키는 교체하고 숫자 오차만 있는 동일 시간도 중복 키로 만들지 않아요. 범위 밖·자료형 불일치·키 예산 초과는 붙여넣기 전체를 거절해요. 단일 채널만 복사하는 명령은 아니에요.

일반 곡선·시퀀스/골격 내부 곡선·BP 타임라인은 공통 단축키 프로필을 사용해요. A/Home,1..6,복사 명령도 재지정할 수 있고, 기존 명시적 사용자 배정이 새 기본키와 충돌하면 사용자 배정을 유지해요. 입력칸의 텍스트 복사는 그대로예요. 시퀀스의 위쪽 시간 제어와 아래 곡선 재생 헤드는 양방향으로 동기화해요. 비동기 클립보드 처리가 끝나기 전에 문서·트랙·타임라인이 바뀌거나 창이 닫히면 변경을 적용하지 않아요.

페이로드는 hb.curve.keys version1의 자료형·상대 시간 키 JSON이에요. 텍스트는 최대 8,388,608자이며, 개수는 소유자 예산을 따르고 절대 상한65,536키예요. OS 클립보드 권한이 없으면 현재 편집기 세션의 마지막 키 복사본을 사용해요. AI는 OS 클립보드 없이 sequence.curve.keys / skeletal.curve.keys의 copy/cut/paste와 typed payload를 사용해요. copy는 revision·dirty·Undo를 만들지 않고, 쓰기는 기존 revision·dryRun·Undo 계약을 공유해요. 단일 곡선 선택용이며 다중 곡선 동시 라우팅은 별도 잔여예요.

[Epic Curve Editor Copy and Paste](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-curve-editor-in-unreal-engine)의 지정 본문에서 첫 키를 재생 헤드에 놓는 상대 시간과 복사/잘라내기 조작을 추가로 대조했어요. 다른 절과 전체 API 완료를 뜻하지 않아요.

BP 타임라인 창은 문서 경로와 노드 ID로 소유권을 확인하고 현재 그래프를 직접 편집해요. 키 수정 때 창을 닫거나 이전 그래프 값으로 덮어쓰지 않아요. Undo/Redo는 열린 창의 키 표시를 갱신하고, 노드 삭제는 창·리스너·ResizeObserver·키보드 검색 등록을 해제해요. 상속받은 타임라인의 원본 편집은 부모 블루프린트에서 해요.

## 키 사이 범위와 주파수 필터

도구 설정의 시작·끝을 모두 입력하면 기존 키 사이에서도 부분 베이크해요. 선택 범위보다 이 입력을 우선하고 모든 채널을 함께 처리해요. 시간/값 공간의 de Casteljau 분할로 외부 Bézier 핸들을 다시 계산하고, Auto/PCHIP의 이웃 기울기를 고정해 구간 밖 모양을 보존해요. [명시적 제어점](CURVE_EXPLICIT_CONTROLS.md)으로 수직 핸들과 1보다 큰 단조 시간 핸들도 그대로 보존해요. 시간 역행 조합은 전체 편집을 거절해요. 첫 키 밖·마지막 키 밖의 부분 베이크도 별도예요. 소유자 키/탄젠트 예산은 유지해요.

**주파수 필터**는 연속한 키 4개 이상에 적용해요. 선택이 없으면 곡선 전체·모든 채널, 선택이 있으면 키별로 선택한 채널을 처리해요. 저역 통과/고역 통과, 차단 Hz, 차수1~16, 강도0~1을 설정해요. 기본값은 저역 통과·5Hz·4차·강도1이며 Nyquist(표본률의 절반)를 넘는 설정은 거절해요. 불균일 키의 원본 보간 재표본화·대역 통과/제거·샘플 Hz 설정은 [비등간격 주파수 편집](CURVE_RESAMPLE_FILTER.md)을 봐요. 키 수·시간·선택 밖 값·다른 채널·기존 보간과 탄젠트는 유지해요.

HB 구현은 반사 확장한 2×기간을 radix-2 그리드로 선형 재표본하고, FFT 주파수 계수에 선택한 진폭 응답을 곱한 뒤 역변환/재표본하는 위상 이동 없는 편집 필터예요. 기본 Butterworth와 Chebyshev I 응답을 선택해요. 기존 1:2:1 값 부드럽게와 별도예요. 실시간 인과 필터·불규칙 표본 직접 처리는 지원 범위에 포함하지 않아요. 작업 배열은 편집 중에만 생성하며 FFT 배열은 16×nextPow2(2×(키수-1))바이트예요. 문서 복사·키 객체 메모리는 이 수치와 별도예요. 65,536키 CPU 측정은 약122ms였으며 재생 프레임 속도 측정이 아니에요.

사람의 도구와 sequence.curve.tool, skeletal.curve.edit는 operation=fft 및 cutoff/filterType/order/strength/response/rippleDB를 공유해요. 키 사이 베이크는 operation=bake,rangeOnly=true,start,end를 써요. revision·dryRun·Undo·저장과 실제 Sequence 재생 연결을 유지해요. 도구 설정은 창의 다음 렌더에서도 남아요.

Chebyshev I는 `response=chebyshev`, `rippleDB`는 0초과60이하(기본1)를 사용해요. 통과대역의 진폭 리플을 허용하며, 짝수 차수는 DC도 지정 리플만큼 감쇠해요. 차단점은 -rippleDB dB예요. 저역 응답은 `1/sqrt(1+epsilon²*T_order(f/cutoff)²)`, 고역은 주파수 비율을 역으로 바꾸며 DC를 0으로 처리해요. HB의 Hz 단위 아날로그 원형 진폭 응답을 명시적 FFT 격자에 적용해요. SciPy의 디지털 IIR 계수나 Unreal의 내부 수식을 복제한 것은 아니에요. 극단적인 차단 비율은 log-cosh로 계산해 NaN을 피하고, 기존 Butterworth 결과는 변경하지 않아요. 필터 경로의 결과용 전체 곡선 복사는 한 번만 수행해요.

지정 API의 응답 선택은 [Epic CurveEditorFFTFilter](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/CurveEditorFFTFilter), Type I의 리플·차단점 정의는 [SciPy cheby1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.cheby1.html)의 해당 설명을 대조했어요. 전체 API 분석 완료를 뜻하지 않아요.

추가 대조: [Epic Curve Editor의 Filter Tool/Bake/FFT](https://dev.epicgames.com/documentation/unreal-engine/animation-curve-editor-in-unreal-engine) 본문308–349줄을 지정 재독했어요. 선택 구간만 선형 표본으로 만들고 밖은 보존하는 흐름, FFT 저/고역·차수·차단 주파수를 대조했어요. HB의 임의 시간 분할·반사 확장·기본 주파수는 자체 결정이며 UE 내부 수식이나 Chebyshev까지 동일하게 구현했다고 주장하지 않아요.
