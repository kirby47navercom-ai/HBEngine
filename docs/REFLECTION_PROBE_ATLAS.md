# 큰 메시와 인스턴스의 반사 영역

ReflectionProbe를 평소처럼 배치해요. 큰 메시나 한 인스턴스 배치의 경계가 세 개 이상의 반사 영역에 걸치면 에디터와 실행기가 공용 HDR 아틀라스를 자동으로 사용해요. 각 픽셀은 실제 월드 좌표에서 자신을 포함하는 두 프로브를 고르므로 배치 전체가 같은 두 프로브로 제한되지 않아요. C++·블루프린트의 기존 ReflectionProbes/Components 함수와 저장된 컴포넌트 JSON을 그대로 사용해요.

```cpp
hb::ReflectionProbes::SetIntensity(probe, 0.5f);
hb::Scene::SetPosition(camera, {6, 0, 2});
```

후보는 중요도, 작은 affine 볼륨, ID 순서예요. 픽셀의 영향도가 양수인 첫 두 후보를 선택하고 기존 정규화·블렌드 거리·원래 환경의 잔여 비율을 적용해요. 밝기0도 영역을 점유해요. 높은 중요도가 낮은 중요도를 완전히 덮는 혼합 정책과 lightmap 혼합은 별도 작업이에요.

경계에 걸치는 후보가 두 개 이하면 기존 직접 샘플 경로를 사용하며 아틀라스를 만들지 않아요. 필요 없어지면 아틀라스와 후보 자료를 해제해요. 여러 해상도를 각각의 배치로 저장하므로 가장 큰 해상도에 모든 프로브를 맞추지 않아요. 별도의 오브젝트·프로브 개수 상한은 없고 장치의 텍스처 크기 한도를 검사해요. 한도를 넘으면 해상도 조정이 필요한 오류를 알려요. 후보를 조용히 버리지 않아요.

브라우저는 Three의 기존 CubeUV 맵을 GPU 안에서 복사하고 9개 RGBA float texel로 후보 한 개를 설명해요. DirectX는 각 큐브 면과 밉을 GPU에서 복사하고 컴퓨트 셰이더로 이웃 면·세 면 모서리의 패딩을 생성해요. 화면에서는 하드웨어 선형 필터와 밉 보간을 사용해요. SH 계수도 GPU에서 복사해요. 캡처·해상도가 바뀔 때만 맵 복사와 패딩을 갱신하며, 밝기·영향 영역 변경은 후보 자료만 갱신해요. 운영용 픽셀 읽기와 추가 조명 패스는 없어요.

원래 캡처 자원에 더해 아틀라스와 후보 자료의 메모리가 들어요. 브라우저의 atlas.bytes와 native의 probeAtlasBytes는 이 추가 페이로드를 나타내며 전체 드라이버 메모리 수치는 아니에요. 브라우저 copies는 CubeUV 맵 단위, native copies는 면·밉 복사 단위예요. native probeAtlasPaddingDispatches는 패딩 계산 횟수예요. 자원 소유자가 다시 만들어지면 브라우저 카운터도 다시 시작할 수 있어요.

AI는 schema.reflectionProbeBlending, renderer.probes.globalMeshes/atlas와 native의 probeAtlasCount/Bytes/Copies/Uploads/PaddingDispatches를 조회할 수 있어요. document.patch의 revision/CAS·트랜잭션·Undo 흐름은 유지해요. 구현은 다음 경로에서 찾아요.

```powershell
node tools/hb.mjs context lighting --symbol ReflectionProbeAtlas --limit 3
node tools/hb.mjs context rendering --symbol setGlobalProbes --limit 3
```

공간 BVH는 원래 순위를 보존하면서 겹치지 않는 영역을 건너뛰어요. 모든 영역이 겹치는 최악 비용은 선형이에요. 공간 타일·클러스터와의 비교 및 다수의 실제 HDR 캡처를 포함한 전체 게임 성능 검증은 별도예요. 임의 셰이더 변위·인스턴스별 모프 텍스처의 경계, 모든 광학 그래프·기기와의 동등성을 뜻하지 않아요. 실제 검증 범위와 설치본은 ENGINE_WORK 및 USER_INSTALL의 최신 영수증을 따라요.

같은 캡처 자원을 여러 영역에 바인딩하면 HDR 이미지는 한 번만 배치해요. DirectX의 SH 계수도 자원마다 한 번 저장해요. 영역별 순위·경계·밝기·페이드는 각각 유지해요. 이 최적화는 SDK에서 같은 캡처를 참조할 때 적용하며, 서로 다른 위치에서 독립적으로 만든 캡처를 임의로 합치지 않아요. 브라우저 atlas.mapCount와 native probeAtlasMapCount는 고유 캡처 수이고 count는 영역 수예요.

DirectX 메타데이터는 공간 구조가 같으면 바뀐 144바이트 레코드 구간만 전송해요. 인접 구간은 합치며 분리된 구간이 여덟 개를 넘으면 호출 비용을 줄이기 위해 첫 변경부터 마지막 변경까지 합쳐요. 이 기준은 영역 개수 제한이 아니에요. 공간 경계나 테이블 크기가 바뀌면 공간 자료를 함께 갱신해요. probeAtlasMetadataBytes·probeAtlasMetadataCalls는 실제 자료 전송의 누적 수치이고 probeAtlasCPUBytes는 아틀라스 소유 벡터의 보유 용량이에요. 전체 프로세스 메모리 수치로 해석하지 않아요.

브라우저도 바뀐 메타데이터 행만 전송해요. WebGL은 소유한 테이블의 GPU 텍스처를 직접 갱신하고, WebGPU와 강제 GL 폴백은 지연 업로드에 쌓인 행을 합쳐요. 아직 렌더하지 않은 여러 변경을 유지하며, 그 사이 경계가 바뀌면 전체 갱신을 우선해요. 최초 할당·새 GPU 자원은 전체 자료를 보내요. GL의 픽셀 풀기 상태를 복원하며 다른 텍스처 업로드의 소유권을 바꾸지 않아요. 이 어댑터는 고정된 Three r180의 자료 구조에 맞춰져 있어 라이브러리를 바꿀 때 재검증해야 해요.

atlas.tableTransfers의 fullUploads·partialUploads·writeCalls·queuedBytes로 테이블 전송을 조회해요. 이 카운터는 현재 테이블의 실제 업로드 요청 누적값이며, GPU 완료 시간이나 전체 버스 트래픽은 아니에요. 테이블 교체 시 초기화되고 WebGPU·폴백의 지연 갱신은 렌더 뒤에 반영돼요. 변경이 없으면 추가 전송이 없어요. 구현 소유자는 prototype/probe-table-upload.js예요.

DirectX에서 캡처 자원과 affine 경계가 같으면 설정만 바꾸는 경로를 사용해요. 바뀐 설정을 모두 검증한 다음 기존 레코드에 적용하므로 잘못된 설정이 섞여 있으면 유효한 변경도 일부만 적용되지 않아요. 이 경로는 배치 계산·공간 모양 배열·전체 메타데이터 패킷을 다시 만들지 않아요. probeAtlasMetadataFastUpdates와 probeAtlasLayoutBuilds로 이 구분을 조회할 수 있어요. 영역마다 16바이트 캡처 식별자·버전을 중복 보관하는 대신 4바이트 고유 캡처 인덱스를 저장하고, 식별자·버전은 고유 캡처 자료에서 읽어요. 정지 프레임에도 입력 바인딩을 확인하는 O(N) 비교는 남아 있어요.
