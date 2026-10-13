# CPU 포장 재사용·WebGPU 부분 전송·HDRI 필터

광선용 기하 GI와 경로 추적 atlas에서 머테리얼 프로그램과 텍스처 블록을 재사용해요. 이동 시 기존 CPU 배열에 기하·속성 부분만 갱신하고, 같은 크기의 GPU 자원도 유지해요. 머테리얼 값만 바뀌면 해당 레코드를 다시 쓰며, 텍스처 버전·프로그램 구성·기하 크기가 바뀌면 전체 포장으로 전환해요. 유한값과 주소를 먼저 확인해서 잘못된 갱신으로 기존 atlas를 훼손하지 않아요.

128×128 텍스처가 있는 검사 장면의 이동 20회에서 전체 atlas는 98,304개 float이고, 매번 다시 처리한 포장 부분은 124개 float였어요. 결과는 매번 전체 새 포장과 정확히 대조해요. 삼각형 수집과 BVH 구축 자체는 계속 수행하므로 이 수치가 게임 FPS 개선율은 아니에요.

WebGPU에는 설치된 Three r180의 내부 텍스처 갱신 지점에 작은 어댑터를 연결해요. 첫 전송과 새 자원은 전체를 올리고, 이후에는 변경된 RGBA float 행을 병합해서 `GPUQueue.writeTexture`로 보내요. 모든 구간의 크기·정렬·유한값을 전송 전에 확인해요. 일반 텍스처는 기존 업로드 경로를 써요. Three 버전을 올릴 때 이 내부 연결을 다시 검증해야 해요. [writeTexture API](https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/writeTexture)의 origin·행 pitch·크기·COPY_DST 조건과 설치 소스를 대조했어요.

HDRI에도 광선의 각도 폭에 따른 밉/LOD 필터를 적용해요. 기본 방사휘도와 중요도 샘플링 PDF·alias 표는 보존하고, 필터된 RGB만 조회해요. `PostProcessVolume.pathTracingHDRILOD`로 끌 수 있으며 기존 C++·블루프린트·AI 컴포넌트 bool 변경 API를 써요. 후처리 볼륨 합성 목록에도 연결해서 실제 C++ 변경이 렌더러에 전달돼요. 끄면 이전 HDRI 포장 형식으로 돌아가요.

```cpp
hb::Components::SetBool(volumeActor, "PostProcessVolume", "pathTracingHDRILOD", true);
```

HDRI 밉은 선형 RGB의 UV 면적 필터예요. 완전한 극점·경계 연속성, 구면 면적 필터나 비등방 필터를 구현했다고 주장하지 않아요. 밉을 켜면 HDRI 포장과 GPU 저장 공간이 추가돼요. 필요 없는 일반 2D 장면에는 광선/HDRI 자원을 만들지 않고 자동 GPU 읽기도 추가하지 않아요.

검사는 CPU 포장/캐시/범위/NPOT, native HLSL, 실제 DirectX 실행기, WebGL과 WebGPU의 기존 098–107·109 및 새 HDRI 장면을 묶어서 진행해요. 이전 디노이저 검사는 이전 HDRI 모드를 명시해 기준을 유지하며, 새 HDRI 필터는 별도 장면에서 실제 C++ 전환과 분산 감소를 확인해요. 묶음 검사에는 기존 smoke soak 설정을 사용하고 개별 핀·픽셀·이벤트 제한은 유지해요.

[용량 정리](STORAGE_111.md)도 함께 적용해요. [증거 기록](research/RENDERING_111.json)과 [설치 영수증](research/USER_INSTALL_111.json)은 검증 후 저장해요. 전체 게임의 120/60FPS, 휴대폰 결과, 남은 고급 광선 셰이딩·코스틱·추가 디노이저나 모든 엔진 기능의 완성을 뜻하지 않아요.
