# 반사 캡처와 간접 라이트맵 혼합 — 작업 중

2026-10-22. [Epic UE5.8 Reflections Captures](https://dev.epicgames.com/documentation/unreal-engine/reflections-captures-in-unreal-engine?lang=en-US)의 반환 본문0–183을 읽고, 간접광47–63과 혼합67–88을 중심으로 대조했다. 연결된 모든 API를 분석했다는 뜻은 아니다. CORPUS_MANIFEST.supplemental1591에 부분 읽기로 등록한다.

거친 표면의 캡처 반사에서 라이트맵이 가진 국소 차폐 정보를 이용하고, 매끈한 표면에서는 다른 반사 방식과의 전환을 위해 영향이 줄어야 한다. 직접광이 든 라이트맵은 이 용도에 적합하지 않다. 문서의 거칠기 전환 기준과 최대 혼합 가중치 설정을 확인했다.

HB의 기존 라이트맵은 indirect 전용이다. 새 혼합은 호환성을 위해 MeshRenderer의 별도 선택으로 도입한다. 캡처별 기준 간접 조도와 베이크 조도의 휘도 비율을 반사 성분에만 적용하고, 밝기와 거칠기·코팅을 같은 입력으로 처리한다. 이 비율 공식은 HB 설계이며 Epic의 공개되지 않은 내부 알고리즘을 복제했다고 주장하지 않는다.

GL/TSL의 PMREM 기준은 radiance×PI, DirectX의 SH는 irradiance이므로 정규화 단위를 대조한다. diffuseIntensity는 조명 조절이므로 기준 조도에서 제외한다. 직접광·확산광·굴절·원래 하늘 환경은 이 혼합으로 변경하지 않는다. 런타임 GI가 기존 라이트맵 강도를0으로 내릴 때는 혼합도 비활성화한다.

계획: 공용 CPU/GLSL/TSL/HLSL 수식, 두 캡처/전역 아틀라스/네이티브 래스터 연결, 컴포넌트·저장·공용 조작/AI, 실제 픽셀/수명과 설치 검증. 현재는 작업 중이며 원장 완료나 설치 반영으로 계산하지 않는다.

구현 연결: [제작·수식·실행 경계](../PROBE_LIGHTMAP_MIX.md). GL/GPU/fallback6경로·D3D10경우와 실제 베이크/BP/C++/게임 실행을 확인했다. 앞의 계획 문구는 작업 시작 시점 기록이며 최종 설치는 후속 ENGINE_WORK/USER_INSTALL 영수증으로 확정한다.
