# 거리장 AO 정밀도와 메모리

PostProcessVolume의 차폐 적용을 메시 거리장·간접광으로 선택해요. 거리장 LOD는 기존 프로젝트와 같은 fixed가 기본이고, camera는 월드 경계 상자의 화면상 크기로 생성 해상도를 골라요.

| 속성 | 의미 |
|---|---|
| aoDistanceFieldLOD | fixed / camera |
| aoDistanceFieldScreenPixels | 복셀당 화면 픽셀, 1–64, 기본8. 작을수록 높은 정밀도를 요구해요. camera에서만 편집기에 보여요. |
| aoDistanceFieldResolution | 생성 해상도의 상한, 기존8–64 |
| aoDistanceFieldBudgetMB | 기존 atlas·로컬 볼륨·작업 입력 예산 정책을 유지해요. |

화면 크기는 렌더링 버퍼 픽셀을 사용해요. 원근·직교 카메라와 해상도 변경을 반영하고 화면 밖 오브젝트도 차폐물로 유지해요. 같은 기하를 쓰는 메시 중 가장 높은 요구를 선택하며 InstancedMesh는 캐시한 전체 인스턴스 경계를 보수적으로 사용해요. 카메라 정보가 없거나 경계가 카메라 평면을 가로지르면 상한을 유지해요. 이 방식은 화면 footprint 기반 휴리스틱이며 작은 특징의 오차를 픽셀 단위로 보장하는 설정은 아니에요.

가까워질 때는 목표를 바로 올리고, 낮은 목표는250ms 동안 유지돼야 내려요. 기존 거리장은 새 볼륨이 준비될 때까지 사용해요. 기존+교체 볼륨과 입력 자료를 함께 예산에 예약하며, 공간이 없으면 기존 자료를 버리지 않고 교체를 미뤄요. 목표가 바뀐 품질 작업은 취소하고 새로운 결과가 준비돼도 오래된 목표의 결과를 채택하지 않아요.

정지한 장면은 기하·인스턴스·포즈·투영을 대조해 경계 투영을 재사용해요. TAA의 화면 평행 이동은 크기를 바꾸지 않으므로 재투영하지 않아요. 이 CPU 캐시는 뷰포트별 WeakMap이며 인스턴스마다 레코드를 만들지 않아요. fixed 전환·소유자 해제 때 놓고, 인스턴스 수가0이면 해당 거리장 볼륨을 해제해요.

## C++·블루프린트·AI

기존 엔진 함수를 사용해요. DirectX 자원이나 셰이더 코드를 직접 작성할 필요가 없어요.

~~~cpp
hb::Components::SetString(post, "PostProcessVolume", "aoDistanceFieldLOD", "camera");
hb::Components::SetFloat(post, "PostProcessVolume", "aoDistanceFieldScreenPixels", 8);
~~~

같은 블루프린트 componentSetString/componentSetFloat와 컴포넌트 상세 패널에서 바꿔요. AI는 document.get의 revision으로 document.patch/CAS를 사용해요. schema의 meshDistanceFields.cameraLOD에는 투영·단계·안정화·예산·메모리 경계를 적었어요. 실행 진단 distanceFields.cameraLOD에서 목표 범위, projectionAvailable, projectedObjects, projectionCacheHits, 취소 수를 확인해요. qualityDowngrades와 기존 qualityUpgrades도 별도로 제공해요.

같은 종류의 GPU 텍스처와 기존 셰이더를 사용하며 별도 GPU 패스·읽기·상시 작업자·디스크 캐시는 만들지 않아요. 해상도 변경 때 기존 atlas 텍스처가 교체되거나 자료가 전송될 수 있어요. fieldBytes와 atlasBytes는 소유한 자료의 페이로드이며 전체 프로세스·GPU 드라이버 메모리는 아니에요. 전역 clipmap, 방향성 하늘·bent normal·시간 신뢰도, 변형체/지형 거리장과 전체 기기 성능은 별도 기능이에요.

패키징의 상한 거리장 재사용·캐시와 비용은 [거리장 쿠킹](DISTANCE_FIELD_COOKING.md)에 있어요. 다른 LOD가 없으면 기존 생성으로 돌아가요.
