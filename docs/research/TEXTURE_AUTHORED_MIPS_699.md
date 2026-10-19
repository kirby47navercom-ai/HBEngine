# 배열·볼륨의 사용자 지정 밉

배열·볼륨 텍스처 에셋에서 `이미지`는 기존처럼 레벨0이에요. `사용자 지정 밉`에서 하위 레벨을 추가하고 각 슬라이스의 이미지를 고를 수 있어요. 이미지 파일을 덮어쓰지 않아요. 밉·슬라이스 미리보기는 문서를 변경하지 않으며 채널·픽셀 조회·확대 조작을 유지해요. 배열 슬라이스를 옮기면 같은 레이어의 모든 밉도 옮겨요. 밉 삭제는 그 이하를 함께 지우며 일반 Undo로 복원해요.

```json
{
  "version": 1,
  "name": "TA_Surface",
  "dimension": "texturearray",
  "images": ["Assets/Layer0_4x4.png", "Assets/Layer1_4x4.png"],
  "mips": [
    {"images": ["Assets/Layer0_2x2.png", "Assets/Layer1_2x2.png"]},
    {"images": ["Assets/Layer0_1x1.png", "Assets/Layer1_1x1.png"]}
  ]
}
```

가로·세로는 매번 절반을 내림해 최소1까지 줄어요. 배열의 레이어 수는 일정하고 볼륨은 깊이도 같은 방식으로 줄어요. 예를 들어5×3×3 볼륨은2×1×1, 1×1×1로 이어져요. 사용자 지정 체인은 마지막1 크기까지 지정해야 해요. 제작 중 빈 입력은 유지할 수 있지만 실행·가져오기에서는 빈 원본·다른 크기·잘못된 슬라이스·불완전 체인을 거부해요. `mips`가 없는 기존 에셋은 기존 자동 생성 경로를 사용해요.

머테리얼의 배열·볼륨 샘플에 연결한 뒤 기존 LOD·Bias·Gradient 선택을 사용해요. 스칼라 파라미터를 LOD에 연결하면 게임 코드도 일반 함수로 선택할 수 있어요.

```cpp
hb::Materials::SetFloat(actor, "Mip", 1.f);
hb::Materials::SetTexture(actor, "Paint", "Assets/TA_Surface.hbtexturearray.json");
```

블루프린트는 같은 머테리얼 파라미터 노드를 사용해요. AI는 `/api/schema`의 `textureAuthoredMips`, `document.patch/save`, `texture.view`를 사용해요. `texture.view`의 `mip`과 `index`는 선택한 레벨의 슬라이스 범위에 맞춰요. 사람의 밉 선택 메뉴는 깊이가 줄어들 때 슬라이스 선택을 자동으로 맞춰줘요. 참조 수집·이름 변경·패키징은 하위 밉 이미지도 포함해요. 이름 변경은 기존 redirect 정책을 사용하므로 에셋 본문의 원래 경로를 보존하고 새 파일로 해석해요. 699의 실제 한글 경로 이름 변경·복원에서 이 동작과 이미지 바이트를 확인했어요.

GL·WebGPU·DirectX, 패킹된 광선 텍스처와 CPU 베이크가 같은 작성 레벨을 사용해요. 고정된 Three 소스에서 배열/3D 업로드가 기본 레벨만 처리하는 것을 확인하고, 생성/버전 갱신 시에만 하위 레벨을 업로드하도록 연결했어요. 자동 볼륨 compute 생성과 사용자 지정 레벨을 섞지 않아요. 같은 텍스처 버전의 광선 밉은 재사용하고 버전 변경 시 변환 캐시를 교체해요. 프레임마다 업로드하거나 이전 버전별 캐시를 쌓지 않아요.

693 CPU 검사는 홀수 크기·레이어/깊이·원본 바이트·버전 무효화·광선/베이크·참조·슬라이스 편집을 확인했어요. 694 Cfp4NO는 실제 공용 그래프 로더와 GL/TSL 머테리얼28표본, 밉·슬라이스 메뉴와 Undo/저장을 확인했어요. 695 wbYaT0는 실제 D3D의14표본·216B/192B 저장량·잘못된 체인10개 거부를 확인했어요. 696 Qe0jxQ는46개 에셋을 포함한 실제 게임에서 C++ LOD0/1/2, 타입을 유지한 텍스처 교체, 키보드 블루프린트 복원과 유휴 업로드 재사용을 확인했어요. 추가697 OJJwrD/U8y6js는 작성한 RGBA8 배열·볼륨 체인의 이전/현재 기하·반전·시각을 실제 GL/TSL/HLSL에 전달해 각각의 독립 노멀 정답을 기존4e-5로 비교했어요. 이전 기하 재현 오차와 GL/GPU 차이는0이에요.

초기695는 기존 파티클 guard의 `-Werror` 경고 때문에 컴파일하지 못해 중괄호를 보강했어요. 이어진 색 비교 실패는 DirectX 최종 sRGB 출력에 선형 바이트 정답을 적용한 검사 오류였어요. 원래3byte 기준을 유지하고 최종 출력의 독립 인코딩 정답으로 수정했어요. 696의 누락된 검사 머테리얼 메타데이터와 바닥 기준 큐브 위치도 검사 fixture에서 고쳤어요. 699 첫 검사는 redirect 대신 본문 변경을 기대한 검사 오류였고 기존 정책에 맞춰 수정했어요. 이 실패들을 구현 통과로 세지 않아요.

근거는 Unity6.0의 [Texture3D.SetPixelData](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Texture3D.SetPixelData.html), [Texture2DArray.SetPixelData](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Texture2DArray.SetPixelData.html)의 반환된 선언·매개변수·설명·예제 전체예요. 레벨과 포맷에 맞는 자료 및 명시적 업로드를 구분하고 예제는 자동 밉 갱신을 끄고 있어요. 두 본문만 새로 읽었으며 링크된 API나 전체 Unity/UE 문서의 분석 완료를 뜻하지 않아요. W3C writeTexture 페이지는 가져오지 못해 이번 읽기 근거에서 제외했어요.

압축 컨테이너·플랫폼별 쿠킹, 사용자 지정 큐브 밉과 배열/볼륨 스트리밍, 나머지 MAT/RND 항목은 다음 구현으로 이어가요. 위 저장량은 작은 검사 텍스처의 정확한 GPU 자료량이며 실기기 성능이나 FPS 근거가 아니에요.
