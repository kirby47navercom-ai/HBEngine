# 2D·3D 항법 제작

콘텐츠 브라우저에서 **내비게이션 메시**를 만든다. 2D 평면 메시에는 `XY`, 3D 바닥에는 `XZ`를 선택하고 원본 메시·지형에서 굽는다. 구버전의 평면이 없는 에셋은 XZ로 읽는다. UV·하드 노멀 때문에 정점이 갈라져 있어도 정확히 같은 위치의 경계는 항법 베이크에서 연결하며 렌더 원본을 바꾸지 않는다.

레벨 오브젝트에 **Navigation Mesh** 컴포넌트로 에셋을 지정한다. 캐릭터의 **Navigation Agent**에서 영역 ID에 그 오브젝트를 지정하고 크기·속도·영역 마스크/비용·회피 방식을 설정한다. XY 회피는 XY 공간을 사용하며 XZ와 섞이지 않는다. 움직이는 부모나 임의 방향의 표면에 메시를 붙이는 고급 좌표계 지원은 별도 작업이다.

뷰포트의 **표시 → 항법** 또는 재지정 가능한 **P** 키로 영역색·삼각 경계·활성 링크를 본다. NavMesh 컴포넌트의 **항법 표시**로 개별 오브젝트도 제외할 수 있다. 표시를 요청할 때만 버퍼를 만들고 모든 뷰포트에서 끄면 해제한다. 뷰포트별 설정은 독립적이며 게임 보기에서는 표시하지 않는다. NavMesh 에셋 편집과 여러 파일 Undo도 표시를 갱신한다.

`P`로 항법을 표시하는 조작은 [Unreal Basic Navigation](https://dev.epicgames.com/documentation/unreal-engine/basic-navigation-in-unreal-engine?lang=en-US)을 참고했다. 영역 비용·마스크는 [Unity AI Navigation Areas and Costs](https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/AreasAndCosts.html)에서 제작·질의의 역할을 대조했다. HB의 구현·제한·실행 근거는 ENGINE_WORK_229~231을 따른다.

## C++·블루프린트·AI

C++와 블루프린트는 같은 고수준 실행 서비스를 사용한다.

```cpp
hb::Navigation::MoveTo(actor, {x, y, z});
hb::Navigation::ConfigureAvoidance(actor, "orca");
auto path = hb::Navigation::GetPath(actor);
auto status = hb::Navigation::GetStatus(actor);
hb::EnvironmentQuery::Run(actor, "Assets/EQS_Targets.hbeqs.json");
```

블루프린트에서는 같은 함수의 한글/영문 노드를 사용한다. EQS 생성 평면과 NavMesh 평면을 맞추면 후보가 해당 메시 위에 투영된다. 실행 중 EQS 에셋을 새로 열어 **질의 실행·시각화**로 검사할 수 있다.

AI는 최신 문서 revision과 `navigation.bake`의 `source`, `plane`, `dryRun`으로 제작하고, `runtime.eqs.run/read`, `runtime.navigation`, `viewport.navigation`으로 결과를 조회한다. `viewport.navigation`의 `offset/limit`은 표시의 로드 상태·평면·영역·삼각형/링크 수·버퍼 바이트만 페이지로 반환하며 원본 정점 배열을 싣지 않는다. `viewport.action`의 `navigation`은 해당 뷰포트 표시를 전환한다.
