# 텍스처 좌표와 실제 밉 전달

[Unreal4.27TextureSample](https://dev.epicgames.com/documentation/en-us/unreal-engine/texture-expressions?application_version=4.27)은UV와명시적미분입력및기본하드웨어계산의비용을설명해요. [UnityShaderGraph17SampleTexture2D](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Sample-Texture-2D-Node.html)는Standard/LOD/Gradient/Bias설정과UV이음새를설명해요. 버전과읽은범위/미독연결은supplemental510에기록해요. 최신UE본문요청실패를읽기완료로계산하지않아요.

픽셀의하드웨어미분과광선원뿔의유한변화량은같지않아요. 문서는밉입력관계의근거예요. 필요한텍스처조상에서고정입력footprint로이웃좌표를재평가하는설계는HB구현선택이며독립GPU/밉정답검사로대조했어요. 레지스터덮어쓰기전의생산자경로를따르고첫텍스처자체에밉이없어도바깥샘플이요구하면상류로전달해요.알파전용/일반표면에불필요한재평가는생성하지않아요.

기존설치496에서는네형식의폭차이가0이었고,현재GL/WGPU와최적화HLSL에서는폭차이1·이전프레임오차0이었어요. 기존4e-5를유지해요. 처음정답의0길이노멀은기존계약의+Z로고쳤고허용오차를늘리지않았어요. 실제제작검사는vec3→vec2잘못된검사연결을거부한뒤R/G조합으로바로잡았어요. 이어실제s1중복오류를발견하여완성노드표면의기본6맵읽기를분리했어요.507은이전부분확장경로의충돌을재현하고새C++편의함수/독립필터픽셀을검증해요. 508실제두텍스처C++게임과509전체기본2D/3D실행기도통과했어요.

변경텍스처의전역이력거부,유한차분의정밀한계와명시적Gradient/LOD/Bias·HDR/압축/커스텀밉/분산거칠기는후속원장에유지해요. 전체본문/API분석gate를올리지않아요.
