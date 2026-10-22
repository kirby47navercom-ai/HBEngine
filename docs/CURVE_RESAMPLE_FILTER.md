# 비등간격 곡선의 주파수 편집

일반 Curve, Sequence의 숫자 채널, 골격 클립 곡선, BP Timeline이 같은 필터를 사용해요. 우클릭의 주파수 필터와 도구 설정에서 저역·고역·대역 통과·대역 제거를 고르고, 대역 필터는 차단 Hz와 상한 Hz를 함께 정해요. 기존 키의 시간·개수·보간·핸들·선택 밖 값과 선택하지 않은 축을 유지해요. 별도 베이크를 먼저 만들 필요가 없어요.

비등간격 키는 원래 보간(선형, constant/step, cubic, Clamped Auto, 가중 Bézier)을 시간 기준으로 표본화하고 양끝을 반사한 작업 격자에서 FFT를 수행해요. 필터 결과를 원래 키 시간으로 선형 표본화하여 값만 바꿔요. 샘플 Hz를 비우면 `(선택 키 개수−1)/선택 시간 길이`를 사용해요. 직접 입력하면 `ceil(길이×샘플 Hz)` 구간을 사용하며 유효 Nyquist는 이 구간 수/길이의 절반이에요. 작업 FFT는 반사 격자 이상인 2의 거듭제곱 크기로 계산해요. 과소 표본화로 잃은 신호를 복구하는 기능은 아니에요.

샘플 Hz는 0 초과 1000 이하이고 작업 격자는 4~65,536개 표본이에요. 초과 요청은 값이나 문서를 바꾸기 전에 거절하고 몰래 해상도를 낮추지 않아요. 결과 키 수를 바꾸지 않으며 새 작업자·캐시·상주 GPU 리소스를 만들지 않아요. 자동 설정의 등간격 저역·고역은 기존 반사 선형 격자와 계산 결과를 그대로 유지해요. 등간격도 명시적인 샘플 Hz를 넣으면 원본 보간을 사용하는 새 경로를 선택해요.

대역 통과의 진폭은 지정 응답의 `highpass(차단) × lowpass(상한)`이에요. 대역 제거는 그 진폭의 `1−대역 통과`이며 인과적 IIR 노치와는 다른, 위상 지연이 없는 명시적 곡선 편집이에요. Butterworth와 Chebyshev I(리플 dB) 모두 지원해요. Chebyshev의 짝수 차수 DC 감쇠는 기존 저역 의미를 유지하고, 대역 제거의 DC는 1이에요.

AI는 `sequence.curve.tool` 또는 `skeletal.curve.edit`의 `operation:'fft'`, `filterType`, `cutoff`, `upperCutoff`, `sampleRate`, `response`, `rippleDB`, `order`, `strength`, `indices`, `channel`을 사용해요. 기존 revision·dryRun·Undo/Redo·저장을 공유하고, C++와 BP의 기존 Sequence/Timeline 재생은 저장된 동일 키를 읽어요. 새 런타임 전용 필터나 C++에서 별도 구현해야 하는 곡선 포맷을 만들지 않아요.

[Epic Curve Editor의 Filter Tool과 FFT 설명](https://dev.epicgames.com/documentation/en-us/unreal-engine/curve-editor?application_version=4.27)의 키를 지우지 않는 노이즈 편집·저/고역·응답 선택을 지정 대조했어요. [Epic FFT Filter API](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/CurveEditorFFTFilter)는 정규화 cutoff를 설명해요. HB의 Hz 단위, 비등간격 재표본화와 두 대역 조합은 이 엔진의 명시적 계약이며 Unreal 내부 구현과 같다고 주장하지 않아요. 다중 곡선 동시 편집, 불균일 표본의 NUFFT 자체, 인과적 실시간 오디오 필터는 이 기능의 범위가 아니에요.
